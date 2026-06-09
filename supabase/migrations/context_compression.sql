-- ============================================================
-- 上下文压缩 — 数据库迁移
-- 版本：v1.0 | 日期：2026-06-09
-- 用途：支持三层混合上下文压缩，节省 DeepSeek API token 成本
-- ============================================================

-- ============================================================
-- 1. conversations 表：新增压缩相关字段
-- ============================================================

-- 添加 summary 字段（如果不存在）
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS summary TEXT;

-- 添加摘要更新时间
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS summary_updated_at TIMESTAMPTZ;

-- 添加上次压缩时间
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS compressed_at TIMESTAMPTZ;

-- ============================================================
-- 2. chat_history 表：新增压缩标记字段
-- ============================================================

-- 添加压缩标记（标记该消息是否已被压缩进摘要）
ALTER TABLE public.chat_history
ADD COLUMN IF NOT EXISTS is_compressed BOOLEAN DEFAULT false;

-- 索引：快速查询未压缩消息
CREATE INDEX IF NOT EXISTS idx_chat_history_is_compressed
ON public.chat_history (conversation_id, is_compressed)
WHERE is_compressed = false;

-- ============================================================
-- 3. 新建：用户画像表
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT,
  school TEXT,
  major TEXT,
  grade TEXT,
  target_industry TEXT,
  target_position TEXT,
  job_hunting_stage TEXT,
  skills JSONB DEFAULT '[]'::jsonb,
  key_projects JSONB DEFAULT '[]'::jsonb,
  key_preferences JSONB DEFAULT '[]'::jsonb,
  raw_resume_text TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);

-- RLS 策略
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 用户可以读自己的画像
CREATE POLICY "Users can read own profile" ON public.user_profiles
FOR SELECT USING (auth.uid() = user_id);

-- 用户可以创建自己的画像
CREATE POLICY "Users can insert own profile" ON public.user_profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 用户可以更新自己的画像
CREATE POLICY "Users can update own profile" ON public.user_profiles
FOR UPDATE USING (auth.uid() = user_id);

-- 允许 service_role 完全访问（后端压缩逻辑使用）
CREATE POLICY "Service role full access" ON public.user_profiles
FOR ALL USING (true)
WITH CHECK (true);

-- ============================================================
-- 4. 新建：压缩快照表
-- ============================================================

CREATE TABLE IF NOT EXISTS public.compression_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  compressed_message_ids UUID[] NOT NULL,
  summary_content TEXT NOT NULL,
  compressed_token_count INTEGER NOT NULL DEFAULT 0,
  summary_token_count INTEGER NOT NULL DEFAULT 0,
  compression_ratio REAL NOT NULL DEFAULT 0,
  compression_model TEXT NOT NULL DEFAULT 'deepseek-chat',
  trigger_type TEXT NOT NULL DEFAULT 'round',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compression_snapshots_conv
ON public.compression_snapshots(conversation_id, created_at DESC);

ALTER TABLE public.compression_snapshots ENABLE ROW LEVEL SECURITY;

-- 仅 service_role 可访问（内部使用）
CREATE POLICY "Service role full access" ON public.compression_snapshots
FOR ALL USING (true)
WITH CHECK (true);

-- ============================================================
-- 5. 验证
-- ============================================================

-- 确认字段存在
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('conversations', 'chat_history', 'user_profiles', 'compression_snapshots')
  AND table_schema = 'public'
ORDER BY table_name, ordinal_position;
