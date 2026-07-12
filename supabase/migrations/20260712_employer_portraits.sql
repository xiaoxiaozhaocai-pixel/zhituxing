-- ============================================================
-- S6 P5-E · 岗位真实画像系统（盲评卡片）
-- Tables: employer_portraits, portrait_candidates, portrait_evaluations
-- Date: 2026-07-12
-- ============================================================

BEGIN;

-- ============================================================
-- 1. employer_portraits 岗位画像配置表
-- ============================================================
CREATE TABLE IF NOT EXISTS public.employer_portraits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.employer_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  skill_anchor text,
  exp_anchor text,
  edu_anchor text,
  soft_anchor text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','closed')),
  candidate_count int NOT NULL DEFAULT 0,
  evaluated_count int NOT NULL DEFAULT 0,
  report_generated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ep_company ON public.employer_portraits(company_id);
CREATE INDEX IF NOT EXISTS idx_ep_created_by ON public.employer_portraits(created_by);

-- ============================================================
-- 2. portrait_candidates 画像候选人表
-- ============================================================
CREATE TABLE IF NOT EXISTS public.portrait_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portrait_id uuid NOT NULL REFERENCES public.employer_portraits(id) ON DELETE CASCADE,
  name text NOT NULL,
  education text,
  edu_level int CHECK (edu_level BETWEEN 1 AND 5),
  experience_summary text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','evaluated','excluded')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pc_portrait ON public.portrait_candidates(portrait_id);

-- ============================================================
-- 3. portrait_evaluations 评估记录表
-- ============================================================
CREATE TABLE IF NOT EXISTS public.portrait_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.portrait_candidates(id) ON DELETE CASCADE,
  evaluated_by uuid NOT NULL REFERENCES public.employer_profiles(id) ON DELETE CASCADE,
  skill_level int NOT NULL CHECK (skill_level BETWEEN 1 AND 5),
  exp_level int NOT NULL CHECK (exp_level BETWEEN 1 AND 5),
  soft_level int NOT NULL CHECK (soft_level BETWEEN 1 AND 5),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(candidate_id)
);
CREATE INDEX IF NOT EXISTS idx_pe_candidate ON public.portrait_evaluations(candidate_id);

-- ============================================================
-- 4. updated_at trigger
-- ============================================================
DROP TRIGGER IF EXISTS trg_employer_portraits_updated_at ON public.employer_portraits;
CREATE TRIGGER trg_employer_portraits_updated_at BEFORE UPDATE ON public.employer_portraits
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 5. RLS Policies
-- ============================================================
ALTER TABLE public.employer_portraits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portrait_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portrait_evaluations ENABLE ROW LEVEL SECURITY;

-- employer_portraits
DROP POLICY IF EXISTS "ep_select_company" ON public.employer_portraits;
CREATE POLICY "ep_select_company" ON public.employer_portraits FOR SELECT USING (
  company_id IN (SELECT company_id FROM public.employer_profiles WHERE user_id = auth.uid())
);
DROP POLICY IF EXISTS "ep_insert_self" ON public.employer_portraits;
CREATE POLICY "ep_insert_self" ON public.employer_portraits FOR INSERT TO authenticated WITH CHECK (
  created_by IN (SELECT id FROM public.employer_profiles WHERE user_id = auth.uid())
);
DROP POLICY IF EXISTS "ep_update_company" ON public.employer_portraits;
CREATE POLICY "ep_update_company" ON public.employer_portraits FOR UPDATE USING (
  company_id IN (SELECT company_id FROM public.employer_profiles WHERE user_id = auth.uid())
);

-- portrait_candidates
DROP POLICY IF EXISTS "pc_select_portrait" ON public.portrait_candidates;
CREATE POLICY "pc_select_portrait" ON public.portrait_candidates FOR SELECT USING (
  portrait_id IN (SELECT id FROM public.employer_portraits WHERE company_id IN (SELECT company_id FROM public.employer_profiles WHERE user_id = auth.uid()))
);
DROP POLICY IF EXISTS "pc_insert_portrait" ON public.portrait_candidates;
CREATE POLICY "pc_insert_portrait" ON public.portrait_candidates FOR INSERT TO authenticated WITH CHECK (
  portrait_id IN (SELECT id FROM public.employer_portraits WHERE created_by IN (SELECT id FROM public.employer_profiles WHERE user_id = auth.uid()))
);
DROP POLICY IF EXISTS "pc_update_portrait" ON public.portrait_candidates;
CREATE POLICY "pc_update_portrait" ON public.portrait_candidates FOR UPDATE USING (
  portrait_id IN (SELECT id FROM public.employer_portraits WHERE company_id IN (SELECT company_id FROM public.employer_profiles WHERE user_id = auth.uid()))
);

-- portrait_evaluations
DROP POLICY IF EXISTS "pe_select_candidate" ON public.portrait_evaluations;
CREATE POLICY "pe_select_candidate" ON public.portrait_evaluations FOR SELECT USING (
  candidate_id IN (SELECT id FROM public.portrait_candidates WHERE portrait_id IN (SELECT id FROM public.employer_portraits WHERE company_id IN (SELECT company_id FROM public.employer_profiles WHERE user_id = auth.uid())))
);
DROP POLICY IF EXISTS "pe_insert_self" ON public.portrait_evaluations;
CREATE POLICY "pe_insert_self" ON public.portrait_evaluations FOR INSERT TO authenticated WITH CHECK (
  evaluated_by IN (SELECT id FROM public.employer_profiles WHERE user_id = auth.uid())
);
DROP POLICY IF EXISTS "pe_update_self" ON public.portrait_evaluations;
CREATE POLICY "pe_update_self" ON public.portrait_evaluations FOR UPDATE USING (
  evaluated_by IN (SELECT id FROM public.employer_profiles WHERE user_id = auth.uid())
);

-- ============================================================
-- 6. Comments
-- ============================================================
COMMENT ON TABLE public.employer_portraits IS '岗位真实画像配置表·关联company·用v2编码标准';
COMMENT ON TABLE public.portrait_candidates IS '画像候选人·系统自动提取Edu·HR评其他三维度';
COMMENT ON TABLE public.portrait_evaluations IS 'HR盲评记录·每人唯一·Skill/Exp/Soft各1-5级';

COMMIT;


-- ============================================================
-- 7. 更新候选人计数的函数
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_portrait_candidate_count(p_portrait_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.portrait_candidates
  WHERE portrait_id = p_portrait_id;
  
  UPDATE public.employer_portraits
  SET candidate_count = v_count
  WHERE id = p_portrait_id;
END;
$$;

-- ============================================================
-- 8. 获取画像报告数据的函数
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_portrait_report_data(p_portrait_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'portrait', row_to_json(ep),
    'candidates', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'name', pc.name,
        'education', pc.education,
        'edu_level', pc.edu_level,
        'experience_summary', pc.experience_summary,
        'skill_level', pe.skill_level,
        'exp_level', pe.exp_level,
        'soft_level', pe.soft_level,
        'notes', pe.notes
      ))
      FROM public.portrait_candidates pc
      LEFT JOIN public.portrait_evaluations pe ON pe.candidate_id = pc.id
      WHERE pc.portrait_id = p_portrait_id AND pe.id IS NOT NULL),
      '[]'::jsonb
    )
  ) INTO v_result
  FROM public.employer_portraits ep
  WHERE ep.id = p_portrait_id;
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_portrait_candidate_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_portrait_report_data(uuid) TO authenticated;
