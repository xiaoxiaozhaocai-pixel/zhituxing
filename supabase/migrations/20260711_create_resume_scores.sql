-- Resume scores table for structured resume evaluation
-- Stores scoring results per user, with multi-dimensional ratings and improvement suggestions

CREATE TABLE IF NOT EXISTS user_resume_scores (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  resume_id TEXT,
  target_job TEXT,
  overall_score NUMERIC(3,1),
  dimensions JSONB,
  improvements TEXT[],
  radar_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_resume_scores_user_created ON user_resume_scores(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resume_scores_user_resume ON user_resume_scores(user_id, resume_id);

-- Enable RLS but allow service_role full access
ALTER TABLE user_resume_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON user_resume_scores
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comments
COMMENT ON TABLE user_resume_scores IS 'Structured resume scoring results for each evaluation session';
COMMENT ON COLUMN user_resume_scores.user_id IS 'User identifier from authentication';
COMMENT ON COLUMN user_resume_scores.resume_id IS 'Optional reference to an existing resume record';
COMMENT ON COLUMN user_resume_scores.target_job IS 'Target job position selected during evaluation';
COMMENT ON COLUMN user_resume_scores.overall_score IS 'Overall resume score out of 10 (e.g. 8.5)';
COMMENT ON COLUMN user_resume_scores.dimensions IS '6-dimension scoring details: [{name, score, comment, weight}]';
COMMENT ON COLUMN user_resume_scores.improvements IS 'List of improvement suggestions from evaluation';
COMMENT ON COLUMN user_resume_scores.radar_data IS 'Radar chart data: {dimension_name: score}';
COMMENT ON COLUMN user_resume_scores.created_at IS 'Timestamp when the score record was created';
