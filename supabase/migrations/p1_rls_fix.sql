-- ============================================
-- 职途星 P1 安全审计：RLS 策略补全
-- 执行环境：Supabase SQL Editor（service_role）
-- ============================================

-- 1. 检查当前 RLS 状态
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. 为未启用 RLS 的表补全（仅当 rowsecurity = false）
-- 根据审计报告，以下表可能缺少 RLS：

-- job_descriptions：JD 数据表
ALTER TABLE IF EXISTS public.job_descriptions ENABLE ROW LEVEL SECURITY;

-- skill_taxonomy：技能分类表
ALTER TABLE IF EXISTS public.skill_taxonomy ENABLE ROW LEVEL SECURITY;

-- skill_relations：技能关联表
ALTER TABLE IF EXISTS public.skill_relations ENABLE ROW LEVEL SECURITY;

-- skill_courses：课程表
ALTER TABLE IF EXISTS public.skill_courses ENABLE ROW LEVEL SECURITY;

-- skill_progress：学习进度表
ALTER TABLE IF EXISTS public.skill_progress ENABLE ROW LEVEL SECURITY;

-- articles：文章表
ALTER TABLE IF EXISTS public.articles ENABLE ROW LEVEL SECURITY;

-- 3. 为公开可读表添加 SELECT 策略
-- job_descriptions：所有人可读已解析的 JD
DROP POLICY IF EXISTS "Anyone can read parsed JDs" ON public.job_descriptions;
CREATE POLICY "Anyone can read parsed JDs"
    ON public.job_descriptions FOR SELECT
    USING (status = 'parsed');

-- skill_taxonomy：所有人可读
DROP POLICY IF EXISTS "Anyone can read skill taxonomy" ON public.skill_taxonomy;
CREATE POLICY "Anyone can read skill taxonomy"
    ON public.skill_taxonomy FOR SELECT
    USING (true);

-- skill_relations：所有人可读
DROP POLICY IF EXISTS "Anyone can read skill relations" ON public.skill_relations;
CREATE POLICY "Anyone can read skill relations"
    ON public.skill_relations FOR SELECT
    USING (true);

-- articles：所有人可读已发布的
DROP POLICY IF EXISTS "Anyone can read published articles" ON public.articles;
CREATE POLICY "Anyone can read published articles"
    ON public.articles FOR SELECT
    USING (status = 'published');

-- 4. 补全用户数据表 DELETE 策略（个保法合规）
DROP POLICY IF EXISTS "Users can delete own profile" ON public.user_profiles;
CREATE POLICY "Users can delete own profile"
    ON public.user_profiles FOR DELETE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own assessments" ON public.assessment_results;
CREATE POLICY "Users can delete own assessments"
    ON public.assessment_results FOR DELETE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own interviews" ON public.interview_results;
CREATE POLICY "Users can delete own interviews"
    ON public.interview_results FOR DELETE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own plans" ON public.career_plans;
CREATE POLICY "Users can delete own plans"
    ON public.career_plans FOR DELETE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own behaviors" ON public.user_behaviors;
CREATE POLICY "Users can delete own behaviors"
    ON public.user_behaviors FOR DELETE
    USING (auth.uid() = user_id);

-- 5. 修复 search_path 安全警告
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

-- 6. 修复 save_assessment_with_profile SECURITY DEFINER 风险
-- 如果该函数存在且使用 SECURITY DEFINER，改为 SECURITY INVOKER
-- 注意：这需要确认函数确实存在且使用了 SECURITY DEFINER
-- ALTER FUNCTION public.save_assessment_with_profile SECURITY INVOKER;

-- 7. 最终验证
SELECT 
    tablename, 
    rowsecurity,
    (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) as policy_count
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY rowsecurity, tablename;
