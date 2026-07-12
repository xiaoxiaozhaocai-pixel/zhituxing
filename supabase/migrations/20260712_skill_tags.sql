-- ============================================================
-- 2026-07-12: P2 结构化简历升级 — Day 1 数据底座
-- 新建 skill_tags 和 user_skill_tags 表
-- ============================================================

CREATE TABLE IF NOT EXISTS public.skill_tags (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  seniority_level TEXT,
  industry_tags TEXT[],
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_skill_tags_category ON public.skill_tags(category);
CREATE INDEX IF NOT EXISTS idx_skill_tags_industry ON public.skill_tags USING GIN(industry_tags);

CREATE TABLE IF NOT EXISTS public.user_skill_tags (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  skill_id BIGINT NOT NULL REFERENCES public.skill_tags(id) ON DELETE CASCADE,
  proficiency_level TEXT DEFAULT 'beginner' CHECK (proficiency_level IN ('beginner','intermediate','advanced','expert')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, skill_id)
);
CREATE INDEX IF NOT EXISTS idx_user_skill_tags_user ON public.user_skill_tags(user_id);

ALTER TABLE public.skill_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skill_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_skill_tags_all" ON public.skill_tags
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_user_skill_tags_all" ON public.user_skill_tags
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_read_skill_tags" ON public.skill_tags
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_read_own_tags" ON public.user_skill_tags
  FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "user_insert_own_tags" ON public.user_skill_tags
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "user_delete_own_tags" ON public.user_skill_tags
  FOR DELETE TO authenticated USING (user_id = auth.uid()::text);

-- 种子数据：IT行业
INSERT INTO public.skill_tags (name, category, seniority_level, industry_tags, description) VALUES
  ('JavaScript', '编程语言', 'entry', ARRAY['IT'], '前端/全栈基础编程语言'),
  ('TypeScript', '编程语言', 'mid', ARRAY['IT'], 'JavaScript的超集，支持类型系统'),
  ('Python', '编程语言', 'entry', ARRAY['IT'], '通用编程语言，广泛用于后端、数据科学'),
  ('Java', '编程语言', 'mid', ARRAY['IT'], '企业级后端开发语言'),
  ('Go', '编程语言', 'senior', ARRAY['IT'], '高性能后端语言，适合云原生开发'),
  ('React', '框架', 'mid', ARRAY['IT'], '前端UI框架，组件化开发模式'),
  ('Vue.js', '框架', 'entry', ARRAY['IT'], '渐进式前端框架，易上手'),
  ('Spring Boot', '框架', 'mid', ARRAY['IT'], 'Java企业级微服务框架'),
  ('Django', '框架', 'mid', ARRAY['IT'], 'Python全栈Web框架'),
  ('MySQL', '数据库', 'entry', ARRAY['IT'], '关系型数据库，广泛用于Web应用'),
  ('PostgreSQL', '数据库', 'mid', ARRAY['IT'], '高级关系型数据库，支持JSON和扩展'),
  ('MongoDB', '数据库', 'entry', ARRAY['IT'], 'NoSQL文档数据库'),
  ('Git', '工具', 'entry', ARRAY['IT'], '分布式版本控制系统'),
  ('Docker', '工具', 'mid', ARRAY['IT'], '容器化应用部署工具'),
  ('Jenkins', '工具', 'mid', ARRAY['IT'], '持续集成/持续部署自动化工具'),
  ('Kubernetes', '工具', 'senior', ARRAY['IT'], '容器编排平台，管理微服务集群'),
  ('需求分析', '软技能', 'entry', ARRAY['IT'], '理解和梳理业务需求的能力'),
  ('技术方案设计', '软技能', 'senior', ARRAY['IT'], '系统架构与技术选型方案制定'),
  ('代码审查', '软技能', 'mid', ARRAY['IT'], 'Code Review 与代码质量把控')
ON CONFLICT (name) DO NOTHING;

-- 种子数据：制造行业
INSERT INTO public.skill_tags (name, category, seniority_level, industry_tags, description) VALUES
  ('锂电池工艺', '生产工艺', 'mid', ARRAY['制造','电池'], '锂电池生产全流程工艺控制'),
  ('SMT贴片', '生产工艺', 'entry', ARRAY['制造','电子'], '表面贴装技术工艺'),
  ('注塑工艺', '生产工艺', 'entry', ARRAY['制造'], '注塑成型工艺参数调试与优化'),
  ('冲压工艺', '生产工艺', 'entry', ARRAY['制造','汽车'], '金属冲压成型工艺'),
  ('六西格玛', '质量管理', 'senior', ARRAY['制造'], '六西格玛质量管理方法论'),
  ('SPC', '质量管理', 'mid', ARRAY['制造'], '统计过程控制，监控生产稳定性'),
  ('FMEA', '质量管理', 'mid', ARRAY['制造'], '失效模式与影响分析'),
  ('8D报告', '质量管理', 'entry', ARRAY['制造'], '八步问题解决法报告编写'),
  ('ISO9001', '质量管理', 'entry', ARRAY['制造'], 'ISO9001质量管理体系标准'),
  ('PLC编程', '设备维护', 'mid', ARRAY['制造','自动化'], '可编程逻辑控制器编程'),
  ('设备调试', '设备维护', 'entry', ARRAY['制造'], '生产设备安装与调试'),
  ('预防性维护', '设备维护', 'mid', ARRAY['制造'], '设备预防性保养计划制定与执行'),
  ('精益生产', '行业知识', 'senior', ARRAY['制造'], '精益生产体系与方法'),
  ('成本控制', '行业知识', 'mid', ARRAY['制造'], '生产成本分析与控制'),
  ('生产线平衡', '行业知识', 'mid', ARRAY['制造'], '产线节拍优化与效率提升')
ON CONFLICT (name) DO NOTHING;

-- 种子数据：HR行业
INSERT INTO public.skill_tags (name, category, seniority_level, industry_tags, description) VALUES
  ('招聘流程管理', '招聘', 'entry', ARRAY['HR','互联网'], '全流程招聘管理与优化'),
  ('结构化面试', '招聘', 'entry', ARRAY['HR'], '标准化面试流程设计与实施'),
  ('人才mapping', '招聘', 'senior', ARRAY['HR','互联网'], '人才图谱与竞争对手人才分析'),
  ('校园招聘', '招聘', 'entry', ARRAY['HR','教育'], '校招全流程策划与执行'),
  ('薪酬体系设计', '薪酬', 'senior', ARRAY['HR'], '薪资架构设计与宽带薪酬'),
  ('绩效管理', '薪酬', 'mid', ARRAY['HR'], '绩效考核体系搭建与运营'),
  ('岗位评估', '薪酬', 'mid', ARRAY['HR'], '岗位价值评估与职级体系'),
  ('劳动法', '员工关系', 'mid', ARRAY['HR','法律'], '劳动法律法规与用工风险防范'),
  ('员工关系管理', '员工关系', 'entry', ARRAY['HR'], '员工入转调离与沟通管理'),
  ('组织发展', '员工关系', 'senior', ARRAY['HR'], '组织架构设计与变革管理'),
  ('北森系统', 'HR系统', 'entry', ARRAY['HR'], '北森招聘/绩效系统操作与配置'),
  ('HRIS', 'HR系统', 'mid', ARRAY['HR'], '人力资源信息系统管理与维护'),
  ('数据分析', 'HR系统', 'mid', ARRAY['HR','IT'], '人力资源数据统计与分析')
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE public.skill_tags IS '标准技能标签库，覆盖IT/制造/HR等行业';
COMMENT ON TABLE public.user_skill_tags IS '用户关联的技能标签，含熟练度评级';
