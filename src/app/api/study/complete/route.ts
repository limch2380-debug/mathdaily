import { NextRequest, NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface ProblemLog {
    topic: string;
    isCorrect: boolean;
    timeSpent?: number;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, date, score, totalCount, level, logs } = body;

        if (!userId || !date || score === undefined || !totalCount) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        await initializeDatabase();

        // 1. 학습 세션 저장
        const { rows: sessionRows } = await db.query(
            `INSERT INTO study_sessions (user_id, date, score, total_count, level)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
            [userId, date, score, totalCount, level || 'medium']
        );
        const session = sessionRows[0];

        // 2. 문제 로그 저장
        if (logs && Array.isArray(logs) && logs.length > 0) {
            for (const log of logs as ProblemLog[]) {
                await db.query(
                    `INSERT INTO problem_logs (session_id, topic, is_correct, time_spent)
           VALUES ($1, $2, $3, $4)`,
                    [session.id, log.topic, log.isCorrect, log.timeSpent || 0]
                );
            }
        }

        return NextResponse.json({ success: true, session });
    } catch (error: any) {
        console.error('Study complete API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
