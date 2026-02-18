import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    try {
        // 1. 최근 학습 세션 (30일치)
        const { rows: sessions } = await pool.query(
            `SELECT * FROM study_sessions 
       WHERE user_id = $1 
       AND date >= NOW() - INTERVAL '30 days'
       ORDER BY date DESC`,
            [userId]
        );

        // 2. 최근 5회 평균 점수 및 레벨 산출
        const recent5 = sessions.slice(0, 5);
        const avgScore = recent5.length > 0
            ? recent5.reduce((sum: number, s: any) => sum + (s.score || 0), 0) / recent5.length
            : 0;

        // 레벨 로직: 80점 이상=hard, 50점 미만=easy, 그외=medium
        let suggestedLevel = 'medium';
        if (avgScore >= 80) suggestedLevel = 'hard';
        else if (avgScore < 50) suggestedLevel = 'easy';

        // 3. 취약 포인트 (임시)
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
