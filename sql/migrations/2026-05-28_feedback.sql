CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  page TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bug', 'slow', 'ux', 'suggest', 'praise')),
  severity TEXT CHECK (severity IN ('P0', 'P1', 'P2', 'P3')),
  description TEXT NOT NULL,
  screenshot_url TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);