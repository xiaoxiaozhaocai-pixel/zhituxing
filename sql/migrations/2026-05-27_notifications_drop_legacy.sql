-- notifications 表清理历史字段
-- 执行时间：2026-05-27
-- 前置：代码层已全部统一到 is_read（commit 68de5e9）
-- 执行者：人工在 Supabase Dashboard SQL Editor 执行
-- ⚠️ 执行前必须先备份：CREATE TABLE notifications_backup_20260527 AS SELECT * FROM public.notifications;

BEGIN;

-- 1. 删触发器
DROP TRIGGER IF EXISTS sync_read_status ON public.notifications;
DROP FUNCTION IF EXISTS public.sync_read_status();

-- 2. 删历史字段（保留 is_read）
ALTER TABLE public.notifications DROP COLUMN IF EXISTS read;
ALTER TABLE public.notifications DROP COLUMN IF EXISTS status;

-- 3. 校验
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notifications' AND table_schema = 'public'
ORDER BY ordinal_position;
-- 期望：is_read 在列表里，read/status 不在

COMMIT;

-- 如果执行后线上发现问题需要回滚，恢复方案：
-- DROP TABLE public.notifications;
-- ALTER TABLE public.notifications_backup_20260527 RENAME TO notifications;
-- （注意：需要重建索引和 RLS policy，参考 buildfix_work/notifications_create.sql）