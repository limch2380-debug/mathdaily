import { neon, neonConfig } from '@neondatabase/serverless';

// HTTP 통신을 기본으로 하여 WebSocket 404 에러 원천 차단
neonConfig.fetchConnectionCache = true;

const getSanitizedUrl = () => {
  let url = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;
  if (!url) return null;

  // prisma+postgres:// -> postgres:// 변환
  if (url.startsWith('prisma+')) {
    url = url.replace('prisma+', '');
  }
  return url;
};

const sanitizedUrl = getSanitizedUrl();

// HTTP 기반의 SQL 실행기 (neon) 사용
const sql = sanitizedUrl ? neon(sanitizedUrl) : null;

export const db = {
  query: async (text: string, params: any[] = []) => {
    if (!sql) {
      console.error('[DB] No SQL client available - check environment variables');
      throw new Error('Database connection URL is missing.');
    }

    try {
      // neon client는 rows 배열을 직접 반환함
      const rows = await sql(text, params);
      return { rows: Array.isArray(rows) ? rows : [rows] };
    } catch (err: any) {
      console.error('[DB Query Error]:', err.message);
      throw err;
    }
  },
};

export async function initializeDatabase() {
  if (typeof window !== 'undefined') return;

  if (!sanitizedUrl) {
    console.error('[DB] Missing connection string!');
    throw new Error('환경 변수에서 DATABASE_URL을 찾을 수 없습니다.');
  }

  try {
    console.log('[DB] HTTP Initialization started...');

    // 1. UUID 확장을 먼저 생성
    await db.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // 2. 유저 테이블 생성
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. 세션 테이블 생성
    await db.query(`
      CREATE TABLE IF NOT EXISTS study_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        date DATE NOT NULL,
        score INTEGER,
        total_count INTEGER,
        level VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[DB] HTTP Initialization Success');
  } catch (error: any) {
    console.error('[DB] HTTP Initialization Failed:', error.message);
    throw error;
  }
}

export default db;
