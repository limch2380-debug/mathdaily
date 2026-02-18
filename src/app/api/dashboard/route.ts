import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    try {
        // 1. 최근 학습 세션 (30일치)
        const { rows: sessions } = await sql`
      SELECT * FROM study_sessions 
      WHERE user_id = ${userId} 
      AND date >= NOW() - INTERVAL '30 days'
      ORDER BY date DESC
    `;

        // 2. 최근 5회 평균 점수 및 레벨 산출
        const recent5 = sessions.slice(0, 5);
        const avgScore = recent5.length > 0
            ? recent5.reduce((sum, s) => sum + (s.score || 0), 0) / recent5.length
            : 0;

        // 레벨 로직: 80점 이상=hard, 50점 미만=easy, 그외=medium
        let suggestedLevel = 'medium';
        if (avgScore >= 80) suggestedLevel = 'hard';
        else if (avgScore < 50) suggestedLevel = 'easy';

        // 3. 취약 포인트 (오답 노트가 아직 없으므로 임시 로직)
        // 추후 problem_logs 테이블 연동 시 실제 데이터 사용
        const weakPoints = ['분수', '도형'];

        return NextResponse.json({
            sessions,
            stats: {
                totalDays: sessions.length,
                avgScore: Math.round(avgScore),
                currentLevel: suggestedLevel,
                weakPoints
            }
        });
    } catch (error) {
        console.error('Dashboard API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
