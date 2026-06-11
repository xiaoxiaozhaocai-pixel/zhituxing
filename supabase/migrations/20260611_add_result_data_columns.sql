-- ============================================================
-- S6 P1·补回 result_data / plan_data 字段
-- 历史 schema 把这两个 jsonb 字段拆成了多个细分列
-- 但代码（chat/route.ts:226/276/356·assessment/route.ts:283·307）
-- 仍在 SELECT 和 INSERT result_data/plan_data
-- 导致 RAG 上下文加载全程 400 静默失败
-- 2026-06-11
-- ============================================================

ALTER TABLE public.assessment_results
  ADD COLUMN IF NOT EXISTS result_data jsonb;

ALTER TABLE public.career_plans
  ADD COLUMN IF NOT EXISTS plan_data jsonb;

ALTER TABLE public.skill_job_match
  ADD COLUMN IF NOT EXISTS match_data jsonb;

COMMENT ON COLUMN public.assessment_results.result_data IS
  'S6 P1: 原始测评 JSON 大对象（与拆字段共存：分字段用于 SQL 筛选，result_data 用于前端展示/RAG 上下文）';

COMMENT ON COLUMN public.career_plans.plan_data IS
  'S6 P1: 原始职业规划 JSON 大对象（与拆字段共存）';

COMMENT ON COLUMN public.skill_job_match.match_data IS
  'S6 P1: 原始岗位匹配 JSON 大对象（与 match_score/overlap_rate 等分字段共存）';
