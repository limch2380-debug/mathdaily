import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db'; // Updated import

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name } = body;

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        // 1. 기존 유저 확인
        const { rows } = await pool.query('SELECT * FROM users WHERE name = $1 LIMIT 1', [name]);

        if (rows.length > 0) {
            return NextResponse.json(rows[0]);
        }

        // 2. 없으면 신규 생성
        // gen_random_uuid()는 Postgres 13+ 내장 함수. 
        // 매개변수화된 쿼리($1) 사용
        const { rows: newRows } = await pool.query(
            `INSERT INTO users (id, name) VALUES (gen_random_uuid(), $1) RETURNING *`,
            [name]
        );

        return NextResponse.json(newRows[0]);
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
