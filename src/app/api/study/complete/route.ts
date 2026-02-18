import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, date, score, totalCount, level } = body;

        if (!userId || !date || score === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 세션 저장
        const { rows } = await pool.query(
            `INSERT INTO study_sessions (user_id, date, score, total_count, level)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
            [userId, date, score, totalCount, level]
        );

        return NextResponse.json(rows[0]);
    } catch (error) {
        console.error('Session save error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
