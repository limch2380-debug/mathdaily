import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db'; // Updated import

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name } = body;

        if (!name || name.trim().length === 0) {
            return NextResponse.json({ error: '이름을 입력해야 합니다.' }, { status: 400 });
        }

        // 1. 기존 유저 확인
        // DB 연결 또는 쿼리 오류 시 상세 내용을 클라이언트에 전달하기 위해 try-catch 범위 조절
        try {
            const { rows } = await pool.query('SELECT * FROM users WHERE name = $1 LIMIT 1', [name.trim()]);

            if (rows.length > 0) {
                return NextResponse.json(rows[0]);
            }

            // 2. 없으면 신규 생성
            const { rows: newRows } = await pool.query(
                `INSERT INTO users (id, name) VALUES (gen_random_uuid(), $1) RETURNING *`,
                [name.trim()]
            );

            return NextResponse.json(newRows[0]);
        } catch (dbError: any) {
            console.error('DB Error details:', dbError);

            // 클라이언트에 전달할 상세 에러 정보 구성
            const errorResponse = {
                error: `데이터베이스 오류: ${dbError.message}`,
                details: {
                    code: dbError.code,
                    detail: dbError.detail,
                    hint: dbError.hint,
                    message: dbError.message
                }
            };

            if (dbError.message.includes('relation "users" does not exist')) {
                errorResponse.error = '데이터베이스에 "users" 테이블이 존재하지 않습니다. schema.sql을 실행해주세요.';
            } else if (dbError.message.includes('connection')) {
                errorResponse.error = '데이터베이스 연결에 실패했습니다. DATABASE_URL 설정을 확인해주세요.';
            }

            return NextResponse.json(errorResponse, { status: 500 });
        }
    } catch (error: any) {
        console.error('Login error:', error);
        return NextResponse.json({
            error: `로그인 처리 중 예외 발생: ${error.message}`,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
