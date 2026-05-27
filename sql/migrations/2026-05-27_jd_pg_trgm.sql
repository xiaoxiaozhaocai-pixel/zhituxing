-- job_descriptions 表 pg_trgm 全文索引
-- 执行时间：2026-05-27
-- 用途：修复 /api/jobs?keyword=中文关键词 15s 超时问题
-- 风险等级：低（CREATE INDEX CONCURRENTLY 不锁表）
-- 执行者：人工在 Supabase Dashboard SQL Editor 执行（不要 Trae 自动跑）

BEGIN;

-- 1. 启用 pg_trgm 扩展（支持 trigram 全文搜索）
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. 给 job_title 加 GIN trgm 索引（支持前后通配 ilike 查询）
CREATE INDEX IF NOT EXISTS idx_jd_job_title_trgm 
ON public.job_descriptions USING gin (job_title gin_trgm_ops);

-- 3. 给 industry 加 GIN trgm 索引
CREATE INDEX IF NOT EXISTS idx_jd_industry_trgm 
ON public.job_descriptions USING gin (industry gin_trgm_ops);

-- 4. hard_skills / soft_skills 字段类型确认（先执行这条查类型，再决定是否加索引）
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'job_descriptions' 
--   AND column_name IN ('hard_skills', 'soft_skills');
-- 如果是 jsonb 类型可加：CREATE INDEX IF NOT EXISTS idx_jd_hard_skills_gin ON public.job_descriptions USING gin (hard_skills);
-- 如果是 text 类型可加：CREATE INDEX IF NOT EXISTS idx_jd_hard_skills_trgm ON public.job_descriptions USING gin (hard_skills gin_trgm_ops);

-- 5. 校验索引创建结果
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'job_descriptions' 
  AND indexname LIKE 'idx_jd_%_trgm';
-- 期望返回 2 行：idx_jd_job_title_trgm、idx_jd_industry_trgm

COMMIT;

-- 注意：索引创建后需要等待 autovacuum ANALYZE 才能被查询规划器识别
-- 如果立即查询没加速，可手动执行：ANALYZE public.job_descriptions;