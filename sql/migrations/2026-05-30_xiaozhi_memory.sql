-- 小职情绪/任务/成长记忆系统（架构 2.0 v0.1）
-- 让小职能"记住"用户的情绪、任务进度和共同经历
-- 对应设计稿：职途星/小职形象设计稿_20260529.md §3-5

-- ============================================================
-- 1. 情绪记忆表
-- ============================================================
CREATE TABLE IF NOT EXISTS mascot_emotional_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_type VARCHAR(20) NOT NULL, -- 'emotion' | 'event' | 'goal' | 'milestone'
  content TEXT NOT NULL,
  follow_up_date TIMESTAMPTZ,       -- 小职应该何时主动关心
  is_followed_up BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mascot_emotion_user
  ON mascot_emotional_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_mascot_emotion_pending
  ON mascot_emotional_memory(follow_up_date)
  WHERE is_followed_up = FALSE;
CREATE INDEX IF NOT EXISTS idx_mascot_emotion_type
  ON mascot_emotional_memory(user_id, memory_type);

-- ============================================================
-- 2. 任务记忆表
-- ============================================================
CREATE TABLE IF NOT EXISTS mascot_task_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_type VARCHAR(30) NOT NULL,   -- 'application' | 'interview' | 'plan' | 'skill' | 'resume'
  task_title VARCHAR(200) NOT NULL,
  task_status VARCHAR(20) DEFAULT 'in_progress', -- 'in_progress' | 'completed' | 'paused' | 'abandoned'
  related_agent VARCHAR(30),        -- 关联的智能体类型
  related_artifact_id UUID,         -- 关联的智能体产物ID
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mascot_task_user
  ON mascot_task_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_mascot_task_status
  ON mascot_task_memory(task_status);
CREATE INDEX IF NOT EXISTS idx_mascot_task_in_progress
  ON mascot_task_memory(user_id, task_status)
  WHERE task_status = 'in_progress';

-- ============================================================
-- 3. 成长记录表（陪伴时长/里程碑/小职日记）
-- ============================================================
CREATE TABLE IF NOT EXISTS mascot_growth_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  record_type VARCHAR(30) NOT NULL, -- 'milestone' | 'timeline' | 'diary' | 'memory'
  title VARCHAR(200),
  content TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mascot_growth_user
  ON mascot_growth_records(user_id);
CREATE INDEX IF NOT EXISTS idx_mascot_growth_type
  ON mascot_growth_records(user_id, record_type);

-- ============================================================
-- RLS 策略：service_role 全权限（后端 API 用）
-- ============================================================
ALTER TABLE mascot_emotional_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE mascot_task_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE mascot_growth_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_emotion" ON mascot_emotional_memory
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_full_access_task" ON mascot_task_memory
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_full_access_growth" ON mascot_growth_records
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 注释
COMMENT ON TABLE mascot_emotional_memory IS '小职情绪记忆 — 记住用户的情绪、重要事件、目标';
COMMENT ON TABLE mascot_task_memory IS '小职任务记忆 — 记住用户的求职任务进度';
COMMENT ON TABLE mascot_growth_records IS '小职成长记录 — 里程碑/时间线/日记/回忆';
COMMENT ON COLUMN mascot_emotional_memory.follow_up_date IS '小职应该何时主动关心该事件';
COMMENT ON COLUMN mascot_emotional_memory.is_followed_up IS '是否已经主动关心过';
COMMENT ON COLUMN mascot_task_memory.task_status IS 'in_progress | completed | paused | abandoned';
COMMENT ON COLUMN mascot_task_memory.related_agent IS '关联智能体类型: jobs | career | interview | resume_optimize | assessment | competency | decision';
COMMENT ON COLUMN mascot_growth_records.record_type IS 'milestone | timeline | diary | memory';
