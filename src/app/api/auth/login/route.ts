import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { name } = await request.json();

    // 1. 필수 테이블 자동 생성 로직 (그릇 만들기)
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. 사용자 확인 및 생성
    let user = await db.query('SELECT * FROM users WHERE name = $1', [name]);
    
    if (user.rows.length === 0) {
      const newUser = await db.query(
        'INSERT INTO users (name) VALUES ($1) RETURNING *',
        [name]
      );
      user = newUser;
    }

    return NextResponse.json(user.rows[0]);
  } catch (error: any) {
    console.error('[SERVER ERROR]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}