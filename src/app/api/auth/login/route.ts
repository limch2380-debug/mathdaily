import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name } = body;

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        // 1. 기존 유저 확인
        const { rows } = await sql`SELECT * FROM users WHERE name = ${name} LIMIT 1`;

        if (rows.length > 0) {
            return NextResponse.json(rows[0]);
        }

        // 2. 없으면 신규 생성
        // gen_random_uuid()는 Postgres 13+ 내장 함수
        const { rows: newRows } = await sql`
      INSERT INTO users (id, name) 
      VALUES (gen_random_uuid(), ${name}) 
      RETURNING *
    `;

        return NextResponse.json(newRows[0]);
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
