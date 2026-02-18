import { NextResponse } from 'next/server';
import { db, initializeDatabase } from '../../../../lib/db';

export async function POST(request: Request) {
  try {
    const { name } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: '이름을 입력해야 합니다.' }, { status: 400 });
    }

    // 1. DB 초기화
    try {
      await initializeDatabase();
    } catch (err: any) {
      return NextResponse.json({
        error: `DB 연결 실패: ${err.message}`,
        details: "Vercel Settings에서 DATABASE_URL이 정확한지 다시 확인해주세요."
      }, { status: 500 });
    }

    // 2. 유저 처리
    const trimmedName = name.trim();
    let rows;
    try {
      const result = await db.query('SELECT * FROM users WHERE name = $1 LIMIT 1', [trimmedName]);
      rows = result.rows;

      if (rows.length === 0) {
        const newUser = await db.query(
          'INSERT INTO users (id, name) VALUES (gen_random_uuid(), $1) RETURNING *',
          [trimmedName]
        );
        rows = newUser.rows;
      }
    } catch (queryErr: any) {
      return NextResponse.json({ error: `DB 쿼리 오류: ${queryErr.message}` }, { status: 500 });
    }

    return NextResponse.json(rows[0]);
  } catch (error: any) {
    return NextResponse.json({ error: `치명적 오류: ${error.message}` }, { status: 500 });
  }
}