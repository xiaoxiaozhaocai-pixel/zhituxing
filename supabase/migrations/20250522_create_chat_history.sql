-- ============================================================
-- Migration: Create chat_history table
-- Description: Store conversation history for DeepSeek chat
-- Execute: Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- 创建表
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  bot_type VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引：按 conversation_id 查询（最常用）
CREATE INDEX IF NOT EXISTS idx_chat_history_conversation ON chat_history(conversation_id);

-- 索引：按 user_id 查询
CREATE INDEX IF NOT EXISTS idx_chat_history_user ON chat_history(user_id);

-- 索引：按 created_at 排序
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON chat_history(created_at);

-- RLS：启用行级安全
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能访问自己的记录
CREATE POLICY chat_history_user_policy ON chat_history
  FOR ALL USING (auth.uid() = user_id);

-- 注释
COMMENT ON TABLE chat_history IS '对话历史记录，用于 DeepSeek 多轮对话上下文';
COMMENT ON COLUMN chat_history.conversation_id IS '会话ID，关联一轮完整对话';
COMMENT ON COLUMN chat_history.user_id IS '用户ID，关联 user_profiles 表';
COMMENT ON COLUMN chat_history.role IS '消息角色：user 或 assistant';
COMMENT ON COLUMN chat_history.content IS '消息内容';
COMMENT ON COLUMN chat_history.bot_type IS '智能体类型：jobs/interview/decision/career/assessment/competency';
