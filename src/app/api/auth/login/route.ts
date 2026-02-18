import { NextResponse } from 'next/server';
import { db, initializeDatabase } from '../../../../lib/db';

export async function POST(request: Request) {
  console.log('[Login API] POST request received');

  try {
    const body = await request.json().catch(() => ({}));
    const { name } = body;

    // 환경 변수 체크 (디버깅용 로그)
    const envStatus = {
      POSTGRES_URL: !!process.env.POSTGRES_URL,
      DATABASE_URL: !!process.env.DATABASE_URL,
      NODE_ENV: process.env.NODE_ENV
    };
    console.log('[Login API] Env Status:', envStatus);

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: '이름을 입력해야 합니다.' }, { status: 400 });
    }

    // 1. DB 초기화
    try {
      await initializeDatabase();
    } catch (err: any) {
      console.error('[DB Init Error]:', err);
      return NextResponse.json({
        error: `DB 연결 실패: ${err.message}`,
        debug: envStatus
      }, { status: 500 });
    }

    // 2. 유저 처리
    const trimmedName = name.trim();
    try {
      const result = await db.query('SELECT * FROM users WHERE name = $1 LIMIT 1', [trimmedName]);
      let userRows = result.rows;

      if (userRows.length === 0) {
        // ID는 DB의 DEFAULT gen_random_uuid()에 맡깁니다.
        const newUser = await db.query(
          'INSERT INTO users (name) VALUES ($1) RETURNING *',
          [trimmedName]
        );
        userRows = newUser.rows;
      }
      return NextResponse.json(userRows[0]);
    } catch (queryErr: any) {
      console.error('[DB Query Error]:', queryErr);
      return NextResponse.json({
        error: `DB 쿼리 오류: ${queryErr.message}`,
        details: queryErr.message
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[Fatal Error]:', error);
    return NextResponse.json({ error: `치명적 오류: ${error.message}` }, { status: 500 });
  }
}