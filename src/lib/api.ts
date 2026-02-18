import { ProblemData, Chapter } from './types';

// Backend API address detection
const getApiBaseUrl = () => {
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        // If accessed via IP or other hostname, point to port 8000 on that same host
        const url = `${protocol}//${hostname}:8000`;
        return url;
    }
    return 'http://localhost:8000';
};

// 커리큘럼 조회 API
export async function fetchCurriculum(schoolLevel: string, grade: number): Promise<Chapter[]> {
    try {
        const url = `${getApiBaseUrl()}/api/curriculum/${schoolLevel}/${grade}`;
        console.log(`📡 Fetching Curriculum: ${url}`);

        const response = await fetch(url);

        if (!response.ok) {
            console.error(`❌ Fetch Failed: ${response.status} ${response.statusText}`);
            return [];
        }

        const data = await response.json();
        console.log(`✅ Curriculum Data Correctly Fetched: ${data.length} items`);

        if (data.length === 0) {
            console.warn(`⚠️ Warning: No curriculum data found for ${schoolLevel} grade ${grade}`);
        }

        return data;
    } catch (e) {
        console.error("🔥 Curriculum Fetch Exception:", e);
        return [];
    }
}

// AI 학습지 생성 API (단원 선택 지원)
export async function fetchAIWorksheet(userId: string, count: number = 10, unitId?: number, schoolLevel?: string, grade?: number): Promise<ProblemData[]> {
    try {
        // AI 호출 전 로그 추가
        console.log(`🚀 Requesting AI Worksheet: ${userId}, level=${schoolLevel} ${grade}, count=${count}, unitId=${unitId}`);

        const response = await fetch(`${getApiBaseUrl()}/api/daily-worksheet/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId,
                count,
                unitId, // 단원 선택 시 전달 (집중 훈련)
                schoolLevel,
                grade
            }),
        });

        console.log(`✅ Backend Response Status: ${response.status} ${response.statusText}`);

        // 에러 상태 코드 처리 (과금, 인증 등)
        if (!response.ok) {
            if (response.status === 429) throw new Error("QUOTA_EXCEEDED");
            if (response.status === 401) throw new Error("AUTH_ERROR");

            // 500 에러 등의 경우 백엔드 에러 메시지도 확인
            let errorDetail = "";
            try {
                const errorData = await response.json();
                errorDetail = JSON.stringify(errorData);
            } catch (e) { }

            throw new Error(`Failed to fetch AI worksheet: ${response.statusText} (${errorDetail})`);
        }

        const data = await response.json();

        // 데이터가 비었는지 확인
        if (!data || data.length === 0) {
            console.warn("⚠️ AI returned empty problem list. Falling back to local generation required.");
            return [];
        }

        console.log(`✅ Received ${data.length} AI-generated problems.`);

        // API 응답을 ProblemData 형식으로 변환 (숫자형 난이도를 문자열로)
        return data.map((p: any) => ({
            question: p.question,
            answer: p.answer,
            topic: p.topic,
            type: p.type,
            difficulty: p.difficulty === 3 ? 'hard' : p.difficulty === 2 ? 'medium' : 'easy',
            options: p.options,
            explanation: p.explanation,
        }));
    } catch (error: any) {
        console.error('🔥 AI API Fatal Error:', error);
        // 치명적 에러는 상위로 전파하여 UI 표시
        if (error.message === "QUOTA_EXCEEDED" || error.message === "AUTH_ERROR") {
            throw error;
        }
        // 그 외 일반 에러(타임아웃, 서버 오류 등)는 빈 배열 반환 -> 로컬 백업 사용
        return [];
    }
}
