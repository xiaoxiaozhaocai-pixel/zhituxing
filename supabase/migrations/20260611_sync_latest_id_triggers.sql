-- ============================================================
-- S6 P0: latest_xxx_id 自动同步 trigger + 历史回填
-- 2026-06-11
-- ============================================================

-- 1. 通用 trigger function：根据 TG_TABLE_NAME 映射目标字段
CREATE OR REPLACE FUNCTION public.sync_latest_id_to_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_col text;
BEGIN
  CASE TG_TABLE_NAME
    WHEN 'assessment_results' THEN v_col := 'latest_assessment_id';
    WHEN 'competency_results' THEN v_col := 'latest_competency_id';
    WHEN 'interview_results'  THEN v_col := 'latest_interview_id';
    WHEN 'career_plans'        THEN v_col := 'latest_career_plan_id';
    ELSE RETURN NEW;
  END CASE;

  -- 只在 NEW.id 大于当前值时更新（防止旧数据回填覆盖新值）
  EXECUTE format(
    'UPDATE public.user_profiles SET %I = $1, updated_at = NOW() WHERE user_id = $2 AND ($1 > COALESCE(%I, 0))',
    v_col, v_col
  ) USING NEW.id, NEW.user_id;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_latest_id_to_user_profile() IS 
  'S6 P0: 测评/竞争力/面试/规划新产物自动同步到 user_profiles.latest_xxx_id';

-- 2. 4 张表的 AFTER INSERT trigger
DROP TRIGGER IF EXISTS trg_sync_latest_assessment ON public.assessment_results;
CREATE TRIGGER trg_sync_latest_assessment
  AFTER INSERT ON public.assessment_results
  FOR EACH ROW EXECUTE FUNCTION public.sync_latest_id_to_user_profile();

DROP TRIGGER IF EXISTS trg_sync_latest_competency ON public.competency_results;
CREATE TRIGGER trg_sync_latest_competency
  AFTER INSERT ON public.competency_results
  FOR EACH ROW EXECUTE FUNCTION public.sync_latest_id_to_user_profile();

DROP TRIGGER IF EXISTS trg_sync_latest_interview ON public.interview_results;
CREATE TRIGGER trg_sync_latest_interview
  AFTER INSERT ON public.interview_results
  FOR EACH ROW EXECUTE FUNCTION public.sync_latest_id_to_user_profile();

DROP TRIGGER IF EXISTS trg_sync_latest_career ON public.career_plans;
CREATE TRIGGER trg_sync_latest_career
  AFTER INSERT ON public.career_plans
  FOR EACH ROW EXECUTE FUNCTION public.sync_latest_id_to_user_profile();
