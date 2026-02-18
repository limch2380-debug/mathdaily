import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Neon Serverless 드라이버 설정: WebSocket 생성자 명시적 지정
// Vercel 일부 환경에서 소켓 연결 오류를 방지하기 위해 필수적입니다.
if (typeof window === 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

// Vercel/Neon DB 연결 설정
const connectionString =
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

// Vercel Postgres의 'prisma+postgres://' 형식을 'postgres://'로 변환 (Neon 드라이버 호환성)
let sanitizedUrl = connectionString;
if (sanitizedUrl?.startsWith('prisma+postgres://')) {
  sanitizedUrl = sanitizedUrl.replace('prisma+postgres://', 'postgres://');
}

// 디버깅을 위한 서버 로그
if (typeof window === 'undefined') {
  if (sanitizedUrl) {
    console.log(`[DB] Connection attempt with sanitized URL: ${sanitizedUrl.substring(0, 25)}...`);
  } else {
    console.error('[DB] CRITICAL: No database connection string found in environment variables!');
  }
}

const pool = new Pool({
  connectionString: sanitizedUrl,
});

/**
 * 데이터베이스 테이블이 없을 경우 자동으로 생성합니다.
 */
export async function initializeDatabase() {
  console.log('[DB] Initializing database tables...');
  try {
    // 1. users 테이블
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(50) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. study_sessions 테이블
    await pool.query(`
      CREATE TABLE IF NOT EXISTS study_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        date DATE NOT NULL,
        score INTEGER,
        total_count INTEGER,
        level VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. problem_logs 테이블
    await pool.query(`
      CREATE TABLE IF NOT EXISTS problem_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES study_sessions(id),
        topic VARCHAR(100),
        is_correct BOOLEAN,
        time_spent INTEGER
      );
    `);

    console.log('[DB] Database tables initialized successfully.');
  } catch (error) {
    console.error('[DB] Failed to initialize database tables:', error);
    throw error;
  }
}

export default pool;

// 헬퍼 함수들 (이전과 동일한 인터페이스 유지 노력)

export async function getUserByName(name: string) {
  const { rows } = await pool.query('SELECT * FROM users WHERE name = $1 LIMIT 1', [name]);
  return rows[0];
}

export async function createUser(name: string) {
  const { rows } = await pool.query(
    'INSERT INTO users (name) VALUES ($1) RETURNING *',
    [name]
  );
  return rows[0];
}

export async function getRecentSessions(userId: string, limit = 30) {
  const { rows } = await pool.query(
    'SELECT * FROM study_sessions WHERE user_id = $1 ORDER BY date DESC LIMIT $2',
    [userId, limit]
  );
  return rows;
}

export async function saveSession(userId: string, date: string, score: number, totalCount: number, level: string) {
  const { rows } = await pool.query(
    'INSERT INTO study_sessions (user_id, date, score, total_count, level) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [userId, date, score, totalCount, level]
  );
  return rows[0];
}

export async function getRecentAverageScore(userId: string, limit = 5) {
  const { rows } = await pool.query(
    'SELECT AVG(score) as avg_score FROM study_sessions WHERE user_id = $1 ORDER BY date DESC LIMIT $2',
    [userId, limit]
  );
  return rows[0]?.avg_score ? parseFloat(rows[0].avg_score) : null;
}
