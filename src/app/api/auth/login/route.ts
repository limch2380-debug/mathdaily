import { NextRequest, NextResponse } from 'next/server';
import pool, { initializeDatabase } from '@/lib/db'; // Added initializeDatabase import

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name } = body;

        if (!name || name.trim().length === 0) {
            return NextResponse.json({ error: '이름을 입력해야 합니다.' }, { status: 400 });
        }

        // 1. DB 초기화 (테이블 자동 생성)
        try {
            await initializeDatabase();
        } catch (initError: any) {
            console.error('[CRITICAL] DB Initialization Failed:', initError);
            return NextResponse.json({
                error: '데이터베이스 초기화에 실패했습니다. DATABASE_URL 설정을 확인해주세요.',
                details: initError.message
            }, { status: 500 });
        }

        // 2. 유저 확인 및 처리
        try {
            const { rows } = await pool.query('SELECT * FROM users WHERE name = $1 LIMIT 1', [name.trim()]);

            if (rows.length > 0) {
                return NextResponse.json(rows[0]);
            }

            const { rows: newRows } = await pool.query(
                `INSERT INTO users (id, name) VALUES (gen_random_uuid(), $1) RETURNING *`,
                [name.trim()]
            );

            return NextResponse.json(newRows[0]);
        } catch (dbError: any) {
            console.error('[DB Error] Login query failed:', dbError);
            return NextResponse.json({
                error: `데이터베이스 쿼리 오류: ${dbError.message}`,
                details: { code: dbError.code, detail: dbError.detail }
            }, { status: 500 });
        }
    } catch (error: any) {
        console.error('[Login API] Unexpected error occurred:', error);
        return NextResponse.json({
            error: `서버 내부 오류: ${error.message}`,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
