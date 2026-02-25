from sqlalchemy.orm import Session
from .models import Chapter, Unit

def seed_curriculum(db: Session):
    """
    초/중/고 수학 커리큘럼 초기화 - 무조건 확인 및 추가(Upsert)
    """
    print("🔄 Checking curriculum data...")

    # 1. 초등학교 (1~6학년) - 모든 학년 데이터 보강
    elementary_curriculum = [
        {"grade": 1, "topic": "9까지의 수", "units": ["1~9 이해와 쓰기", "수의 순서와 크기 비교"]},
        {"grade": 1, "topic": "덧셈과 뺄셈(1)", "units": ["모으기와 가르기", "덧셈식과 뺄셈식"]},
        {"grade": 2, "topic": "세 자리 수", "units": ["백, 몇백", "세 자리 수의 자릿값"]},
        {"grade": 2, "topic": "곱셈구구", "units": ["2~5단", "6~9단"]},
        {"grade": 3, "topic": "덧셈과 뺄셈(심화)", "units": ["세 자리 수의 덧셈", "세 자리 수의 뺄셈"]},
        {"grade": 3, "topic": "평면도형", "units": ["선분, 반직선, 직선", "직각삼각형과 직사각행"]},
        {"grade": 4, "topic": "큰 수", "units": ["만, 억, 조", "수의 크기 비교"]},
        {"grade": 4, "topic": "각도", "units": ["각의 크기", "삼각형의 내각의 합"]},
        {"grade": 5, "topic": "약수와 배수", "units": ["약수와 배수 찾기", "최대공약수와 최소공배수"]},
        {"grade": 5, "topic": "다각형의 둘레와 넓이", "units": ["사각형의 넓이", "삼각형의 넓이"]},
        {"grade": 6, "topic": "분수의 나눗셈", "units": ["(분수) ÷ (자연수)", "(분수) ÷ (분수)"]},
        {"grade": 6, "topic": "비례식과 비례배분", "units": ["비의 성질", "비례배분 활용"]},
    ]

    # 2. 중학교 (1~3학년)
    middle_curriculum = [
        {"grade": 1, "topic": "수와 연산", "units": ["소인수분해", "정수와 유리수"]},
        {"grade": 1, "topic": "문자와 식", "units": ["문자의 사용", "일차방정식"]},
        {"grade": 2, "topic": "식의 계산", "units": ["단항식의 계산", "다항식의 계산"]},
        {"grade": 2, "topic": "부등식", "units": ["일차부등식", "연립일차방정식"]},
        {"grade": 3, "topic": "실수와 그 연산", "units": ["제곱근과 실수", "근호 포함 식 계산"]},
        {"grade": 3, "topic": "이차방정식", "units": ["인수분해", "이차방정식의 해"]},
    ]

    # 3. 고등학교 (1~3학년)
    high_curriculum = [
        {"grade": 1, "topic": "다항식", "units": ["다항식의 연산", "항등식과 나머지정리"]},
        {"grade": 1, "topic": "방정식과 부등식", "units": ["복소수", "이차방정식", "이차함수", "여러 가지 방정식"]},
        {"grade": 1, "topic": "도형의 방정식", "units": ["평면좌표", "직선의 방정식", "원의 방정식", "도형의 이동"]},
        {"grade": 2, "topic": "수학 I", "units": ["지수함수와 로그함수", "삼각함수", "수열"]},
        {"grade": 2, "topic": "수학 II", "units": ["함수의 극한과 연속", "다항함수의 미분법", "다항함수의 적분법"]},
        {"grade": 3, "topic": "미적분", "units": ["수열의 극한", "여러 가지 미분법", "여러 가지 적분법"]},
        {"grade": 3, "topic": "확률과 통계", "units": ["경우의 수", "확률", "통계"]},
    ]

    # 데이터 삽입 (기존 데이터 삭제 없이 없는 것만 추가)
    def upsert_data(level, items):
        count = 0
        for item in items:
            # 챕터 확인 (중복 방지)
            chapter = db.query(Chapter).filter_by(
                school_level=level, grade=item['grade'], name=item['topic']
            ).first()
            
            if not chapter:
                chapter = Chapter(school_level=level, grade=item['grade'], name=item['topic'])
                db.add(chapter)
                db.commit()
            
            # 소단원 확인 및 추가
            for uname in item['units']:
                unit = db.query(Unit).filter_by(chapter_id=chapter.id, name=uname).first()
                if not unit:
                    unit = Unit(chapter_id=chapter.id, name=uname)
                    db.add(unit)
                    count += 1
            db.commit()
        if count > 0:
            print(f"✅ Added {count} missing units for {level}.")

    upsert_data('elementary', elementary_curriculum)
    upsert_data('middle', middle_curriculum)
    upsert_data('high', high_curriculum)
    print("✅ Curriculum check & seed completed.")
