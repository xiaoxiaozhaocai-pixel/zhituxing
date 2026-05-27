-- JD 数据卫生：加字段 + 标记假数据
-- 执行时间：2026-05-27
-- 执行者：人工在 Supabase Dashboard SQL Editor 执行
-- 风险：中（含 UPDATE，但只改新加字段不动业务字段）
-- ⚠️ 前置必须先备份：
--   CREATE TABLE job_descriptions_backup_20260527 AS SELECT * FROM public.job_descriptions;

BEGIN;

-- 1. 加字段
ALTER TABLE public.job_descriptions 
  ADD COLUMN IF NOT EXISTS is_synthetic BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.job_descriptions 
  ADD COLUMN IF NOT EXISTS url_status TEXT NOT NULL DEFAULT 'unknown';
-- url_status 枚举：unknown / alive / dead / synthetic

-- 2. 标记 round* 合成假数据（~2996 条）
UPDATE public.job_descriptions 
   SET is_synthetic = TRUE, url_status = 'synthetic'
 WHERE source_url LIKE 'round%';

-- 3. 标记 mock/example/test 占位假数据（~1101 条）
UPDATE public.job_descriptions 
   SET is_synthetic = TRUE, url_status = 'synthetic'
 WHERE source_url LIKE '%mock.gxrc.com%'
    OR source_url LIKE '%.example.com%'
    OR source_url LIKE '%.test.com%';

-- 4. 校验分组统计
SELECT is_synthetic, url_status, COUNT(*) AS cnt 
FROM public.job_descriptions 
GROUP BY is_synthetic, url_status ORDER BY cnt DESC;
-- 期望：synthetic=TRUE ~4097，FALSE/unknown ~659

COMMIT;