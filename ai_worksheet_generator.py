import random
from typing import List, Dict, Optional
from datetime import datetime

# ==========================================
# 1. 데이터 모델 (DB 스키마와 매핑)
# ==========================================

class UserProfile:
    def __init__(self, user_id: str, grade: int, recent_accuracy: float):
        self.user_id = user_id
        self.grade = grade
        self.recent_accuracy = recent_accuracy  # 최근 5회 학습지 평균 정답률 (0.0 ~ 1.0)
        self.weak_concepts: List[str] = []     # 취약한 개념 리스트
        self.current_concepts: List[str] = []  # 현재 배우고 있는 진도

class Problem:
    def __init__(self, topic: str, difficulty: str, question: str, type: str = 'multiple_choice'):
        self.topic = topic
        self.difficulty = difficulty  # 'easy', 'medium', 'hard'
        self.question = question
        self.type = type

# ==========================================
# 2. 동적 난이도 조절 (CAT) 로직
# ==========================================

def adjust_difficulty(user: UserProfile) -> Dict[str, float]:
    """
    사용자의 최근 정답률에 따라 문제 난이도 비율을 동적으로 조정합니다.
    - 정답률 >= 80%: 난이도 상향 (Hard 비율 증가)
    - 정답률 < 60%: 난이도 하향 (Easy 비율 증가)
    - 그 외: 현상 유지 (Medium 중심)
    """
    if user.recent_accuracy >= 0.8:
        # 잘함 -> 도전! (Hard 비중 높임)
        return {'easy': 0.1, 'medium': 0.4, 'hard': 0.5}
    elif user.recent_accuracy < 0.6:
        # 어려움 -> 기초 다지기 (Easy 비중 높임)
        return {'easy': 0.5, 'medium': 0.4, 'hard': 0.1}
    else:
        # 적정 -> 표준 (Medium 중심)
        return {'easy': 0.2, 'medium': 0.6, 'hard': 0.2}

# ==========================================
# 3. LLM 프롬프트 생성기
# ==========================================

def generate_llm_prompt(topic: str, difficulty: str, count: int) -> str:
    """
    선택된 개념에 대해 LLM이 문제를 생성하도록 하는 프롬프트 템플릿
    - 실생활 예시 포함 (쇼핑, 게임, 등)
    """
    prompt = f"""
You are a creative math teacher AI. Generate {count} math problems based on the following criteria:

- **Target Grade**: Elementary/Middle School Level
- **Topic**: {topic}
- **Difficulty**: {difficulty.upper()}
- **Style**: Real-life scenarios (e.g., shopping, gaming scores, cooking, sports) to make it engaging.
- **Format**: JSON list with keys: 'question', 'answer', 'options' (if multiple choice), 'explanation'.

### Example Scenarios:
1. **Shopping**: Calculating discounts or total price.
   "If a 15,000 won toy is on 20% sale, how much is it?"
2. **Gaming**: Experience points (XP) or damage calculation.
   "You need 1000 XP to level up. You have 450 XP. How much more do you need?"
3. **Cooking**: Recipe ratios.
   "A recipe needs 2 cups of flour for 3 people. How many cups for 6 people?"

### Instructions:
- Ensure the problem is solvable and the answer is clear.
- For 'hard' difficulty, include multi-step reasoning.
- Provide step-by-step explanation in the 'explanation' field.
- Language: Korean (한국어)

GENERATE {count} PROBLEMS NOW.
"""
    return prompt.strip()

# ==========================================
# 4. LLM 모의 호출 (Mock)
# ==========================================

def call_llm_mock(topic: str, difficulty: str, count: int) -> List[Problem]:
    """
    실제 LLM 호출 대신 더미 문제를 반환하는 함수
    """
    # 실제로는 여기서 OpenAI API 등을 호출하여 prompt를 전송하고 응답을 파싱함
    # prompt = generate_llm_prompt(topic, difficulty, count)
    
    problems = []
    scenarios = ["마트에서", "게임 아이템 상점에서", "요리할 때", "친구들과 피자를 나눌 때"]
    
    for i in range(count):
        scenario = random.choice(scenarios)
        question = f"[{topic}] {difficulty.upper()} 난이도: {scenario} 발생하는 수학 문제입니다. ({i+1})"
        problems.append(Problem(topic, difficulty, question))
        
    return problems

# ==========================================
# 5. 메인 문제 구성 알고리즘
# ==========================================

def generate_daily_worksheet(user: UserProfile, total_questions: int = 10) -> List[Problem]:
    """
    매일의 학습지 문제를 생성하는 메인 로직
    구성 비율:
    - 복습 (취약점) : 30%
    - 현행 (진도)   : 50%
    - 도전 (심화)   : 20%
    """
    
    # 1. 문제 수 배분
    review_count = int(total_questions * 0.3)
    challenge_count = int(total_questions * 0.2)
    current_count = total_questions - review_count - challenge_count  # 나머지 (약 50%)

    worksheet = []

    # 2. 난이도 비율 결정 (CAT)
    difficulty_ratio = adjust_difficulty(user)
    print(f"User Accuracy: {user.recent_accuracy*100}% -> Difficulty Ratio: {difficulty_ratio}")

    # 3. [복습] 취약점 (Weak Concepts)
    # 취약점은 주로 '기초(Easy)'나 '보통(Medium)' 난이도로 복습하여 자신감 회복
    if user.weak_concepts:
        print(f"Generating {review_count} Review Problems (Topics: {user.weak_concepts})...")
        for _ in range(review_count):
            topic = random.choice(user.weak_concepts)
            # 복습은 조금 쉽게 (Easy ~ Medium)
            diff = 'medium' if random.random() > 0.5 else 'easy'
            
            # LLM 호출 (프롬프트 생성 -> API 호출 -> 파싱)
            prompt = generate_llm_prompt(topic, diff, 1)
            # print(f"[System] Prompt for Review:\n{prompt}\n") # 디버그용
            
            generated = call_llm_mock(topic, diff, 1)
            worksheet.extend(generated)
    else:
        # 취약점이 없으면 현행 학습으로 대체
        current_count += review_count

    # 4. [현행] 진도 (Current Concepts)
    # 현재 진도는 CAT 로직에 따른 난이도 비율 적용
    if user.current_concepts:
        print(f"Generating {current_count} Current Concept Problems (Topics: {user.current_concepts})...")
        for _ in range(current_count):
            topic = random.choice(user.current_concepts)
            
            # 난이도 확률적 선택
            rand_val = random.random()
            if rand_val < difficulty_ratio['easy']:
                diff = 'easy'
            elif rand_val < difficulty_ratio['easy'] + difficulty_ratio['medium']:
                diff = 'medium'
            else:
                diff = 'hard'
                
            generated = call_llm_mock(topic, diff, 1)
            worksheet.extend(generated)

    # 5. [도전] 심화 (Challenge)
    # 도전 문제는 무조건 '어려움(Hard)' 또는 '현행 개념의 심화'
    print(f"Generating {challenge_count} Challenge Problems...")
    challenge_topic = random.choice(user.current_concepts) if user.current_concepts else "종합 문제"
    
    for _ in range(challenge_count):
        # 도전은 무조건 Hard
        generated = call_llm_mock(challenge_topic, 'hard', 1)
        worksheet.extend(generated)

    return worksheet

# ==========================================
# 실행 예시
# ==========================================

if __name__ == "__main__":
    # 사용자 A: 최근 성적 우수 (85점) -> 난이도 상향, 도전적
    user_a = UserProfile(user_id="user_a", grade=4, recent_accuracy=0.85)
    user_a.weak_concepts = ["분수 덧셈", "도형의 각도"]
    user_a.current_concepts = ["소수의 곱셈", "삼각형의 넓이"]

    print("=== User A Worksheet Generation ===")
    worksheet_a = generate_daily_worksheet(user_a)
    for idx, p in enumerate(worksheet_a):
        print(f"{idx+1}. [{p.topic}] ({p.difficulty.upper()}) {p.question}")
    
    print("\n" + "="*40 + "\n")

    # 사용자 B: 최근 성적 부진 (40점) -> 난이도 하향, 기초 다지기
    user_b = UserProfile(user_id="user_b", grade=4, recent_accuracy=0.40)
    user_b.weak_concepts = ["나눗셈", "곱셈구구"]
    user_b.current_concepts = ["분수", "길이 재기"]

    print("=== User B Worksheet Generation ===")
    worksheet_b = generate_daily_worksheet(user_b)
    for idx, p in enumerate(worksheet_b):
        print(f"{idx+1}. [{p.topic}] ({p.difficulty.upper()}) {p.question}")
