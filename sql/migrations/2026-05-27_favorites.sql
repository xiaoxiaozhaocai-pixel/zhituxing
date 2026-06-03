-- favorites 通用收藏表（修复 /api/favorites 500，原 job_favorites 表已废弃未建）
-- 字段按 src/app/api/favorites/route.ts INSERT 逻辑倒推
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,           -- jd / article 等收藏类型
  target_id TEXT NOT NULL,      -- 目标对象 ID
  title TEXT,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT favorites_unique_user_target UNIQUE(user_id, type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_type_created
  ON favorites(user_id, type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_favorites_user_created
  ON favorites(user_id, created_at DESC);
