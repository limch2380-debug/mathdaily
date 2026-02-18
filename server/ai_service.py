import os
import json
from enum import Enum
from typing import Optional, Dict, Any
from openai import OpenAI
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, String, Integer, DateTime, Boolean, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

# 환경 변수 로드 (.env 파일 필요)
load_dotenv()

# ==========================================
# 1. DB 설정 (SQLAlchemy)
# ==========================================

DATABASE_URL = os.getenv("DATABASE_URL")
# 예: postgresql://user:password@localhost:5432/mathdaily

Base = declarative_base()

class WeaknessLog(Base):
    __tablename__ = 'WeaknessLog'

    id = Column(String, primary_key=True)  # CUID or UUID
    userId = Column(String, nullable=False)
    responseId = Column(String, unique=True, nullable=False)
    errorType = Column(String, nullable=False)  # 계산 실수, 개념 오적용 등
    topic = Column(String, nullable=False)
    subtopic = Column(String)
    severity = Column(Integer, default=1)
    description = Column(String)  # AI 조언 (한 문장 요약)
    isResolved = Column(Boolean, default=False)
    repeatCount = Column(Integer, default=1)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# DB 세션 생성기
engine = create_engine(DATABASE_URL) if DATABASE_URL else None
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine) if engine else None


# ==========================================
# 2. OpenAI Service 클래스
# ==========================================

class ModelType(Enum):
    FAST = "gpt-4o-mini"      # 기본, 빠르고 저렴함
    SMART = "gpt-4o"          # 더 똑똑함
    REASONING = "o1-preview"  # 복잡한 수학 추론

class OpenAIService:
    def __init__(self, api_key: Optional[str] = None):
        if not api_key:
            api_key = os.getenv("OPENAI_API_KEY")
        self.client = OpenAI(api_key=api_key)

    def analyze_wrong_answer(
        self, 
        question: str, 
        correct_answer: str, 
        user_answer: str, 
        topic: str,
        model: ModelType = ModelType.FAST
    ) -> Dict[str, Any]:
        """
        학생의 오답을 분석하여 원인을 분류하고 조언을 생성합니다.
        """
        
        # 시스템 프롬프트 (Role & Persona)
        system_prompt = """
당신은 대한민국 최고의 수학 교육 전문가입니다. 학생의 오답을 분석하여 정확한 원인을 진단하고 피드백을 주어야 합니다.

[분석 가이드라인]
1. 먼저 문제를 직접 풀어보고 정답을 검증하세요. (Python Code Interpreter를 흉내내어 검증 과정을 생각하세요)
2. 학생의 답안과 정답을 비교하여 오류 유형을 다음 중 하나로 분류하세요:
   - [계산 실수]: 접근 방법은 맞았으나 연산 과정에서 오류
   - [개념 오적용]: 공식이나 정의를 잘못 알고 적용함
   - [문제 해석 오류]: 문제의 조건이나 단위를 놓침
   - [찍음]: 논리적 연관성이 전혀 없는 엉뚱한 답
3. 학생에게 줄 1~2문장의 명확한 조언(피드백)을 작성하세요.
4. 응답은 반드시 JSON 형식이어야 합니다.

[JSON 출력 형식]
{
  "error_type": "오류 유형 (위 4개 중 1택)",
  "reasoning": "오답 분석 내용 (검증 과정 포함)",
  "feedback": "학생에게 줄 조언 (한국어, 존댓말, 따뜻하지만 명확하게)",
  "severity": 1~5 (심각도 점수)
}
"""

        # 사용자 메시지
        user_message = f"""
[문제 정보]
- 단원: {topic}
- 문제: {question}
- 정답: {correct_answer}

[학생 답안]
- 제출 답안: {user_answer}

위 학생의 오답 원인을 분석해주세요.
"""

        try:
            # 복잡한 추론 모델(o1)은 system 메시지를 지원하지 않거나 방식이 다를 수 있음
            # 여기서는 편의상 gpt-4o 기준으로 작성 (o1 사용 시 developer 메시지 등으로 조정 필요)
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ]

            # o1 모델의 경우 max_tokens가 아니라 max_completion_tokens 등을 사용해야 함
            # 여기서는 gpt-4o를 기본으로 가정
            
            response = self.client.chat.completions.create(
                model=model.value,
                messages=messages,
                temperature=0.2, # 분석은 엄밀하게
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content
            return json.loads(content)

        except Exception as e:
            print(f"OpenAI API Error: {e}")
            # 에러 발생 시 기본값 반환
            return {
                "error_type": "기타",
                "reasoning": f"분석 중 오류 발생: {str(e)}",
                "feedback": "다시 한 번 풀어보세요.",
                "severity": 1
            }

    # ==========================================
    # 3. DB 저장 로직
    # ==========================================
    
    def save_analysis_to_db(self, user_id: str, response_id: str, analysis_result: Dict[str, Any], topic: str):
        """
        분석 결과를 WeaknessLog 테이블에 저장
        """
        if not SessionLocal:
            print("DB connection not configured.")
            return

        session = SessionLocal()
        try:
            # ID 생성 로직 필요 (여기선 임시로 response_id + _log)
            # 실제로는 CUID 라이브러리 등을 사용 권장
            import uuid
            new_id = str(uuid.uuid4())

            weakness_log = WeaknessLog(
                id=new_id,
                userId=user_id,
                responseId=response_id,
                errorType=analysis_result.get("error_type", "기타"),
                topic=topic,
                severity=analysis_result.get("severity", 1),
                description=analysis_result.get("feedback", ""),
                isResolved=False,
                repeatCount=1
            )
            
            session.add(weakness_log)
            session.commit()
            print(f"WeaknessLog saved: {new_id}")
            
        except Exception as e:
            session.rollback()
            print(f"DB Error: {e}")
        finally:
            session.close()

# 사용 예시
if __name__ == "__main__":
    # 테스트
    service = OpenAIService()
    
    # 임의의 오답 상황
    test_result = service.analyze_wrong_answer(
        question="반지름이 3cm인 원의 넓이는? (원주율: 3.14)",
        correct_answer="28.26",
        user_answer="18.84", # 2 * 3.14 * 3 (원주를 구함 -> 개념 오적용)
        topic="원의 넓이"
    )
    
    print("=== 분석 결과 ===")
    print(json.dumps(test_result, indent=2, ensure_ascii=False))
