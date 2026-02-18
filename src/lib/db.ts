import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Neon Serverless용 WebSocket 설정 (Edge/Serverless 환경 대응)
if (typeof window === 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

// 환경 변수 감지 (Vercel Postgres의 모든 케이스 대응)
const connectionString =
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

// prisma+ 가 붙은 경우 순수 postgres:// 로 변환
let sanitizedUrl = connectionString;
if (sanitizedUrl?.startsWith('prisma+postgres://')) {
  sanitizedUrl = sanitizedUrl.replace('prisma+postgres://', 'postgres://');
}

// Pool 생성
export const pool = new Pool({
  connectionString: sanitizedUrl,
});

// 사용자가 요청한 'db.query' 문법 대응을 위한 객체 수출
export const db = {
  query: (text: string, params?: any[]) => pool.query(text, params),
};

/**
 * 테이블 자동 생성 함수 (가장 안전한 기본 쿼리)
 */
export async function initializeDatabase() {
  if (typeof window !== 'undefined') return;

  try {
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
    console.log('[DB] Tables checked/created.');
  } catch (error) {
    console.error('[DB] Init Error:', error);
  }
}

export default pool;
