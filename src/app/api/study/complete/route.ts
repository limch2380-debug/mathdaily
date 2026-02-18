import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, date, score, totalCount, level } = body;

        if (!userId || !date || score === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 세션 저장
        const { rows } = await sql`
      INSERT INTO study_sessions (user_id, date, score, total_count, level)
      VALUES (${userId}, ${date}, ${score}, ${totalCount}, ${level})
      RETURNING *
    `;

        // TODO: 오답 노트(problem_logs) 저장은 추후 구현 (Phase 3)

        return NextResponse.json(rows[0]);
    } catch (error) {
        console.error('Session save error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
