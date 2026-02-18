import { Pool } from '@neondatabase/serverless';

// Vercel/Neon DB 연결 설정
const connectionString =
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL;

// 디버깅을 위한 서버 로그 (비밀번호 등 민감 정보 제외하고 앞부분만 노출)
if (typeof window === 'undefined') {
  if (connectionString) {
    console.log(`[DB] Connection string found: ${connectionString.substring(0, 15)}...`);
  } else {
    console.error('[DB] CRITICAL: No database connection string found in environment variables!');
  }
}

const pool = new Pool({
  connectionString: connectionString,
});

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
