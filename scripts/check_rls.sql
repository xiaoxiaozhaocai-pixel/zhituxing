-- RLS 全库普查：结果应为 0 行（所有业务表均已启用 RLS）
-- 用法：Supabase Dashboard SQL Editor 或 Mgmt API
--   POST https://api.supabase.com/v1/projects/<ref>/database/query  body: {"query": "<本文件内容>"}
-- 背景：2026-09-14 第二轮审查发现 employer_job_posts/matches 漏开 RLS 且 anon 有全权限 grant（P0）。
SELECT n.nspname AS schema,
       c.relname AS table_name,
       c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
  AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'storage', 'extensions', 'auth', 'realtime', 'supabase_functions', 'net', 'pgsodium', 'pgsodium_masks', 'vault', 'supabase_migrations', 'pgtle')
  AND c.relrowsecurity = false
ORDER BY 1, 2;
