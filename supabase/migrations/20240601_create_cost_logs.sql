-- Migration: 20240601_create_cost_logs
-- 成本监控数据层：记录每次 DeepSeek API 调用的 token 消耗

CREATE TABLE IF NOT EXISTS cost_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT,
  conversation_id TEXT,
  bot_type TEXT NOT NULL DEFAULT 'chat',
  model TEXT NOT NULL,
  call_type TEXT NOT NULL DEFAULT 'chat',
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  cost_yuan NUMERIC(10, 6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cost_logs_created_at ON cost_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_cost_logs_bot_type ON cost_logs(bot_type);
CREATE INDEX IF NOT EXISTS idx_cost_logs_user_id ON cost_logs(user_id);

ALTER TABLE cost_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_cost_logs" ON cost_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE cost_logs IS 'DeepSeek API 调用成本日志';
COMMENT ON COLUMN cost_logs.bot_type IS '触发的智能体类型: chat/career/interview/jobs/decision/compression';
COMMENT ON COLUMN cost_logs.call_type IS '调用类型: chat/compression/rag/summary';
COMMENT ON COLUMN cost_logs.cost_yuan IS '预估成本(元)，按 deepseek-chat 定价: 输入¥1/M, 输出¥2/M';
