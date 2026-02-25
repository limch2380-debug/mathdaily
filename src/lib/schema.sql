-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 학습 세션 (하루 단위 기록)
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  date DATE NOT NULL,
  score INTEGER, -- 100점 만점
  total_count INTEGER,
  level VARCHAR(20), -- 'easy', 'medium', 'hard'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 문제 풀이 상세 기록 (AI 분석용)
CREATE TABLE IF NOT EXISTS problem_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES study_sessions(id),
  topic VARCHAR(100),
  is_correct BOOLEAN,
  time_spent INTEGER -- 초 단위
);
