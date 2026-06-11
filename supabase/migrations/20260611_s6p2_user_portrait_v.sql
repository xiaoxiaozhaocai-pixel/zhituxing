-- S6 P2: user_portrait_v 一行聚合每个用户的最新画像数据
-- 用途：B 端候选人筛选 + 小职 RAG 上下文一次性加载
-- 数据来源：user_profiles + 4 张行为表（通过 latest_*_id 关联）
-- 安全：security_invoker=true 继承调用者 RLS（认证用户只能查自己，service_role 可查全部）

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
  (
    CASE WHEN up.major IS NOT NULL THEN 10 ELSE 0 END +
    CASE WHEN up.grade IS NOT NULL THEN 5 ELSE 0 END +
    CASE WHEN up.graduation_year IS NOT NULL THEN 5 ELSE 0 END +
    CASE WHEN up.target_industry IS NOT NULL THEN 10 ELSE 0 END +
    CASE WHEN up.target_job IS NOT NULL THEN 10 ELSE 0 END +
    CASE WHEN up.target_cities IS NOT NULL THEN 5 ELSE 0 END +
    CASE WHEN up.hard_skills IS NOT NULL THEN 10 ELSE 0 END +
    CASE WHEN up.soft_skills IS NOT NULL THEN 5 ELSE 0 END +
    CASE WHEN up.project_experience IS NOT NULL THEN 5 ELSE 0 END +
    CASE WHEN ar.id IS NOT NULL THEN 15 ELSE 0 END +
    CASE WHEN cp.id IS NOT NULL THEN 10 ELSE 0 END +
    CASE WHEN cr.id IS NOT NULL THEN 5 ELSE 0 END +
    CASE WHEN ir.id IS NOT NULL THEN 5 ELSE 0 END
  ) AS portrait_completeness_score

FROM user_profiles up
LEFT JOIN assessment_results  ar ON ar.id = up.latest_assessment_id
LEFT JOIN career_plans        cp ON cp.id = up.latest_career_plan_id
LEFT JOIN competency_results  cr ON cr.id = up.latest_competency_id
LEFT JOIN interview_results   ir ON ir.id = up.latest_interview_id;

COMMENT ON VIEW user_portrait_v IS 'S6 P2: 一行聚合每个用户最新画像（基础信息+测评+规划+能力+面试+完整度评分），B端候选人筛选+小职RAG上下文加载共用';

-- 授权
GRANT SELECT ON user_portrait_v TO service_role;
GRANT SELECT ON user_portrait_v TO authenticated;
