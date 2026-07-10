-- Migration: 简历综合评分结果表
-- 用途：存储每次简历评分结果，用于呈现雷达图+历史趋势+B端画像
-- 依赖：auth.users, public.resumes

CREATE TABLE IF NOT EXISTS user_resume_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_id UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
  target_job VARCHAR(200),
  overall_score NUMERIC(4,1) NOT NULL,
  dimensions JSONB NOT NULL,
  improvements JSONB DEFAULT '[]'::jsonb,
  radar_data JSONB DEFAULT '{}'::jsonb,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resume_scores_user_id ON user_resume_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_scores_created_at ON user_resume_scores(created_at DESC);

-- 行级安全
ALTER TABLE user_resume_scores ENABLE ROW LEVEL SECURITY;

-- 用户只能看自己的评分
CREATE POLICY "Users can view own scores"
  ON user_resume_scores FOR SELECT
  USING (auth.uid() = user_id);

-- 用户只能插入自己的评分
CREATE POLICY "Users can insert own scores"
  ON user_resume_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- service_role 完全访问（管理后台/B端用）
CREATE POLICY "Service role full access"
  ON user_resume_scores FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE user_resume_scores IS '简历综合评分结果，含6维度分+雷达图数据+B端画像输入';
COMMENT ON COLUMN user_resume_scores.dimensions IS '评分维度数组：[{name, score, maxScore, weight, comment}]';
COMMENT ON COLUMN user_resume_scores.radar_data IS '雷达图数据：{维度名: 分数}';
COMMENT ON COLUMN user_resume_scores.improvements IS '改进建议列表';
