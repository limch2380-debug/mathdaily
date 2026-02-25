from fastapi import FastAPI, HTTPException, Depends, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import sys
import json
import asyncio

# 현재 디렉토리 루트 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server.models import Base, User, Question, UserKnowledge, WeaknessLog, Chapter, Unit

# ai_engine 함수들 로드
from server.ai_engine import (
    plan_daily_worksheet, 
    generate_problems_with_gpt, 
    adjust_difficulty_level, 
    analyze_error,
    rewrite_problem,
    TUTOR_SYSTEM_PROMPT,
    get_openai_client 
)
from server.curriculum_data import seed_curriculum

import openai 
from openai import RateLimitError, AuthenticationError

# 환경 변수 및 DB 설정
from dotenv import load_dotenv
load_dotenv()

# 절대 경로 사용 (DB 파일 위치 고정)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL or DATABASE_URL.startswith("#"):
    db_path = os.path.join(BASE_DIR, "mathdaily.db")
    DATABASE_URL = f"sqlite:///{db_path}"
    print(f"📂 Using Database: {DATABASE_URL}")

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

with SessionLocal() as db:
    seed_curriculum(db)

app = FastAPI()

# CORS 미들웨어 설정 (필수!)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 모든 도메인 허용 (개발용)
    allow_credentials=True,
    allow_methods=["*"],  # 모든 메서드 허용 (GET, POST, OPTIONS 등)
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ── 요청/응답 스키마 ──
class GenerateRequest(BaseModel):
    userId: str
    count: int = 10
    unitId: Optional[int] = None
    schoolLevel: Optional[str] = None
    grade: Optional[int] = None

class ProblemResponse(BaseModel):
    topic: str
    difficulty: int
    type: str 
    question: str
    options: List[str]
    answer: str
    explanation: str

class SubmitRequest(BaseModel):
    userId: str
    accuracy: float 

class AnalyzeRequest(BaseModel):
    userId: str
    problemId: str
    userAnswer: str
    correctAnswer: str
    questionText: str

class RewriteRequest(BaseModel):
    questionText: str

class ChatMessage(BaseModel):
    role: str 
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    problemContext: Optional[str] = None 

# ── 커리큘럼 응답 스키마 ──
class UnitDto(BaseModel):
    id: int
    name: str

class ChapterDto(BaseModel):
    id: int
    name: str
    units: List[UnitDto]

# ── API 엔드포인트 ──

@app.get("/api/curriculum/{school_level}/{grade}", response_model=List[ChapterDto])
def get_curriculum(school_level: str, grade: int, db: Session = Depends(get_db)):
    print(f"📡 API Request: GET /api/curriculum/{school_level}/{grade}")
    
    chapters = db.query(Chapter).options(joinedload(Chapter.units)).filter(
        Chapter.school_level == school_level,
        Chapter.grade == grade
    ).all()
    
    print(f"✅ Found {len(chapters)} chapters for {school_level} grade {grade}")
    
    result = []
    for c in chapters:
        units_dto = [UnitDto(id=u.id, name=u.name) for u in c.units]
        result.append(ChapterDto(id=c.id, name=c.name, units=units_dto))
    
    return result

@app.post("/api/daily-worksheet/generate", response_model=List[ProblemResponse])
async def generate_worksheet(req: GenerateRequest, db: Session = Depends(get_db)):
    try:
        # 1. 학교급/학년 결정 우선순위
        #    1순위: API 직접 요청 값 (req.schoolLevel, req.grade)
        #    2순위: 단원 선택 정보 (unit.chapter)
        #    3순위: 사용자 DB 설정 값 (user.school_level)
        #    4순위: 기본값 (elementary, 3)

        school_level = req.schoolLevel
        grade = req.grade
        
        print(f"📡 Generation Start: userId={req.userId}, schoolLevel={school_level}, grade={grade}, unitId={req.unitId}")

        # 1. 계획 수립
        if req.unitId:
            unit = db.query(Unit).options(joinedload(Unit.chapter)).filter(Unit.id == req.unitId).first()
            if not unit:
                raise HTTPException(status_code=404, detail="Unit not found")
            
            # 요청에 값이 없으면 단원 정보에서 추출
            if not school_level and unit.chapter:
                school_level = unit.chapter.school_level
            if not grade and unit.chapter:
                grade = unit.chapter.grade

            # 도형 관련 단원이면 시각 자료 요청 힌트 추가
            visual_keywords = ["도형", "삼각형", "사각형", "원", "각", "기하", "선분", "직선", "함수", "그래프"]
            require_visual = any(k in unit.name for k in visual_keywords)
            
            plan = [{
                "topic": unit.name, 
                "difficulty": 2, 
                "type": "drill",
                "require_visual": require_visual
            } for _ in range(req.count)]
        else:
            # 요청에 값이 없으면 사용자 DB 정보 확인
            if not school_level or not grade:
                user = db.query(User).filter(User.id == req.userId).first()
                if user:
                    if not school_level: school_level = user.school_level
                    if not grade: grade = user.grade
            
            # 그것도 없으면 기본값
            if not school_level: school_level = "elementary"
            if not grade: grade = 3

            plan = await plan_daily_worksheet(req.userId, db, req.count, school_level=school_level, grade=grade)
        
        print(f"📍 Final target level: {school_level} {grade}")
        
        # 2. GPT 문제 생성 (학교급, 학년 전달)
        problems_data = await generate_problems_with_gpt(plan, school_level=school_level, grade=grade)
        
        if not problems_data:
            print("🚨 GPT generated empty data or failed.")
            raise HTTPException(status_code=500, detail="GPT Generation Failed (Empty Response)")
        
        saved_problems = []
        for p in problems_data:
            difficulty_val = 2
            try:
                difficulty_val = int(p['difficulty'])
            except:
                pass

            new_q = Question(
                id=f"q-{os.urandom(4).hex()}",
                # topic 컬럼 삭제됨 -> content JSON에 포함되어 있음
                unit_id=req.unitId if req.unitId else None, # 선택된 단원이 있으면 연결
                difficulty=difficulty_val,
                type=p['type'],
                content=p 
            )
            db.add(new_q)
            saved_problems.append(ProblemResponse(
                topic=p['topic'],
                difficulty=difficulty_val,
                type=p['type'],
                question=p['question'],
                options=p['options'],
                answer=str(p['answer']),
                explanation=p.get('explanation', '')
            ))
            
        db.commit()
        return saved_problems

    except RateLimitError as e:
        print(f"🚨 429 Error: {e}")
        raise HTTPException(status_code=429, detail="OpenAI API Quota Exceeded")
    except AuthenticationError as e:
        print(f"🚨 401 Error: {e}")
        raise HTTPException(status_code=401, detail="OpenAI API Key Invalid")
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/daily-worksheet/submit")
async def submit_worksheet(req: SubmitRequest, db: Session = Depends(get_db)):
    result = await adjust_difficulty_level(req.userId, req.accuracy, db)
    return result

@app.post("/api/analyze-error")
async def analyze_wrong_answer_endpoint(req: AnalyzeRequest, db: Session = Depends(get_db)):
    try:
        result = await analyze_error(
            req.userId, 
            req.problemId, 
            req.userAnswer, 
            req.correctAnswer, 
            req.questionText, 
            db
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/rewrite-problem")
async def rewrite_problem_endpoint(req: RewriteRequest):
    try:
        new_text = await rewrite_problem(req.questionText)
        return {"original": req.questionText, "rewritten": new_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    async def stream_generator():
        try:
            messages = [{"role": "system", "content": TUTOR_SYSTEM_PROMPT}]
            if req.problemContext:
                messages.append({
                    "role": "system", 
                    "content": f"[현재 문제 정보]\n{req.problemContext}\n이 문제에 대해 학생이 질문하고 있습니다."
                })
            for msg in req.messages:
                messages.append({"role": msg.role, "content": msg.content})

            client = get_openai_client()
            
            stream = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                stream=True,
                temperature=0.3
            )
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

        except Exception as e:
            yield f"[Error: {str(e)}]"

    return StreamingResponse(stream_generator(), media_type="text/plain")

@app.get("/api/check-ai")
async def check_ai_status():
    """
    OpenAI 연결 상태를 확인하는 진단용 엔드포인트
    """
    try:
        client = get_openai_client()
        # 간단한 테스트 요청
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": "1+1 is?"}],
            max_tokens=10
        )
        answer = response.choices[0].message.content
        return {
            "status": "OK",
            "message": "OpenAI Connection Successful!",
            "ai_response": answer,
            "api_key_preview": client.api_key[:10] + "..." if client.api_key else "None"
        }
    except Exception as e:
        return {
            "status": "ERROR",
            "message": str(e),
            "detail": "백엔드에서 OpenAI 연결에 실패했습니다."
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
