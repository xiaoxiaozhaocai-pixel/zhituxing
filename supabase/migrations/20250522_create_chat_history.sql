-- Chat history table for conversation context persistence
-- Stores user and assistant messages for multi-turn conversations

CREATE TABLE IF NOT EXISTS chat_history (
  id BIGSERIAL PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  bot_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_chat_history_conversation ON chat_history(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_user ON chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_created ON chat_history(created_at);

-- Enable RLS but allow service_role full access
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON chat_history
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comment
COMMENT ON TABLE chat_history IS 'Conversation history for multi-turn chat with AI agents';
COMMENT ON COLUMN chat_history.conversation_id IS 'Unique identifier for a conversation session';
COMMENT ON COLUMN chat_history.user_id IS 'User identifier from authentication';
COMMENT ON COLUMN chat_history.role IS 'Message role: user or assistant';
COMMENT ON COLUMN chat_history.content IS 'Message content';
COMMENT ON COLUMN chat_history.bot_type IS 'AI agent type: jobs, career, interview, etc.';
