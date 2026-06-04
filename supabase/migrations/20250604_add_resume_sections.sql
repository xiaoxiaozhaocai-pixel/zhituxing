-- Migration: 添加简历结构化字段
-- 给 resumes 表添加 sections (JSONB) 和 template_id (varchar) 字段
-- 向后兼容：保留原有 content 字段不变

ALTER TABLE resumes
ADD COLUMN IF NOT EXISTS sections JSONB DEFAULT '{}'::jsonb;

ALTER TABLE resumes
ADD COLUMN IF NOT EXISTS template_id VARCHAR(20) DEFAULT 'simple';

-- 索引：加速按模板过滤查询
CREATE INDEX IF NOT EXISTS idx_resumes_template_id ON resumes(template_id);

COMMENT ON COLUMN resumes.sections IS '简历结构化数据，JSONB格式，包含 personal/education/experience/projects/skills/certificates/selfEval';
COMMENT ON COLUMN resumes.template_id IS '简历模板ID：simple/classic/modern';
