import { ProblemData, SchoolLevel, DifficultyLevel, UserSettings } from './types';

// 문제 생성 템플릿 인터페이스
interface ProblemTemplate {
    topic: string;
    type: string;
    generator: () => { question: string; answer: string; options?: string[] };
}

// 난수 생성 헬퍼
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// 상첨자 변환 헬퍼
const toSuperscript = (n: number | string): string => {
    const superMap: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
    return String(n).split('').map(c => superMap[c] || c).join('');
};

// 수학 기호 정리 (^ → 상첨자, * → ×)
const cleanMathText = (text: string): string => {
    // x^2 → x², 2^3 → 2³ 등
    let cleaned = text.replace(/(\w)\^(\d+)/g, (_match, base, exp) => base + toSuperscript(exp));
    // 곱셈 기호 정리 (수식 내 * → ×)
    cleaned = cleaned.replace(/\*/g, '×');
    return cleaned;
};

// 객관식 보기 자동 생성 (정답 + 오답 3개)
const generateOptions = (correctAnswer: string): string[] => {
    const num = parseFloat(correctAnswer);
    const options: string[] = [correctAnswer];

    if (!isNaN(num) && Number.isFinite(num)) {
        // 숫자형 정답: 근처 값으로 오답 생성
        const offsets = new Set<number>();
        while (offsets.size < 3) {
            let offset: number;
            if (Number.isInteger(num)) {
                // 정수: ±1~5 범위
                offset = randomInt(1, Math.max(3, Math.abs(Math.round(num * 0.3)) || 3));
                if (Math.random() > 0.5) offset = -offset;
            } else {
                // 소수: ±0.1~1.0 범위
                offset = (randomInt(1, 10) / 10) * (Math.random() > 0.5 ? 1 : -1);
            }
            if (offset !== 0 && !offsets.has(offset)) {
                offsets.add(offset);
            }
        }
        offsets.forEach(off => {
            const wrong = Number.isInteger(num) ? (num + off).toString() : (num + off).toFixed(1);
            options.push(wrong);
        });
    } else {
        // 문자열 정답: 간단한 대체 오답 생성
        options.push(correctAnswer + '1', correctAnswer + '0', '없음');
    }

    // 셔플
    for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
    }
    return options;
};

// ==========================================
// 초등학교 문제 (1~6학년)
// ==========================================
const ELEMENTARY_PROBLEMS: Record<number, Record<DifficultyLevel, ProblemTemplate[]>> = {
    1: { // 초1
        easy: [
            {
                topic: '덧셈(한자리)', type: 'short', generator: () => {
                    const a = randomInt(1, 9); const b = randomInt(1, 9);
                    return { question: `${a} + ${b} = ?`, answer: (a + b).toString() };
                }
            },
            {
                topic: '뺄셈(한자리)', type: 'short', generator: () => {
                    const a = randomInt(5, 9); const b = randomInt(1, a);
                    return { question: `${a} - ${b} = ?`, answer: (a - b).toString() };
                }
            }
        ],
        medium: [
            {
                topic: '덧셈(두자리)', type: 'short', generator: () => {
                    const a = randomInt(10, 50); const b = randomInt(1, 9);
                    return { question: `${a} + ${b} = ?`, answer: (a + b).toString() };
                }
            }
        ],
        hard: [
            {
                topic: '문장제', type: 'short', generator: () => {
                    const a = randomInt(2, 5); const b = randomInt(2, 5);
                    return { question: `사과가 ${a}개, 귤이 ${b}개 있습니다. 과일은 모두 몇 개인가요?`, answer: (a + b).toString() };
                }
            }
        ]
    },
    2: { // 초2
        easy: [
            {
                topic: '곱셈구구', type: 'short', generator: () => {
                    const a = randomInt(2, 5); const b = randomInt(1, 9);
                    return { question: `${a} × ${b} = ?`, answer: (a * b).toString() };
                }
            }
        ],
        medium: [
            {
                topic: '세 자리 수', type: 'short', generator: () => {
                    const a = randomInt(100, 500); const b = randomInt(10, 99);
                    return { question: `${a} + ${b} = ?`, answer: (a + b).toString() };
                }
            }
        ],
        hard: [
            {
                topic: '길이 재기', type: 'short', generator: () => {
                    return { question: `1m 20cm는 몇 cm인가요?`, answer: '120' };
                }
            }
        ]
    },
    // ... 3~5학년 생략 (패턴 반복)
    6: { // 초6 (예시)
        easy: [
            {
                topic: '분수 나눗셈', type: 'short', generator: () => {
                    return { question: `3 ÷ 1/2 = ?`, answer: '6' };
                }
            }
        ],
        medium: [
            {
                topic: '소수', type: 'short', generator: () => {
                    return { question: `1.2 × 0.5 = ?`, answer: '0.6' };
                }
            }
        ],
        hard: [
            {
                topic: '비와 비율', type: 'short', generator: () => {
                    return { question: `소금 20g, 물 80g인 소금물의 농도는 몇 %인가요?`, answer: '20' };
                }
            }
        ]
    }
};

// ==========================================
// 중학교 문제 (1~3학년)
// ==========================================
const MIDDLE_PROBLEMS: Record<number, Record<DifficultyLevel, ProblemTemplate[]>> = {
    1: { // 중1
        easy: [
            {
                topic: '소인수분해', type: 'short', generator: () => {
                    return { question: `12를 소인수분해하면?`, answer: '2²×3' };
                }
            },
            {
                topic: '정수와 유리수', type: 'short', generator: () => {
                    const a = randomInt(2, 9); const b = randomInt(2, 9);
                    return { question: `(-${a}) × (+${b}) = ?`, answer: ((-a) * b).toString() };
                }
            }
        ],
        medium: [
            {
                topic: '일차방정식', type: 'short', generator: () => {
                    const x = randomInt(2, 9);
                    const b = randomInt(1, 10);
                    return { question: `2x - ${b} = ${2 * x - b} 일 때, x의 값은?`, answer: x.toString() };
                }
            }
        ],
        hard: [
            {
                topic: '좌표평면', type: 'short', generator: () => {
                    return { question: `점 A(-2, 3)은 제 몇 사분면 위의 점인가요? (숫자만)`, answer: '2' };
                }
            }
        ]
    },
    2: { // 중2
        easy: [
            {
                topic: '식의 계산', type: 'short', generator: () => {
                    const a = randomInt(2, 5);
                    const b = randomInt(2, 5);
                    return { question: `${a}a + ${b}a = ?`, answer: `${a + b}a` };
                }
            }
        ],
        medium: [
            {
                topic: '연립방정식', type: 'short', generator: () => {
                    const x = randomInt(2, 9);
                    const y = randomInt(1, x - 1); // x > y 보장
                    const sum = x + y;
                    const diff = x - y;
                    return { question: `x + y = ${sum}, x - y = ${diff} 일 때 x는?`, answer: x.toString() };
                }
            }
        ],
        hard: [
            {
                topic: '부등식', type: 'short', generator: () => {
                    const a = randomInt(2, 5);
                    const limit = randomInt(10, 20); // 2x < 14 -> x < 7 -> ans 6
                    // a*x < limit -> x < limit/a. max int is floor((limit-epsilon)/a)
                    // 단순하게 a*x < a*k + 1 형태로 제작
                    const k = randomInt(3, 8);
                    const rhs = a * k + randomInt(1, a - 1); // a*k < rhs < a*(k+1)
                    return { question: `${a}x < ${rhs} 을 만족하는 가장 큰 정수는?`, answer: k.toString() };
                }
            }
        ]
    },
    3: { // 중3
        easy: [
            {
                topic: '제곱근', type: 'short', generator: () => {
                    return { question: '√16 + √9 = ?', answer: '7' };
                }
            }
        ],
        medium: [
            {
                topic: '이차방정식', type: 'short', generator: () => {
                    return { question: 'x² - 5x + 6 = 0 의 해 중 작은 수는?', answer: '2' };
                }
            }
        ],
        hard: [
            {
                topic: '삼각비', type: 'short', generator: () => {
                    return { question: `sin 30° + cos 60° = ? (소수로)`, answer: '1' };
                }
            }
        ]
    }
};

// ==========================================
// 고등학교 문제 (1~3학년)
// ==========================================
const HIGH_PROBLEMS: Record<number, Record<DifficultyLevel, ProblemTemplate[]>> = {
    1: { // 고1 (공통수학)
        easy: [
            {
                topic: '다항식', type: 'short', generator: () => {
                    return { question: '(x+1)(x-1)을 전개하면?', answer: 'x²-1' };
                }
            }
        ],
        medium: [
            {
                topic: '복소수', type: 'short', generator: () => {
                    return { question: 'i² = ?', answer: '-1' };
                }
            }
        ],
        hard: [
            {
                topic: '원과 직선', type: 'short', generator: () => {
                    return { question: '원 x²+y²=1 과 직선 y=x 의 교점의 개수는?', answer: '2' };
                }
            }
        ]
    },
    2: { // 고2 (수I, 수II)
        easy: [
            {
                topic: '지수', type: 'short', generator: () => {
                    return { question: '2³ × 2² = 2의 몇 승?', answer: '5' };
                }
            }
        ],
        medium: [
            {
                topic: '미분', type: 'short', generator: () => {
                    return { question: 'f(x) = x² 일 때 f\'(3) = ?', answer: '6' };
                }
            }
        ],
        hard: [
            {
                topic: '수열', type: 'short', generator: () => {
                    return { question: `첫째항 1, 공비 2인 등비수열의 5번째 항은?`, answer: '16' };
                }
            }
        ]
    },
    3: { // 고3 (미적분/확통)
        easy: [
            {
                topic: '극한', type: 'short', generator: () => {
                    const a = randomInt(1, 10);
                    const n = randomInt(1, 3);
                    return { question: `lim(x→∞) ${a}/x${toSuperscript(n)} = ?`, answer: '0' };
                }
            },
            {
                topic: '수열의 극한', type: 'short', generator: () => {
                    const a = randomInt(2, 5);
                    const b = randomInt(1, 9);
                    return { question: `lim(n→∞) (${a}n + ${b}) / n = ?`, answer: a.toString() };
                }
            }
        ],
        medium: [
            {
                topic: '확률', type: 'short', generator: () => {
                    const coin = randomInt(2, 4);
                    // 2개: 1/4, 3개: 1/8, 4개: 1/16
                    return { question: `동전 ${coin}개를 던져 모두 앞면이 나올 확률은? (분수, 예: 1/${Math.pow(2, coin)})`, answer: `1/${Math.pow(2, coin)}` };
                }
            },
            {
                topic: '통계', type: 'short', generator: () => {
                    const m = randomInt(50, 70);
                    const s = randomInt(2, 5);
                    return { question: `평균 ${m}, 표준편차 ${s}인 정규분포에서 평균일 때 Z값은?`, answer: '0' };
                }
            },
            {
                topic: '미분계수', type: 'short', generator: () => {
                    const a = randomInt(2, 5); // x^2 계수
                    const x = randomInt(1, 3);
                    // f(x) = ax² -> f'(x) = 2ax -> f'(x_val) = 2*a*x_val
                    return { question: `f(x) = ${a}x² 일 때 x=${x}에서의 미분계수는?`, answer: (2 * a * x).toString() };
                }
            }
        ],
        hard: [
            {
                topic: '적분', type: 'short', generator: () => {
                    const a = randomInt(2, 5);
                    // int(0 to 1) 3ax² dx = [ax³]0to1 = a
                    return { question: `∫(0 to 1) ${a * 3}x² dx = ?`, answer: a.toString() };
                }
            },
            {
                topic: '여러가지 미분법', type: 'short', generator: () => {
                    return { question: `y = ln(x) 일 때, x=e 에서의 미분계수는? (예: 1/e)`, answer: '1/e' };
                }
            },
            {
                topic: '부분적분', type: 'short', generator: () => {
                    return { question: `∫ x e^x dx = (x-1)e^x + C. 그렇다면 ∫(0 to 1) x e^x dx 의 값은?`, answer: '1' };
                }
            }
        ]
    }
};

// ============================================
// 문제 생성 함수
// ============================================

const getProblemsForLevel = (school: SchoolLevel, grade: number): Record<DifficultyLevel, ProblemTemplate[]> | undefined => {
    if (school === 'elementary') return ELEMENTARY_PROBLEMS[grade] || ELEMENTARY_PROBLEMS[1];
    if (school === 'middle') return MIDDLE_PROBLEMS[grade] || MIDDLE_PROBLEMS[1];
    if (school === 'high') return HIGH_PROBLEMS[grade] || HIGH_PROBLEMS[1];
    return undefined;
};

export const generateMathProblems = (settings: UserSettings, count: number = 10): ProblemData[] => {
    const problems: ProblemData[] = [];
    const levelProblems = getProblemsForLevel(settings.schoolLevel, settings.grade);

    if (!levelProblems) {
        // 기본값 (에러 방지)
        return [{ question: 'Error', answer: '0', topic: 'Error', type: 'short', difficulty: 'easy' }];
    }

    // 선택된 난이도 위주로 구성하되, 쉬운/어려운 문제 섞기
    // easy: easy 7 + medium 3
    // medium: easy 2 + medium 6 + hard 2
    // hard: medium 3 + hard 7

    let targetMix: DifficultyLevel[] = [];
    if (settings.difficulty === 'easy') {
        targetMix = [...Array(7).fill('easy'), ...Array(3).fill('medium')];
    } else if (settings.difficulty === 'medium') {
        targetMix = [...Array(2).fill('easy'), ...Array(6).fill('medium'), ...Array(2).fill('hard')];
    } else {
        targetMix = [...Array(3).fill('medium'), ...Array(7).fill('hard')];
    }

    // 데이터 부족할 경우 대비해 safe access
    const getTemplate = (diff: DifficultyLevel) => {
        let temps = levelProblems[diff];
        if (!temps || temps.length === 0) {
            // 대체 난이도 찾기
            temps = levelProblems['medium'] || levelProblems['easy'] || levelProblems['hard'];
        }
        if (!temps || temps.length === 0) return null;
        return temps[randomInt(0, temps.length - 1)];
    };

    for (let i = 0; i < count; i++) {
        const targetDiff = targetMix[i % targetMix.length];
        const template = getTemplate(targetDiff);

        if (template) {
            const p = template.generator();
            const question = cleanMathText(p.question);
            const answer = cleanMathText(p.answer);
            const options = p.options || generateOptions(answer);
            problems.push({
                question,
                answer,
                topic: template.topic,
                type: template.type,
                difficulty: targetDiff,
                options,
            });
        }
    }

    return problems;
};
