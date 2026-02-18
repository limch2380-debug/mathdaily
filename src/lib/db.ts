import { sql } from '@vercel/postgres';

export async function getUserByName(name: string) {
    const { rows } = await sql`SELECT * FROM users WHERE name = ${name} LIMIT 1`;
    return rows[0];
}

export async function createUser(name: string) {
    const { rows } = await sql`
    INSERT INTO users (name) VALUES (${name})
    RETURNING *
  `;
    return rows[0];
}

export async function getRecentSessions(userId: string, limit = 30) {
    const { rows } = await sql`
    SELECT * FROM study_sessions 
    WHERE user_id = ${userId} 
    ORDER BY date DESC 
    LIMIT ${limit}
  `;
    return rows;
}

export async function saveSession(userId: string, date: string, score: number, totalCount: number, level: string) {
    const { rows } = await sql`
    INSERT INTO study_sessions (user_id, date, score, total_count, level)
    VALUES (${userId}, ${date}, ${score}, ${totalCount}, ${level})
    RETURNING *
  `;
    return rows[0];
}

export async function getRecentAverageScore(userId: string, limit = 5) {
    const { rows } = await sql`
    SELECT AVG(score) as avg_score 
    FROM study_sessions 
    WHERE user_id = ${userId} 
    ORDER BY date DESC 
    LIMIT ${limit}
  `;
    return rows[0]?.avg_score ? parseFloat(rows[0].avg_score) : null;
}
