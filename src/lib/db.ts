import { neon } from '@neondatabase/serverless';

/**
 * Neon HTTP 드라이버는 Direct Connection 엔드포인트만 지원합니다.
 * Pooler 엔드포인트(-pooler)에는 /sql HTTP 프록시가 없어 404가 발생합니다.
 * 
 * 따라서 URL에서:
 * 1. prisma+ 접두사 제거
 * 2. -pooler 제거 (pooler -> direct 전환)
 * 3. channel_binding 파라미터 제거 (HTTP 드라이버와 비호환)
 * 4. sslmode 파라미터 제거 (HTTPS 위에서 동작하므로 불필요)
 */
const getSanitizedUrl = () => {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;
  if (!url) return null;

  try {
    // 1. prisma+ 접두사 제거
    let cleanUrl = url.trim().replace('prisma+', '');

    // 2. URL 파싱
    const urlObj = new URL(cleanUrl);

    // 3. -pooler 제거 (Direct Connection으로 전환)
    // 예: ep-fragrant-haze-ai7rav28-pooler.xxx -> ep-fragrant-haze-ai7rav28.xxx
    if (urlObj.hostname.includes('-pooler')) {
      urlObj.hostname = urlObj.hostname.replace('-pooler', '');
    }

    // 4. 모든 쿼리 파라미터 제거 (sslmode, channel_binding 등)
    urlObj.search = '';

    const finalUrl = urlObj.toString();
    console.log(`[DB] Direct endpoint: ${urlObj.hostname}`);
    return finalUrl;
  } catch (e) {
    // URL 파싱 실패 시 단순 문자열 처리로 폴백
    let fallback = url.trim().replace('prisma+', '');
    fallback = fallback.replace('-pooler', '');
    if (fallback.includes('?')) fallback = fallback.split('?')[0];
    return fallback;
  }
};

// 싱글톤 SQL 클라이언트
let sqlClient: any = null;

const getSql = () => {
  if (sqlClient) return sqlClient;

  const url = getSanitizedUrl();
  if (!url) return null;

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
      throw new Error('DB 연결 설정이 누락되었습니다. Vercel 환경변수를 확인하세요.');
    }

    // neon() 최신 API: sql.query(text, params) 사용  
    const result = await (sql as any).query(text, params);
    return { rows: Array.isArray(result) ? result : [] };
  },
};

export async function initializeDatabase() {
  if (typeof window !== 'undefined') return;

  const url = getSanitizedUrl();
  if (!url) {
    console.log('[DB] No URL found, skipping init.');
    return;
  }

  try {
    console.log('[DB] Initializing tables...');

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
    console.log('[DB] Tables OK');
  } catch (error: any) {
    console.error('[DB] Init failed:', error.message);
    // Vercel 빌드 시에는 에러를 던지지 않음 (런타임에만 throw)
    if (!process.env.VERCEL) {
      throw error;
    }
  }
}

export default db;
