-- ============================================================
-- 用户能力档案：ability_portrait JSONB 列 + user_portrait_v 视图纳入
-- 2026-09-05 · C→B 飞轮数据底座（第三批）
--
-- 背景：认知校正(cognitive) / 技能画像(skill_portrait) / 岗位匹配(matched_skills)
--       三个画像入口此前「纯返回不落库」，B 端与 RAG 拿不到画像数据。
-- 方案：统一落库到 user_profiles.ability_portrait(JSONB)，按子块合并写入。
-- 本迁移：① 加列（幂等） ② 重建 user_portrait_v 视图，纳入能力档案 + 完整度加权
-- ============================================================

-- 1. user_profiles 新增 ability_portrait 列（JSONB，默认空对象）
ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS ability_portrait JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.user_profiles.ability_portrait IS
  '用户能力档案（C→B 飞轮）：{ cognitive, skill_portrait, matched_skills } 三子块合并存储，供 B 端筛选 + RAG 上下文一次加载';

-- 2. 重建 user_portrait_v 视图，纳入 ability_portrait 与完整度加权
-- 注：新增列后列数/列序变化，CREATE OR REPLACE 不幂等（会撞 42P16 列重命名），先 DROP 旧视图再重建
DROP VIEW IF EXISTS public.user_portrait_v;
CREATE OR REPLACE VIEW user_portrait_v
WITH (security_invoker = true) AS
SELECT
  -- ========== 基础信息（来自 user_profiles）==========
  up.user_id,
  up.nickname,
  up.phone,
  up.major,
  up.grade,
  up.graduation_year,
  up.gpa,
  up.english_level,
  up.target_cities,
  up.target_industry,
  up.target_job,
  up.career_tendency,
  up.personality_type,
  up.hard_skills,
  up.soft_skills,
  up.has_internship,
  up.has_project,
  up.economic_pressure,
  up.user_type,
  up.membership_tier,
  up.membership_type,
  up.membership_expires_at,
  up.awards,
  up.internship_experience,
  up.project_experience,
  up.created_at  AS profile_created_at,
  up.updated_at  AS profile_updated_at,

  -- ========== 用户能力档案（C→B 飞轮，第三批新增）==========
  up.ability_portrait,

  -- ========== 最新测评（assessment_results）==========
  ar.id                          AS assessment_id,
  ar.created_at                  AS assessment_at,
  ar.assessment_type,
  ar.overall_score               AS assessment_overall_score,
  ar.major_match_score,
  ar.tech_skill_score,
  ar.industry_awareness_score,
  ar.practice_score,
  ar.soft_skill_score,
  ar.job_readiness_score,
  ar.top_strengths,
  ar.top_weaknesses,
  ar.matched_jobs,
  ar.skill_gaps,
  ar.improvement_plan,
  ar.result_data                 AS assessment_data,

  -- ========== 最新职业规划（career_plans）==========
  cp.id                          AS career_plan_id,
  cp.created_at                  AS career_plan_at,
  cp.target_job                  AS plan_target_job,
  cp.target_industry             AS plan_target_industry,
  cp.career_paths,
  cp.skill_learning_path,
  cp.current_match_score,
  cp.personality_mapping,
  cp.action_plan,
  cp.plan_data                   AS career_plan_data,

  -- ========== 最新能力评估（competency_results）==========
  cr.id                          AS competency_id,
  cr.created_at                  AS competency_at,
  cr.result_data                 AS competency_data,

  -- ========== 最新面试结果（interview_results）==========
  ir.id                          AS interview_id,
  ir.created_at                  AS interview_at,
  ir.target_job                  AS interview_target_job,
  ir.overall_score               AS interview_overall_score,
  ir.resume_match_score,
  ir.hr_round_score,
  ir.technical_round_score,
  ir.executive_round_score,
  ir.key_strengths,
  ir.key_weaknesses,
  ir.gap_skills,

  -- ========== 画像完整度评分（0-100，B 端可用作筛选优先级）==========
  -- 第三批：纳入能力档案三子块各 +5 分。
  -- 为保持满分 100（B 端 employer-match-breakdown 硬编码 /100 视为百分比），
  -- 同步让权：去掉 grade(+5)、assessment 15→10(-5)、career_plan 10→5(-5)，净变化 0。
  (
    CASE WHEN up.major IS NOT NULL THEN 10 ELSE 0 END +
    CASE WHEN up.graduation_year IS NOT NULL THEN 5 ELSE 0 END +
    CASE WHEN up.target_industry IS NOT NULL THEN 10 ELSE 0 END +
    CASE WHEN up.target_job IS NOT NULL THEN 10 ELSE 0 END +
    CASE WHEN up.target_cities IS NOT NULL THEN 5 ELSE 0 END +
    CASE WHEN up.hard_skills IS NOT NULL THEN 10 ELSE 0 END +
    CASE WHEN up.soft_skills IS NOT NULL THEN 5 ELSE 0 END +
    CASE WHEN up.project_experience IS NOT NULL THEN 5 ELSE 0 END +
    CASE WHEN up.ability_portrait->'cognitive'     IS NOT NULL THEN 5 ELSE 0 END +
    CASE WHEN up.ability_portrait->'skill_portrait' IS NOT NULL THEN 5 ELSE 0 END +
    CASE WHEN up.ability_portrait->'matched_skills' IS NOT NULL THEN 5 ELSE 0 END +
    CASE WHEN ar.id IS NOT NULL THEN 10 ELSE 0 END +
    CASE WHEN cp.id IS NOT NULL THEN 5 ELSE 0 END +
    CASE WHEN cr.id IS NOT NULL THEN 5 ELSE 0 END +
    CASE WHEN ir.id IS NOT NULL THEN 5 ELSE 0 END
  ) AS portrait_completeness_score

FROM user_profiles up
LEFT JOIN assessment_results  ar ON ar.id = up.latest_assessment_id
LEFT JOIN career_plans        cp ON cp.id = up.latest_career_plan_id
LEFT JOIN competency_results  cr ON cr.id = up.latest_competency_id
LEFT JOIN interview_results   ir ON ir.id = up.latest_interview_id;

COMMENT ON VIEW user_portrait_v IS 'S6 P2: 一行聚合每个用户最新画像（基础信息+能力档案+测评+规划+能力+面试+完整度评分），B端候选人筛选+小职RAG上下文加载共用';

-- 授权
GRANT SELECT ON user_portrait_v TO service_role;
GRANT SELECT ON user_portrait_v TO authenticated;
