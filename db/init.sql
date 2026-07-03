-- ============================================
-- NEURAL·思政 数据库初始化 v2.0
-- 公共数据全局共享 + 私有数据按用户隔离
-- ============================================

-- 1. 用户表（设备ID匿名方案）
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id   VARCHAR(64) NOT NULL UNIQUE,
    nickname    VARCHAR(50) DEFAULT '',
    role        VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_device ON users(device_id);

-- 2. 题目主表（全局共享）
CREATE TABLE IF NOT EXISTS questions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type        VARCHAR(20) NOT NULL CHECK (type IN ('single','multiple','judge','essay','material')),
    title       TEXT NOT NULL,
    options     JSONB NOT NULL DEFAULT '[]',
    answer      TEXT NOT NULL,
    analysis    TEXT NOT NULL DEFAULT '',
    difficulty  VARCHAR(10) DEFAULT 'medium',
    chapter     VARCHAR(100) DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type);

-- 3. AI答案缓存（全局共享）
CREATE TABLE IF NOT EXISTS ai_cache (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id     UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    ai_answer       TEXT NOT NULL DEFAULT '',
    final_answer    TEXT NOT NULL DEFAULT '',
    ai_analysis     TEXT NOT NULL DEFAULT '',
    diff_explanation TEXT NOT NULL DEFAULT '',
    call_count      INTEGER NOT NULL DEFAULT 0,
    review_status   VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending','reviewed','consistent')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(question_id)
);

-- 4. 考试记录（按用户隔离）
CREATE TABLE IF NOT EXISTS exam_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    device_id       VARCHAR(64) NOT NULL,
    total_questions INTEGER NOT NULL,
    total_score     NUMERIC(10,2) NOT NULL,
    user_score      NUMERIC(10,2) NOT NULL,
    accuracy        NUMERIC(5,2) NOT NULL,
    type_accuracy   JSONB NOT NULL DEFAULT '{}',
    duration        INTEGER NOT NULL,
    answer_details  JSONB NOT NULL DEFAULT '[]',
    exam_time       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_exam_device ON exam_records(device_id);

-- 5. 更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_q ON questions;
CREATE TRIGGER trg_q BEFORE UPDATE ON questions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_ac ON ai_cache;
CREATE TRIGGER trg_ac BEFORE UPDATE ON ai_cache FOR EACH ROW EXECUTE FUNCTION update_updated_at();
