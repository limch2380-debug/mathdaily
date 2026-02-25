import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const getOpenAIClient = () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY 환경 변수가 설정되지 않았습니다.');
    return new OpenAI({ apiKey });
};

const getLevelDescription = (schoolLevel: string, grade: number) => {
    if (schoolLevel === 'elementary') {
        return { label: `초등학교 ${grade}학년`, desc: '기초 연산, 도형의 기초, 분수/소수' };
    } else if (schoolLevel === 'middle') {
        return { label: `중학교 ${grade}학년`, desc: '방정식, 함수, 기하, 확률' };
    } else if (schoolLevel === 'high') {
        const labels: Record<number, { label: string; desc: string }> = {
            1: { label: '고등학교 1학년 (공통수학1, 2)', desc: '다항식, 방정식과 부등식, 도형의 방정식, 집합과 명제, 함수, 경우의 수' },
            2: { label: '고등학교 2학년 (수학I, 수학II)', desc: '지수함수와 로그함수, 삼각함수, 수열, 미분, 적분' },
            3: { label: '고등학교 3학년 (미적분/확통/기하)', desc: '수능 연계 심화 문제, 미적분, 확률과 통계, 공간도형' },
        };
        return labels[grade] || { label: `고등학교 ${grade}학년`, desc: '고등 심화 수학' };
    }
    return { label: '학년 미상', desc: '일반 수학' };
};

const DIFFICULTY_TOPICS: Record<string, string[]> = {
    easy: ['수와 연산', '기본 도형', '분수와 소수'],
    medium: ['방정식', '함수', '기하', '측정'],
    hard: ['복합 추론', '심화 응용', '융합 문제'],
};

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            count = 10,
            schoolLevel = 'elementary',
            grade = 3,
            level = 'medium',
            topics,
        } = body;

        const { label: userGradeLevel, desc: levelDesc } = getLevelDescription(schoolLevel, grade);

        const topicList = topics && topics.length > 0
            ? topics
            : DIFFICULTY_TOPICS[level] || DIFFICULTY_TOPICS['medium'];

        const difficultyGuide =
            level === 'easy' ? '쉬운 편으로 출제하되 한 단계 사고가 필요하게 구성하세요.' :
                level === 'hard' ? '고난도 심화 문제로, 복합적 사고력을 요구하세요.' :
                    '중간 난이도로, 두 단계 이상의 추론이 필요하게 출제하세요.';

        const systemPrompt = `당신은 대한민국 수학 전문 출제 위원입니다.
현재 대상 학년은 [${userGradeLevel}] 입니다.
주요 토픽 예시: ${levelDesc}
난이도 지침: ${difficultyGuide}

[출제 지침]
1. 복합 사고력(Multi-step Reasoning): 2단계 이상 사고 필요
2. 오답 유도(Distractors): 흔한 실수를 반영한 매력적인 오답 구성
3. 상세한 해설: Step-by-step으로 작성
4. 객관식 4지선다: 반드시 4개 보기 포함 (정답 1개 + 오답 3개)

[수학 기호 규칙]
- 거듭제곱: 유니코드 상첨자 사용 (² ³ ⁴), ^ 기호 금지
- 곱셈: × 사용 (* 금지)

[JSON 형식]
{
  "problems": [
    {
      "topic": "주제",
      "difficulty": 1|2|3,
      "type": "drill",
      "question": "문제 지문",
      "svg": "",
      "options": ["오답", "오답", "정답", "오답"],
      "answer": "정답 (보기 중 하나와 정확히 일치)",
      "explanation": "단계별 해설"
    }
  ]
}`;

        const userPrompt = `다음 조건으로 총 ${count}개의 수학 문제를 생성해줘.
학년: ${userGradeLevel}
난이도: ${level}
주제 목록: ${topicList.join(', ')}
총 문제 수: ${count}개 (주제별로 고르게 배분)
반드시 모든 문제에 4개의 보기(options)를 포함할 것.`;

        const client = getOpenAIClient();

        const response = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.6,
        });

        const content = response.choices[0].message.content || '{}';
        const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(cleaned);
        const problems = data.problems || [];

        if (problems.length === 0) {
            return NextResponse.json({ error: 'GPT가 문제를 생성하지 못했습니다.' }, { status: 500 });
        }

        return NextResponse.json(problems);
    } catch (error: any) {
        console.error('[Generate API Error]:', error);

        if (error?.status === 401 || error?.message?.includes('authentication')) {
            return NextResponse.json({ error: 'OpenAI API 키가 유효하지 않습니다.' }, { status: 401 });
        }
        if (error?.status === 429) {
            return NextResponse.json({ error: 'OpenAI API 사용량 초과입니다.' }, { status: 429 });
        }
        return NextResponse.json({ error: error.message || '문제 생성 실패' }, { status: 500 });
    }
}
