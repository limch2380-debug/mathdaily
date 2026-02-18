import { ProblemData, Chapter } from './types';

// ============================================
// API 엔드포인트 자동 감지
// Vercel 배포: /api/generate (Next.js API Route)
// 로컬 개발: Python 백엔드 (port 8000)
// ============================================
const isVercelOrProduction = () => {
    if (typeof window === 'undefined') return false;
    const hostname = window.location.hostname;
    // localhost 이면 로컬, 아니면 Vercel/배포 환경
    return hostname !== 'localhost' && hostname !== '127.0.0.1';
};

const getApiBaseUrl = () => {
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        const url = `${protocol}//${hostname}:8000`;
        return url;
    }
    return 'http://localhost:8000';
};

// 커리큘럼 조회 API (Python 백엔드 전용 — 로컬에서만 작동)
export async function fetchCurriculum(schoolLevel: string, grade: number): Promise<Chapter[]> {
    try {
        // Vercel에서는 커리큘럼 API 없음 → 빈 배열 반환
        if (isVercelOrProduction()) {
            console.log('📡 Vercel 환경: 커리큘럼 API 미지원, 빈 배열 반환');
            return [];
        }

        const url = `${getApiBaseUrl()}/api/curriculum/${schoolLevel}/${grade}`;
        console.log(`📡 Fetching Curriculum: ${url}`);

        const response = await fetch(url);

        if (!response.ok) {
            console.error(`❌ Fetch Failed: ${response.status} ${response.statusText}`);
            return [];
        }

        const data = await response.json();
        console.log(`✅ Curriculum Data Correctly Fetched: ${data.length} items`);

        return data;
    } catch (e) {
        console.error("🔥 Curriculum Fetch Exception:", e);
        return [];
    }
}

// ============================================
// AI 학습지 생성 API
// Vercel: /api/generate (Next.js API Route)
// 로컬:  Python 백엔드 /api/daily-worksheet/generate
// ============================================
export async function fetchAIWorksheet(
    userId: string,
    count: number = 10,
    unitId?: number,
    schoolLevel?: string,
    grade?: number
): Promise<ProblemData[]> {
    const useVercelApi = isVercelOrProduction();

    try {
        console.log(`🚀 Requesting AI Worksheet: ${userId}, level=${schoolLevel} ${grade}, count=${count}, unitId=${unitId}`);
        console.log(`📡 Using ${useVercelApi ? 'Vercel /api/generate' : 'Python backend'}`);

        let response: Response;

        if (useVercelApi) {
            // ★ Vercel: Next.js API Route 사용
            response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    count,
                    unitId,
                    schoolLevel: schoolLevel || 'elementary',
                    grade: grade || 3,
                }),
            });
        } else {
            // ★ 로컬: Python 백엔드 사용
            response = await fetch(`${getApiBaseUrl()}/api/daily-worksheet/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, count, unitId, schoolLevel, grade }),
            });
        }

        console.log(`✅ Backend Response Status: ${response.status} ${response.statusText}`);

        // 에러 상태 코드 처리
        if (!response.ok) {
            // 상세 에러 로깅 (F12 콘솔에서 확인 가능)
            let errorDetail = '';
            try {
                const errorData = await response.json();
                errorDetail = JSON.stringify(errorData);
                console.error(`❌ API Error Detail: ${errorDetail}`);
            } catch { /* 무시 */ }

            if (response.status === 401) {
                console.error('❌ 401 Unauthorized — API 키가 잘못되었거나 만료되었습니다.');
                throw new Error('AUTH_ERROR');
            }
            if (response.status === 429) {
                console.error('❌ 429 Rate Limit — API 사용량이 초과되었습니다.');
                throw new Error('QUOTA_EXCEEDED');
            }
            if (response.status === 404) {
                console.error('❌ 404 Not Found — API 엔드포인트를 찾을 수 없습니다.');
            }

            throw new Error(`Failed to fetch AI worksheet: ${response.status} ${response.statusText} (${errorDetail})`);
        }

        const data = await response.json();

        if (!data || data.length === 0) {
            console.warn('⚠️ AI returned empty problem list.');
            return [];
        }

        console.log(`✅ Received ${data.length} AI-generated problems.`);

        // API 응답을 ProblemData 형식으로 변환
        return data.map((p: any) => ({
            question: p.question,
            answer: p.answer,
            topic: p.topic,
            type: p.type,
            difficulty: typeof p.difficulty === 'number'
                ? (p.difficulty === 3 ? 'hard' : p.difficulty === 2 ? 'medium' : 'easy')
                : p.difficulty,
            options: p.options,
            explanation: p.explanation,
            svg: p.svg,
        }));
    } catch (error: any) {
        console.error('🔥 AI API Fatal Error:', error);

        if (error.message === 'QUOTA_EXCEEDED' || error.message === 'AUTH_ERROR') {
            throw error;
        }
        return [];
    }
}
