import os
import json
import asyncio
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from .models import UserKnowledge, Question, WeaknessLog, User, Chapter, Unit
from openai import AsyncOpenAI
import openai # 에러 클래스 사용을 위해

# 환경 변수 로드
from dotenv import load_dotenv
load_dotenv()

# 전역 client 제거 후, 함수 내에서 동적 로드 (핫 리로드 지원)
def get_openai_client():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY 환경 변수가 설정되지 않았습니다. .env 파일을 확인하세요.")
    return AsyncOpenAI(api_key=api_key)

async def plan_daily_worksheet(user_id: str, db: Session, total_questions: int = 10, school_level: str = None, grade: int = None) -> List[Dict[str, Any]]:
    # 1. 사용자 정보 및 레벨 확정
    if not school_level or not grade:
        user = db.query(User).filter(User.id == user_id).first()
        school_level = school_level or (user.school_level if user else "elementary")
        grade = grade or (user.grade if user else 3)
    
    print(f"📋 Planning worksheet for: {school_level} Grade {grade}")

    # 2. 해당 학년의 단원 목록 가져오기
    target_units = db.query(Unit).join(Chapter).filter(
        Chapter.school_level == school_level,
        Chapter.grade == grade
    ).all()

    # 단원이 없으면 기본값 (데모용)
    if not target_units:
        topics = ["수와 연산", "도형", "측정", "변화와 관계", "데이터와 가능성"]
    else:
        import random
        selected_units = random.sample(target_units, min(3, len(target_units)))
        topics = [u.name for u in selected_units]
    
    plan = []
    
    # 순서대로 주제 배분
    # 2. 복습(Review): 20%
    for _ in range(max(1, int(total_questions * 0.2))):
        plan.append({"topic": topics[0], "difficulty": 1, "type": "review"})
        
    # 3. 현행(Current): 60%
    for _ in range(max(1, int(total_questions * 0.6))):
         topic = topics[1] if len(topics) > 1 else topics[0]
         plan.append({"topic": topic, "difficulty": 2, "type": "current"})
         
    # 4. 도전(Challenge): 20%
    while len(plan) < total_questions:
        topic = topics[2] if len(topics) > 2 else topics[-1]
        plan.append({"topic": topic, "difficulty": 3, "type": "challenge"})
        
    return plan

async def generate_problems_with_gpt(plan: List[Dict[str, Any]], school_level: str = "elementary", grade: int = 3) -> List[Dict[str, Any]]:
    # 학년 설명 동적 생성
    if school_level == "elementary":
        user_grade_level = f"초등학교 {grade}학년"
        level_desc = "기초 연산, 도형의 기초, 분수/소수"
    elif school_level == "middle":
        user_grade_level = f"중학교 {grade}학년"
        level_desc = "방정식, 함수, 기하, 확률"
    elif school_level == "high":
        # 고등학교 학년별 상세 교육과정 반영
        if grade == 1:
            user_grade_level = "고등학교 1학년 (공통수학1, 2)"
            level_desc = "다항식, 방정식과 부등식, 도형의 방정식, 집합과 명제, 함수, 경우의 수"
        elif grade == 2:
            user_grade_level = "고등학교 2학년 (수학I, 수학II)"
            level_desc = "지수함수와 로그함수, 삼각함수, 수열, 함수의 극한과 연속, 미분, 적분"
        elif grade == 3:
            user_grade_level = "고등학교 3학년 (미적분/확통/기하)"
            level_desc = "수능 연계 심화 문제, 미적분, 확률과 통계, 공간도형"
        else:
            user_grade_level = f"고등학교 {grade}학년"
            level_desc = "고등 심화 수학"
    else:
        user_grade_level = "학년 미상"
        level_desc = "일반 상식 수학"

    system_prompt = f"""
당신은 대한민국 '최상위권 수학' 전문 출제 위원입니다.
현재 대상 학년은 **[{user_grade_level}]** 입니다.
주요 토픽 예시: {level_desc}

단순 연산이나 너무 쉬운 문제는 **절대 출제하지 마세요.**
학생이 문제를 읽고 **논리적으로 추론(Reasoning)하고, 조건을 분석해야만** 풀 수 있는 고품질 문제를 만들어야 합니다.

[대상 학년: {user_grade_level}]
- 해당 학년의 교과 과정을 철저히 준수하세요.
- 고등학생에게 초등 수준의 덧셈/뺄셈 문제를 내면 **해고**됩니다.
- 유치한 문제는 🚫절대 금지🚫입니다.

[출제 지침]
1. **복합 사고력(Multi-step Reasoning)**: 한 번의 계산으로 끝나는 문제가 아니라, 2단계 이상의 사고가 필요한 문제를 내세요.
2. **실생활 응용 & 문해력**: 텍스트를 읽고 식을 세우는 능력을 평가하세요.
3. **오답 유도(Distractors)**: 보기는 단순한 숫자의 나열이 아니라, 학생이 흔히 범하는 실수(계산 실수, 조건 누락)를 반영한 매력적인 오답으로 구성하세요.
4. **상세한 해설(Step-by-Step Explanation)**: 해설(`explanation`)은 단순히 정답을 알려주는 것이 아니라, 어떤 개념을 사용해야 하는지부터 시작하여 정답을 도출하는 논리적 단계를 1, 2, 3단계로 나누어 구체적으로 작성하세요. 학생이 교사와 함께 공부하는 느낌을 받도록 친절하게 서술하세요.
5. **객관식 4지선다**: 모든 문제는 반드시 4개의 보기(`options`)를 포함해야 합니다. 정답 1개 + 오답 3개로 구성하세요.

[수학 기호 규칙 (절대 준수)]
- **거듭제곱**: `^` 기호를 절대 사용하지 마세요. 반드시 유니코드 상첨자를 사용하세요: ² ³ ⁴ ⁵ ⁶ ⁷ ⁸ ⁹
  - 예시: x² (O), x^2 (X), 2³ (O), 2^3 (X)
- **곱셈**: `*` 대신 `×` 를 사용하세요.
- **나눗셈**: `/` 대신 `÷` 를 사용할 수 있습니다 (분수 표현 제외).
- 문제, 보기, 정답, 해설 모든 필드에 동일하게 유니코드 기호를 적용하세요.

[SVG 생성 지침 (절대 준수)]
1. **모든 도형, 기하 문제**는 반드시 `svg` 필드에 시각 자료 코드를 포함해야 합니다. (선택 아님)
   - `<svg viewBox="0 0 300 250" ...>` 태그로 시작하고 닫아야 합니다.
   - 배경색은 투명, 선 색은 검정(#000) 또는 파랑(#3b82f6) 등을 사용하세요.
2. 기하 문제가 아니어서 그림이 필요 없다면 `svg`: "" (빈 문자열)로 남기세요.
3. "삼각형", "사각형", "원", "그래프", "함수" 등의 단어가 문제에 나오면 무조건 그리세요.

[JSON 형식]
{{
  "problems": [
    {{
      "topic": "주제",
      "difficulty": 1,
      "type": "drill",
      "question": "문제 지문",
      "svg": "<svg ...>...</svg>", 
      "options": ["오답", "오답", "정답", "오답"],
      "answer": "정답",
      "explanation": "해설"
    }}
  ]
}}
"""
    
    import asyncio
    
    # 10개 이상이면 끊어서 요청 (안정성 확보 및 속도 향상)
    # 3개씩 병렬로 요청하면 훨씬 빠름
    chunk_size = 3
    if len(plan) > chunk_size:
        print(f"⚠️ Splitting request into chunks of {chunk_size} (Parallel)...")
        chunks = [plan[i:i + chunk_size] for i in range(0, len(plan), chunk_size)]
        
        # 각 청크에 대해 재귀 호출 (병렬 실행)
        # 중요: 재귀 호출 시에도 school_level, grade 정보를 전달해야 함
        tasks = [generate_problems_with_gpt(chunk, school_level, grade) for chunk in chunks]
        results = await asyncio.gather(*tasks)
        
        final_problems = []
        for res in results:
            final_problems.extend(res)
        return final_problems

    # --- 분할 요청 처리 ---
    # 해설 퀄리티 강화 지침 추가
    system_prompt = system_prompt + "\n[해설 지침] 모든 문제의 해설(explanation)은 정답에 이르는 과정을 단계별(Step-by-step)로 상세하게 설명하세요. 단순히 수식만 나열하지 말고, 어떤 개념이 적용되었는지와 풀이의 논리적 흐름을 초심자도 이해할 수 있도록 친절하고 구체적으로 작성해야 합니다."
    
    user_prompt = f"다음 계획에 맞춰 총 {len(plan)}개의 수학 문제를 생성해줘:\n{json.dumps(plan, ensure_ascii=False, indent=2)}"

    try:
        print(f"🚀 Calling GPT-4o-mini for {len(plan)} problems (Batch)...")
        
        # 동적 Client 생성
        client = get_openai_client()
        
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.6, # 창의성 조금 줄여서 속도/안정성 향상
            timeout=60.0 # 60초 내에 안 오면 끊음 (3개니까 충분)
        )
        content = response.choices[0].message.content
        print(f"✅ GPT Response Length: {len(content)}")
        
        # 마크다운 코드 블록 제거 (```json ... ```)
        cleaned_content = content.replace("```json", "").replace("```", "").strip()

        try:
            data = json.loads(cleaned_content)
            problems = data.get("problems", [])
            
            for p in problems:
                # SVG가 없거나 빈 경우, 백엔드에서 강제 생성
                if "svg" not in p or not p["svg"].strip():
                    print(f"⚠️ Problem '{p.get('topic')}' missing SVG. Generating fallback...")
                    p["svg"] = generate_fallback_svg(p.get("topic", ""), p.get("question", ""))
                else:
                    print(f"✅ SVG found for '{p.get('topic')}'")

            return problems
        except json.JSONDecodeError:
             print(f"❌ JSON Decode Error. Raw content: {content[:200]}...")
             return []

    except Exception as e:
        print(f"❌ Error generating problems: {e}")
        return []

def generate_fallback_svg(topic: str, question: str) -> str:
    """
    GPT가 SVG를 생성하지 않았을 때, 텍스트 분석을 통해 고품질 기본 도형을 그려주는 함수
    """
    import re
    
    # 숫자 추출 (예: 10cm, 5, 30도 등)
    numbers = re.findall(r'(\d+)', question)
    nums = [int(n) for n in numbers[:2]] # 앞의 두 숫자만 사용
    
    # 기본 크기 설정
    w, h = 160, 100

    # 숫자 기반 비율 조정
    if len(nums) >= 2:
        w_ratio, h_ratio = nums[0], nums[1]
        
        # 비율 제한
        if w_ratio > h_ratio * 3: w_ratio = h_ratio * 2.5
        if h_ratio > w_ratio * 3: h_ratio = w_ratio * 2.5
        
        # 캔버스 크기(300x250)에 맞게 스케일링
        max_dim = 180
        max_ratio = max(w_ratio, h_ratio)
        w = (w_ratio / max_ratio) * max_dim
        h = (h_ratio / max_ratio) * max_dim
    elif len(nums) == 1:
        w = h = 120

    w_val = nums[0] if len(nums) > 0 else "a"
    h_val = nums[1] if len(nums) > 1 else "b"
    unit = "cm"
    
    width_text = f"{w_val}{unit}"
    height_text = f"{h_val}{unit}"

    # 스타일 설정
    stroke_color = "#334155"
    fill_color = "#f8fafc"
    text_color = "#0f172a"
    dim_color = "#64748b"
    
    # SVG 헤더 및 마커 정의
    svg_header = f"""<svg viewBox="0 0 300 250" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <marker id="arrow-start" markerWidth="10" markerHeight="10" refX="0" refY="3" orient="auto" markerUnits="strokeWidth">
        <path d="M9,0 L0,3 L9,6" fill="none" stroke="{dim_color}" stroke-width="1.5" />
      </marker>
      <marker id="arrow-end" markerWidth="10" markerHeight="10" refX="10" refY="3" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L10,3 L0,6" fill="none" stroke="{dim_color}" stroke-width="1.5" />
      </marker>
    </defs>"""

    # 중앙 정렬 좌표
    cx, cy = 150, 125
    x = cx - w / 2
    y = cy - h / 2

    if "직사각형" in topic or "직사각형" in question:
        return f"""{svg_header}
        <!-- 그림자 -->
        <rect x="{x+3}" y="{y+3}" width="{w}" height="{h}" fill="#000" opacity="0.1" rx="2" />
        
        <!-- 메인 도형 -->
        <rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill_color}" stroke="{stroke_color}" stroke-width="2.5" rx="2" />
        
        <!-- 직각 표시 -->
        <path d="M{x+15},{y} L{x+15},{y+15} L{x},{y+15}" fill="none" stroke="{stroke_color}" stroke-width="1" opacity="0.5"/>
        <path d="M{x+w-15},{y} L{x+w-15},{y+15} L{x+w},{y+15}" fill="none" stroke="{stroke_color}" stroke-width="1" opacity="0.5"/>
        <path d="M{x+15},{y+h} L{x+15},{y+h-15} L{x},{y+h-15}" fill="none" stroke="{stroke_color}" stroke-width="1" opacity="0.5"/>
        <path d="M{x+w-15},{y+h} L{x+w-15},{y+h-15} L{x+w},{y+h-15}" fill="none" stroke="{stroke_color}" stroke-width="1" opacity="0.5"/>

        <!-- 가로 치수선 -->
        <line x1="{x}" y1="{y-15}" x2="{x+w}" y2="{y-15}" stroke="{dim_color}" stroke-width="1.5" marker-start="url(#arrow-start)" marker-end="url(#arrow-end)" />
        <line x1="{x}" y1="{y-5}" x2="{x}" y2="{y-25}" stroke="{dim_color}" stroke-width="1" stroke-dasharray="2,2"/>
        <line x1="{x+w}" y1="{y-5}" x2="{x+w}" y2="{y-25}" stroke="{dim_color}" stroke-width="1" stroke-dasharray="2,2"/>
        <text x="{cx}" y="{y-25}" font-family="sans-serif" font-weight="bold" font-size="14" text-anchor="middle" fill="{text_color}">{width_text}</text>

        <!-- 세로 치수선 -->
        <line x1="{x-15}" y1="{y}" x2="{x-15}" y2="{y+h}" stroke="{dim_color}" stroke-width="1.5" marker-start="url(#arrow-start)" marker-end="url(#arrow-end)" />
        <line x1="{x-5}" y1="{y}" x2="{x-25}" y2="{y}" stroke="{dim_color}" stroke-width="1" stroke-dasharray="2,2"/>
        <line x1="{x-5}" y1="{y+h}" x2="{x-25}" y2="{y+h}" stroke="{dim_color}" stroke-width="1" stroke-dasharray="2,2"/>
        <text x="{x-35}" y="{cy+5}" font-family="sans-serif" font-weight="bold" font-size="14" text-anchor="end" fill="{text_color}">{height_text}</text>
        </svg>"""
        
    elif "삼각형" in topic or "삼각형" in question:
        return f"""{svg_header}
        <!-- 그림자 -->
        <polygon points="{x+3},{y+h+3} {x+w+3},{y+h+3} {x+3},{y+3}" fill="#000" opacity="0.1" />
        
        <!-- 메인 도형 -->
        <polygon points="{x},{y+h} {x+w},{y+h} {x},{y}" fill="{fill_color}" stroke="{stroke_color}" stroke-width="2.5" stroke-linejoin="round" />
        
        <!-- 직각 표시 -->
        <rect x="{x}" y="{y+h-15}" width="15" height="15" fill="none" stroke="{stroke_color}" stroke-width="1.5" />
        
        <!-- 밑변 치수선 -->
        <line x1="{x}" y1="{y+h+15}" x2="{x+w}" y2="{y+h+15}" stroke="{dim_color}" stroke-width="1.5" marker-start="url(#arrow-start)" marker-end="url(#arrow-end)" />
        <line x1="{x}" y1="{y+h+5}" x2="{x}" y2="{y+h+25}" stroke="{dim_color}" stroke-width="1" stroke-dasharray="2,2"/>
        <line x1="{x+w}" y1="{y+h+5}" x2="{x+w}" y2="{y+h+25}" stroke="{dim_color}" stroke-width="1" stroke-dasharray="2,2"/>
        <text x="{cx}" y="{y+h+40}" font-family="sans-serif" font-weight="bold" font-size="14" text-anchor="middle" fill="{text_color}">{width_text}</text>

        <!-- 높이 치수선 -->
        <line x1="{x-15}" y1="{y}" x2="{x-15}" y2="{y+h}" stroke="{dim_color}" stroke-width="1.5" marker-start="url(#arrow-start)" marker-end="url(#arrow-end)" />
        <line x1="{x-5}" y1="{y}" x2="{x-25}" y2="{y}" stroke="{dim_color}" stroke-width="1" stroke-dasharray="2,2"/>
        <line x1="{x-5}" y1="{y+h}" x2="{x-25}" y2="{y+h}" stroke="{dim_color}" stroke-width="1" stroke-dasharray="2,2"/>
        <text x="{x-35}" y="{cy+5}" font-family="sans-serif" font-weight="bold" font-size="14" text-anchor="end" fill="{text_color}">{height_text}</text>
        </svg>"""
        
    elif "원" in topic or "원" in question:
        r = min(w, h) / 2
        return f"""{svg_header}
        <circle cx="{cx}" cy="{125}" r="{r}" fill="{fill_color}" stroke="{stroke_color}" stroke-width="2.5" />
        <circle cx="{cx}" cy="{125}" r="3" fill="{stroke_color}" />
        <line x1="{cx}" y1="{125}" x2="{cx+r}" y2="{125}" stroke="{stroke_color}" stroke-width="1.5" stroke-dasharray="4,2" />
        <text x="{cx + r/2}" y="{115}" font-family="sans-serif" font-weight="bold" font-size="14" text-anchor="middle" fill="{text_color}">r = {width_text}</text>
        </svg>"""
        
    return "" 

async def adjust_difficulty_level(user_id: str, accuracy: float, db: Session) -> Dict[str, Any]:
    level_change = 0
    message = "현재 난이도를 유지합니다."
    
    if accuracy >= 0.8:
        level_change = 1
        message = "실력이 대단하네요! 난이도를 조금 올려볼게요. 🚀"
    elif accuracy < 0.5:
        level_change = -1
        message = "조금 어려웠나봐요. 기초부터 다시 탄탄하게 다져봅시다. 💪"

    return {
        "userId": user_id,
        "level_change": level_change,
        "current_level": 2 + level_change, 
        "message": message
    }

async def analyze_error(user_id: str, problem_id: str, user_answer: str, correct_answer: str, question_text: str, db: Session):
    prompt = f"""
    학생이 수학 문제를 틀렸습니다.
    문제: {question_text}
    정답: {correct_answer}
    학생 답: {user_answer}

    이 오답의 원인을 분석해주세요. (단순 계산 실수, 개념 부족, 문제 해석 오류 등)
    그리고 학생에게 줄 맞춤형 조언을 한 문장으로 작성해주세요.
    응답은 JSON 형식으로 주세요: {{"error_type": "...", "reasoning": "...", "advice": "..."}}
    """
    
    try:
        # 동적 Client 생성
        client = get_openai_client()
        
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            timeout=60.0
        )
        content = response.choices[0].message.content
        analysis = json.loads(content)
        
        log = WeaknessLog(
            id=f"log-{os.urandom(4).hex()}",
            user_id=user_id,
            problem_id=problem_id,
            user_answer=user_answer,
            error_type=analysis.get("error_type", "Unknown"),
            reasoning_process=analysis.get("reasoning", ""),
            ai_advice=analysis.get("advice", ""),
            severity=3
        )
        db.add(log)
        db.commit()
        
        return analysis
    except Exception as e:
        print(f"Error analyzing error: {e}")
        return {"error": "Analysis failed"}


async def rewrite_problem(original_text: str) -> str:
    prompt = f"""
    다음 수학 문제를 '초등학생이 이해하기 쉬운 문장'으로 바꿔주세요.
    수치는 절대 바꾸지 마세요. 문체만 친절하게 바꾸세요.
    
    문제: {original_text}
    """
    try:
        # 동적 Client 생성
        client = get_openai_client()
        
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            timeout=30.0
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Rewrite failed: {e}")
        return original_text

TUTOR_SYSTEM_PROMPT = """
당신은 친절하고 지혜로운 AI 수학 선생님입니다.
학생이 모르는 것을 물어볼 때, 정답을 바로 알려주지 말고 소크라테스 문답법으로 스스로 깨우치도록 유도하세요.
설명은 쉽고 간결하게, 이모지를 적절히 사용하여 친근하게 대화하세요.
수식은 LaTeX 형식($...$)을 사용하세요.
"""
