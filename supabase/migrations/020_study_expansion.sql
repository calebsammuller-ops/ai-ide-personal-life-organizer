-- Study Assistant: expand math solver to all subjects
ALTER TABLE math_problems ADD COLUMN IF NOT EXISTS subject TEXT DEFAULT 'Mathematics';
ALTER TABLE math_practice_sessions ADD COLUMN IF NOT EXISTS subject TEXT DEFAULT 'Mathematics';
CREATE INDEX IF NOT EXISTS idx_math_problems_subject ON math_problems(user_id, subject);
CREATE INDEX IF NOT EXISTS idx_math_sessions_subject ON math_practice_sessions(user_id, subject);
