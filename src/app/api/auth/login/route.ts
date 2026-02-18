import { NextResponse } from 'next/server';
import { db, initializeDatabase } from '../../../../lib/db';

export async function POST(request: Request) {
  try {
    const { name } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: '이름을 입력해야 합니다.' }, { status: 400 });
    }

    // 1. 테이블 자동 생성 (매번 체크하여 안전하게 유지)
    await initializeDatabase();

    // 2. 사용자 확인 및 생성 (UUID 사용)
    const trimmedName = name.trim();
    let { rows } = await db.query('SELECT * FROM users WHERE name = $1 LIMIT 1', [trimmedName]);

    if (rows.length === 0) {
      const newUser = await db.query(
        'INSERT INTO users (id, name) VALUES (gen_random_uuid(), $1) RETURNING *',
        [trimmedName]
      );
      rows = newUser.rows;
    }

    return NextResponse.json(rows[0]);
  } catch (error: any) {
    console.error('[SERVER ERROR]:', error);
    return NextResponse.json({
      error: '데이터베이스 연결 실패 혹은 서버 오류가 발생했습니다.',
      details: error.message
    }, { status: 500 });
  }
}