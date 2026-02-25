import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    try {
        // 1. 최근 학습 세션 (30일치)
        const { rows: sessions } = await db.query(
            `SELECT * FROM study_sessions 
       WHERE user_id = $1 
       AND date >= NOW() - INTERVAL '30 days'
       ORDER BY date DESC`,
            [userId]
        );

        // 2. 로그 데이터 가져오기 (취약/강점 분석용)
        const { rows: logs } = await db.query(
            `SELECT pl.topic, pl.is_correct
             FROM problem_logs pl
             JOIN study_sessions ss ON pl.session_id = ss.id
             WHERE ss.user_id = $1 
             AND ss.date >= NOW() - INTERVAL '30 days'`,
            [userId]
        );

        // 주제별 정답률 계산
        const topicStats: Record<string, { correct: number; total: number }> = {};
        logs.forEach((log: any) => {
            const topic = log.topic;
            if (!topicStats[topic]) topicStats[topic] = { correct: 0, total: 0 };
            topicStats[topic].total++;
            if (log.is_correct) topicStats[topic].correct++;
        });

        const analyzedTopics = Object.entries(topicStats).map(([topic, stat]) => ({
            topic,
            accuracy: (stat.correct / stat.total) * 100
        })).sort((a, b) => a.accuracy - b.accuracy);

        const weakPoints = analyzedTopics.filter(t => t.accuracy < 60).slice(0, 3).map(t => t.topic);
        const strongPoints = analyzedTopics.filter(t => t.accuracy >= 80).reverse().slice(0, 3).map(t => t.topic);

        // 총 학습일 (유니크한 날짜 수)
        const uniqueDays = new Set(sessions.map((s: any) => new Date(s.date).toDateString())).size;

        // 오늘의 평균 점수
        const todayStr = new Date().toDateString();
        const todaySessions = sessions.filter((s: any) => new Date(s.date).toDateString() === todayStr);
        const todayAvgScore = todaySessions.length > 0
            ? Math.round(todaySessions.reduce((sum: number, s: any) => sum + s.score, 0) / todaySessions.length)
            : 0;

        const recent5 = sessions.slice(0, 5);
        const recentAvg = recent5.length > 0
            ? Math.round(recent5.reduce((sum: number, s: any) => sum + (s.score || 0), 0) / recent5.length)
            : 0;

        let suggestedLevel = 'medium';
        if (recentAvg >= 80) suggestedLevel = 'hard';
        else if (recentAvg < 50) suggestedLevel = 'easy';

        return NextResponse.json({
            sessions,
            stats: {
                totalDays: uniqueDays,
                avgScore: recentAvg,
                todayScore: todayAvgScore,
                currentLevel: suggestedLevel,
                weakPoints: weakPoints.length > 0 ? weakPoints : ['데이터 부족'],
                strongPoints: strongPoints.length > 0 ? strongPoints : ['데이터 부족']
            }
        });
    } catch (error) {
        console.error('Dashboard API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
