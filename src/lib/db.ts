import { neon, neonConfig } from '@neondatabase/serverless';

const getSanitizedUrl = () => {
  // Vercel Postgres의 다양한 변수명 대응 (POSTGRES_URL이 우선순위)
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;

  if (!url) return null;

  try {
    // 1. prisma+ 접두사 제거
    let cleanUrl = url.replace('prisma+', '');

    // 2. URL 객체를 이용한 정밀 세척
    const urlObj = new URL(cleanUrl);

    // 3. 쿼리 파라미터(?sslmode=... 등)는 HTTP 드라이버를 혼란스럽게 하므로 완전 제거
    urlObj.search = "";

    // 4. Neon HTTP 드라이버는 pooler 호스트보다 direct 호스트를 선호함
    // 호스트명에 -pooler 가 있다면 제거 (예: ep-xxx-pooler.region -> ep-xxx.region)
    if (urlObj.hostname.includes('-pooler')) {
      urlObj.hostname = urlObj.hostname.replace('-pooler', '');
    }

    const finalUrl = urlObj.toString();
    console.log('[DB] Attempting connection to host:', urlObj.hostname);
    return finalUrl;
  } catch (e) {
    console.warn('[DB] URL parsing failed, using raw string');
    return url;
  }
};

// SQL 실행 함수 (싱글톤 패턴으로 필요할 때 초기화)
let sqlClient: any = null;

const getSql = () => {
  if (sqlClient) return sqlClient;

  const url = getSanitizedUrl();
  // URL이 유효한 형식(postgres://)인지 한 번 더 체크
  if (!url || !url.startsWith('postgres')) {
    return null;
  }

  try {
    sqlClient = neon(url);
    return sqlClient;
  } catch (e) {
    console.error('[DB] Neon client creation failed:', e);
    return null;
  }
};

export const db = {
  query: async (text: string, params: any[] = []) => {
    const sql = getSql();
    if (!sql) {
      console.error('[DB] Database connection URL is missing. Check Vercel Environment Variables.');
      throw new Error('데이터베이스 연결 설정이 누락되었습니다.');
    }

    try {
      // Neon HTTP 드라이버의 최신 버전에서는 sql.query(text, params) 형식을 사용해야 함
      const rows = await (sql as any).query(text, params);
      return { rows: Array.isArray(rows) ? rows : [rows] };
    } catch (err: any) {
      console.error('[DB Query Error]:', err.message);
      throw err;
    }
  },
};

export async function initializeDatabase() {
  if (typeof window !== 'undefined') return;

  const url = getSanitizedUrl();
  if (!url) {
    console.log('[DB] Skipping initialization (No URL).');
    return;
  }

  try {
    console.log('[DB] HTTP Initialization started...');

    await db.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

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
    console.log('[DB] HTTP Initialization Success');
  } catch (error: any) {
    console.error('[DB] HTTP Initialization Failed:', error.message);
    // 빌드 중에는 에러를 던지지 않고 로그만 남김 (빌드 성공을 위해)
    if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
      throw error;
    }
  }
}

export default db;
