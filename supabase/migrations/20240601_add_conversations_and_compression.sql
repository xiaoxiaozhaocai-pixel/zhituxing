-- Migration: 20240601_add_conversations_and_compression
-- 上下文压缩：三层混合压缩的表结构支持

-- 1. 创建 conversations 表
CREATE TABLE IF NOT EXISTS conversations (
  id BIGSERIAL PRIMARY KEY,
  conversation_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  summary JSONB,
  bot_type TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_cid ON conversations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_conversations" ON conversations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE conversations IS 'Conversation metadata and compressed summaries for context compression';
COMMENT ON COLUMN conversations.conversation_id IS 'Maps to chat_history.conversation_id';
COMMENT ON COLUMN conversations.summary IS 'Incremental compressed summary as JSON: { summary, key_decisions, pending_items, extracted_keywords }';

-- 2. chat_history 增加 is_compressed 列
ALTER TABLE chat_history
ADD COLUMN IF NOT EXISTS is_compressed BOOLEAN DEFAULT FALSE;

-- 3. 未压缩消息的查询索引
CREATE INDEX IF NOT EXISTS idx_chat_history_uncompressed
ON chat_history(conversation_id, created_at)
WHERE is_compressed = FALSE;
