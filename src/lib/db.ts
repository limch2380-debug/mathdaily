import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Neon Serverless 전용 설정: WebSocket 강제 사용으로 HTTP 404 오류 방지
if (typeof window === 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

const getSanitizedUrl = () => {
  let url = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;

  if (!url) return null;

  // 1. prisma+postgres:// -> postgres:// 변환
  if (url.startsWith('prisma+')) {
    url = url.replace('prisma+', '');
  }

  // 2. URL 파싱 및 정리 (Neon 드라이버는 표준 형식을 선호함)
  try {
    const urlObj = new URL(url);
    return urlObj.toString();
  } catch (e) {
    return url;
  }
};

const sanitizedUrl = getSanitizedUrl();

export const pool = new Pool({
  connectionString: sanitizedUrl || '',
  // Vercel/Neon 환경에서는 rejectUnauthorized: false가 가장 안정적입니다.
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

export const db = {
  query: (text: string, params?: any[]) => pool.query(text, params),
};

export async function initializeDatabase() {
  if (typeof window !== 'undefined') return;
  if (!sanitizedUrl) throw new Error('환경 변수에서 DATABASE_URL을 찾을 수 없습니다.');

  try {
    // 1. UUID 확장을 먼저 생성
    await db.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // 2. 테이블 생성
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

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
    console.log('[DB] Initialization Success');
  } catch (error: any) {
    console.error('[DB] Init Error:', error.message);
    throw error;
  }
}

export default pool;
