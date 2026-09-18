-- ============================================================
-- fsQCA 引擎数据层：portrait_evaluations 新增「匹配度」结果变量
-- Date: 2026-09-18
--
-- 背景：fsQCA 必须要有「结果变量 Y」。当前盲评只有 Skill/Exp/Soft 三个条件，
-- 现新增 match_level（该候选人是否匹配该岗位），作为 fsQCA 的结果变量 Y。
-- 触发口径（主人拍板 9/18）：15 人出线索，30 人跑完整 fsQCA 真算。
-- ============================================================

BEGIN;

ALTER TABLE public.portrait_evaluations
  ADD COLUMN IF NOT EXISTS match_level int
  CHECK (match_level IS NULL OR (match_level BETWEEN 1 AND 5));

COMMENT ON COLUMN public.portrait_evaluations.match_level IS
  '匹配度（fsQCA结果变量Y，1-5）：雇主盲评该候选人是否匹配该岗位；>=4 视为匹配。NULL 表示未评。';

COMMIT;