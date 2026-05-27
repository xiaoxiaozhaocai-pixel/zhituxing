-- 职途星性能索引迁移脚本
-- 执行时间：2026-05-27
-- 说明：只为指定表添加索引，不修改现有数据
-- 执行者：手动在 Supabase Dashboard SQL Editor 执行

-- ============================================================
-- jobs 表（job_descriptions）
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_jobs_industry ON public.job_descriptions(industry);
CREATE INDEX IF NOT EXISTS idx_jobs_city ON public.job_descriptions(city);
CREATE INDEX IF NOT EXISTS idx_jobs_post_category ON public.job_descriptions(post_category);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at_desc ON public.job_descriptions(created_at DESC);

-- ============================================================
-- articles 表
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_articles_category_views ON public.articles(category, views DESC);
CREATE INDEX IF NOT EXISTS idx_articles_featured ON public.articles(featured) WHERE featured = true;

-- ============================================================
-- user_quotas 表
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_user_quotas_member_expires ON public.user_quotas(member_expires_at);

-- ============================================================
-- notifications 表
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, created_at DESC) WHERE is_read = false;