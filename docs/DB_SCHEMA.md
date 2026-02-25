# 📐 MathDaily DB 스키마 설계 문서

## ERD 개요

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
│     User     │────<│ DailyWorksheet   │────<│    Problem      │
│              │     │                  │     │                 │
│ id (PK)      │     │ id (PK)          │     │ id (PK)         │
│ name         │     │ userId (FK)      │     │ worksheetId(FK) │
│ email        │     │ date             │     │ orderNum        │
│ grade        │     │ title            │     │ question        │
│ createdAt    │     │ totalCount       │     │ answer          │
│ updatedAt    │     │ isCompleted      │     │ options[]       │
│              │     │ score            │     │ type            │
│              │     │ difficulty       │     │ topic           │
│              │     │ topics[]         │     │ difficulty      │
│              │     │ createdAt        │     │ explanation     │
│              │     │ updatedAt        │     │ createdAt       │
│              │     │                  │     │                 │
│              │     │ UNIQUE(userId,   │     │ UNIQUE(sheet,   │
│              │     │        date)     │     │        orderNum)│
└──────────────┘     └──────────────────┘     └─────────────────┘
       │                     │                        │
       │              ┌──────┴──────┐                 │
       └─────────────>│UserResponse │<────────────────┘
                      │             │
                      │ id (PK)     │
                      │ userId (FK) │
                      │ wsId (FK)   │
                      │ probId (FK) │
                      │ userAnswer  │
                      │ isCorrect   │
                      │ timeSpent   │
                      │ submittedAt │
                      │             │
                      │ UNIQUE(user,│
                      │     problem)│
                      └──────┬──────┘
                             │ 1:1
                      ┌──────┴──────┐
                      │WeaknessLog  │
                      │             │
                      │ id (PK)     │
                      │ userId (FK) │
                      │ respId (FK) │  ← UNIQUE
                      │ errorType   │
                      │ topic       │
                      │ subtopic    │
                      │ severity    │
                      │ description │
                      │ isResolved  │
                      │ resolvedAt  │
                      │ repeatCount │
                      │ createdAt   │
                      │ updatedAt   │
                      └─────────────┘
```

## 테이블 상세 설명

### 1. User (사용자)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | STRING (CUID) | PK |
| name | STRING | 사용자 이름 |
| email | STRING | 이메일 (UNIQUE) |
| grade | INT | 학년 (난이도 기준, 기본값: 1) |
| createdAt | DATETIME | 생성일 |
| updatedAt | DATETIME | 수정일 |

### 2. DailyWorksheet (일일 학습지)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | STRING (CUID) | PK |
| userId | STRING | FK → User.id |
| date | DATE | 학습 날짜 (YYYY-MM-DD) |
| title | STRING | 학습지 제목 |
| totalCount | INT | 총 문제 수 (기본: 10) |
| isCompleted | BOOLEAN | 완료 여부 |
| score | FLOAT? | 점수 (완료 후 계산) |
| difficulty | STRING | easy/medium/hard |
| topics | STRING[] | 다루는 단원 목록 |
| createdAt | DATETIME | 생성일 |
| updatedAt | DATETIME | 수정일 |

**제약조건**: `UNIQUE(userId, date)` - 사용자당 하루 1개 학습지

### 3. Problem (문제)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | STRING (CUID) | PK |
| worksheetId | STRING | FK → DailyWorksheet.id |
| orderNum | INT | 문제 번호 |
| question | STRING | 문제 텍스트 |
| answer | STRING | 정답 |
| options | STRING[] | 객관식 보기 |
| type | STRING | short/multiple/essay |
| topic | STRING | 단원명 |
| difficulty | STRING | easy/medium/hard |
| explanation | STRING? | 풀이 설명 |

**제약조건**: `UNIQUE(worksheetId, orderNum)` - 학습지 내 문제 번호 유일

### 4. UserResponse (사용자 답안)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | STRING (CUID) | PK |
| userId | STRING | FK → User.id |
| worksheetId | STRING | FK → DailyWorksheet.id |
| problemId | STRING | FK → Problem.id |
| userAnswer | STRING | 사용자 제출 답 |
| isCorrect | BOOLEAN | 정답 여부 |
| timeSpentSec | INT? | 풀이 소요 시간 (초) |
| submittedAt | DATETIME | 제출 시각 |

**제약조건**: `UNIQUE(userId, problemId)` - 문제당 1개 답안

### 5. WeaknessLog (취약점 분석 결과) ⭐
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | STRING (CUID) | PK |
| userId | STRING | FK → User.id |
| responseId | STRING | FK → UserResponse.id (UNIQUE, 1:1) |
| **errorType** | STRING | **틀린 원인 태깅** (아래 참조) |
| topic | STRING | 관련 단원 |
| subtopic | STRING? | 세부 단원 |
| severity | INT | 심각도 (1~5) |
| description | STRING? | 상세 설명 |
| isResolved | BOOLEAN | 해결 여부 |
| resolvedAt | DATETIME? | 해결 시점 |
| repeatCount | INT | 같은 유형 반복 횟수 |
| createdAt | DATETIME | 생성일 |
| updatedAt | DATETIME | 수정일 |

#### 📋 errorType 값 목록
| 코드 | 한국어 | 설명 |
|------|--------|------|
| `CALCULATION_ERROR` | 계산 실수 | 부호 실수, 연산 오류 |
| `CONCEPT_GAP` | 개념 부족 | 공식/정의 미숙지 |
| `MISREAD` | 문제 잘못 읽음 | 조건 누락, 단위 혼동 |
| `TIME_PRESSURE` | 시간 부족 | 시간 압박으로 인한 오류 |
| `CARELESS` | 부주의 | 답 옮겨 적기 실수 등 |
| `FORMULA_ERROR` | 공식 적용 오류 | 공식은 알지만 적용 실수 |
| `PROCESS_ERROR` | 풀이 과정 오류 | 풀이 방향은 맞으나 과정 실수 |
| `OTHER` | 기타 | 위에 해당하지 않는 경우 |

**인덱스**:  
- `(userId, errorType)` - 사용자별 오류 유형 조회
- `(userId, topic)` - 사용자별 단원 취약점 조회
- `(userId, isResolved)` - 미해결 취약점 필터링

## 핵심 쿼리 패턴

### 1. 오늘의 학습지 조회/생성
```sql
-- 오늘의 학습지 존재 확인
SELECT * FROM "DailyWorksheet" 
WHERE "userId" = $1 AND "date" = CURRENT_DATE;
```

### 2. 사용자 취약 단원 TOP 5
```sql
SELECT topic, COUNT(*) as count, AVG(severity) as avg_severity
FROM "WeaknessLog"
WHERE "userId" = $1 AND "isResolved" = false
GROUP BY topic
ORDER BY count DESC
LIMIT 5;
```

### 3. 월간 학습 기록 (달력 데이터)
```sql
SELECT w.date, w."isCompleted", w.score, w."totalCount",
       COUNT(r.id) FILTER (WHERE r."isCorrect") as correct_count,
       COUNT(r.id) as answered_count
FROM "DailyWorksheet" w
LEFT JOIN "UserResponse" r ON w.id = r."worksheetId"
WHERE w."userId" = $1 
  AND w.date BETWEEN $2 AND $3
GROUP BY w.id
ORDER BY w.date;
```
