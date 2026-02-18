import { NextResponse } from 'next/server';
import { db, initializeDatabase } from '../../../../lib/db';

export async function POST(request: Request) {
  try {
    const { name } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: '이름을 입력해야 합니다.' }, { status: 400 });
    }

    // 1. DB 초기화 시도
    try {
      await initializeDatabase();
    } catch (initError: any) {
      console.error('[CRITICAL] DB Initialization Failed:', initError);
      return NextResponse.json({
        error: `DB 초기화 실패: ${initError.message}`,
        suggestion: 'Vercel 프로젝트 설정에서 DATABASE_URL 또는 POSTGRES_URL 환경 변수가 제대로 등록되었는지 확인해주세요.'
      }, { status: 500 });
    }

    // 2. 유저 처리
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
    return NextResponse.json({ error: `서버 내부 오류: ${error.message}` }, { status: 500 });
  }
}