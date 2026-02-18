// ============================================
// API Route: AI 수학 문제 생성 (Vercel 호환)
// POST /api/generate
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// 학년별 설정
function getGradeInfo(schoolLevel: string, grade: number) {
    const levelMap: Record<string, Record<number, { label: string; desc: string }>> = {
        elementary: {
            1: { label: '초등학교 1학년', desc: '덧셈, 뺄셈, 수 비교, 모양 찾기' },
            2: { label: '초등학교 2학년', desc: '두 자리 수 덧뺄셈, 곱셈 기초, 시간과 길이' },
            3: { label: '초등학교 3학년', desc: '세 자리 수 연산, 분수 기초, 원과 삼각형' },
            4: { label: '초등학교 4학년', desc: '큰 수, 곱셈과 나눗셈, 분수와 소수, 각도' },
            5: { label: '초등학교 5학년', desc: '약분과 통분, 분수 연산, 다각형 넓이, 평균' },
            6: { label: '초등학교 6학년', desc: '비와 비율, 원의 넓이, 비례식, 경우의 수' },
        },
        middle: {
            1: { label: '중학교 1학년', desc: '정수와 유리수, 문자와 식, 일차방정식, 좌표평면' },
            2: { label: '중학교 2학년', desc: '연립방정식, 부등식, 일차함수, 삼각형 성질' },
            3: { label: '중학교 3학년', desc: '제곱근, 이차방정식, 이차함수, 피타고라스 정리' },
        },
        high: {
            1: { label: '고등학교 1학년', desc: '다항식, 방정식과 부등식, 도형의 방정식, 집합과 명제' },
            2: { label: '고등학교 2학년', desc: '함수, 수열, 지수와 로그, 삼각함수' },
            3: { label: '고등학교 3학년', desc: '미분과 적분, 확률과 통계, 벡터' },
        },
    };

    return levelMap[schoolLevel]?.[grade] || { label: '학년 미상', desc: '일반 수학' };
}

// 시스템 프롬프트 생성
function buildSystemPrompt(schoolLevel: string, grade: number) {
    const info = getGradeInfo(schoolLevel, grade);

    return `당신은 대한민국 '최상위권 수학' 전문 출제 위원입니다.
현재 대상 학년은 **[${info.label}]** 입니다.
주요 토픽 예시: ${info.desc}

단순 연산이나 너무 쉬운 문제는 **절대 출제하지 마세요.**
학생이 문제를 읽고 **논리적으로 추론(Reasoning)하고, 조건을 분석해야만** 풀 수 있는 고품질 문제를 만들어야 합니다.

[대상 학년: ${info.label}]
- 해당 학년의 교과 과정을 철저히 준수하세요.
- 고등학생에게 초등 수준의 덧셈/뺄셈 문제를 내면 **해고**됩니다.

[출제 지침]
1. **복합 사고력(Multi-step Reasoning)**: 2단계 이상의 사고가 필요한 문제를 내세요.
2. **실생활 응용 & 문해력**: 텍스트를 읽고 식을 세우는 능력을 평가하세요.
3. **오답 유도(Distractors)**: 보기는 학생이 흔히 범하는 실수를 반영한 매력적인 오답으로 구성하세요.
4. **상세한 해설(Step-by-Step)**: 어떤 개념을 사용해야 하는지부터 시작하여 1, 2, 3단계로 나누어 구체적으로 작성하세요.
5. **객관식 4지선다**: 모든 문제는 반드시 4개의 보기(options)를 포함해야 합니다.

[수학 기호 규칙]
- **거듭제곱**: ^ 대신 유니코드 상첨자: ² ³ ⁴ ⁵
- **곱셈**: * 대신 ×
- **나눗셈**: / 대신 ÷ (분수 표현 제외)

[SVG 생성 지침]
1. 도형/기하 문제는 svg 필드에 시각 자료를 포함하세요. (<svg viewBox="0 0 300 250">)
2. 기하 문제가 아니면 svg: "" (빈 문자열)로 남기세요.

[해설 지침]
모든 문제의 해설은 정답에 이르는 과정을 단계별로 상세하게 설명하세요. 초심자도 이해할 수 있도록 친절하고 구체적으로 작성하세요.

[JSON 형식]
{
  "problems": [
    {
      "topic": "주제",
      "difficulty": 1,
      "type": "drill",
      "question": "문제 지문",
      "svg": "",
      "options": ["보기1", "보기2", "보기3", "보기4"],
      "answer": "정답",
      "explanation": "해설"
    }
  ]
}`;
}

export async function POST(request: NextRequest) {
    // 1. API 키 확인
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.error('❌ OPENAI_API_KEY 환경변수가 설정되지 않았습니다.');
        return NextResponse.json(
            { error: 'API key not configured', code: 'NO_API_KEY' },
            { status: 500 }
        );
    }

    // 2. 요청 파싱
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const {
        count = 10,
        schoolLevel = 'elementary',
        grade = 3,
        unitId,
        level = 'medium', // easy, medium, hard
        topics = [], // 유사 문제 생성 시 주제 필터
    } = body;

    console.log(`📡 /api/generate — count=${count}, level=${schoolLevel} ${grade}, topics=${topics.join(', ')}, difficulty=${level}`);

    // 3. OpenAI 호출
    const client = new OpenAI({ apiKey });
    let systemPrompt = buildSystemPrompt(schoolLevel, grade);

    // 유사 문제 가중치 추가
    if (topics.length > 0) {
        systemPrompt += `\n\n[특별 지침: 유사 문제 생성]\n다음 주제들에 집중하여 문제를 출제하세요: ${topics.join(', ')}. 해당 개념의 유사 변형 문제를 만들어 학습을 돕습니다.`;
    }

    // 난이도별 프롬프트 조정
    if (level === 'easy') {
        systemPrompt += `\n\n[난이도: 기초(Easy)]\n학생이 기초가 부족합니다. 교과서 예제 수준의 **아주 기본적인 개념 확인 문제** 위주로 출제하세요. 복잡한 응용은 피하고, 자신감을 길러주는 데 집중하세요.`;
    } else if (level === 'hard') {
        systemPrompt += `\n\n[난이도: 심화(Hard)]\n학생이 매우 우수합니다. **경시대회(Olympiad) 스타일의 사고력 문제**를 출제하세요. 단순 계산보다는 창의적인 발상이 필요하거나, 함정이 있는 문제를 포함하세요.`;
    } else {
        systemPrompt += `\n\n[난이도: 보통(Medium)]\n현행 교과 과정의 표준 난이도입니다. 개념 이해와 기본 응용력을 골고루 평가하세요.`;
    }

    // 문제 생성 계획 (단순화: Python 버전의 plan_daily_worksheet 로직 간소화)
    const planCount = Math.min(count, 15);
    const plan = Array.from({ length: planCount }, (_, i) => ({
        index: i + 1,
        difficulty: i < planCount * 0.3 ? 1 : i < planCount * 0.7 ? 2 : 3,
        topic: topics.length > 0 ? topics[i % topics.length] : undefined
    }));

    const userPrompt = topics.length > 0
        ? `주체별(${topics.join(', ')})로 균형 있게 총 ${plan.length}개의 유사 변형 문제를 생성해줘.`
        : `다음 계획에 맞춰 총 ${plan.length}개의 수학 문제를 생성해줘:\n${JSON.stringify(plan, null, 2)}`;

    try {
        const response = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.6,
        }, { timeout: 60000 });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            console.error('❌ GPT returned empty content');
            return NextResponse.json({ error: 'Empty response from AI' }, { status: 500 });
        }

        console.log(`✅ GPT Response Length: ${content.length}`);

        // JSON 파싱
        const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(cleaned);
        const problems = data.problems || [];

        // 난이도 숫자→문자 변환 + SVG 정리
        const mapped = problems.map((p: any) => ({
            question: p.question,
            answer: p.answer,
            topic: p.topic,
            type: p.type || 'drill',
            difficulty: p.difficulty === 3 ? 'hard' : p.difficulty === 2 ? 'medium' : 'easy',
            options: p.options || [],
            explanation: p.explanation || '',
            svg: p.svg || '',
        }));

        return NextResponse.json(mapped);
    } catch (error: any) {
        console.error('🔥 OpenAI API Error:', error);

        // 에러 타입별 응답
        if (error?.status === 401 || error?.code === 'invalid_api_key') {
            return NextResponse.json(
                { error: 'Invalid API key', code: 'AUTH_ERROR' },
                { status: 401 }
            );
        }
        if (error?.status === 429) {
            return NextResponse.json(
                { error: 'Rate limit exceeded', code: 'QUOTA_EXCEEDED' },
                { status: 429 }
            );
        }
        if (error instanceof SyntaxError) {
            return NextResponse.json(
                { error: 'Failed to parse AI response', code: 'PARSE_ERROR' },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { error: error.message || 'Internal server error', code: 'SERVER_ERROR' },
            { status: 500 }
        );
    }
}
