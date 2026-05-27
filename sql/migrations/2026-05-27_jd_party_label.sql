-- job_descriptions 表补加 party_label 字段
-- 执行时间：2026-05-27
-- 用途：标识岗位是甲方还是乙方（参考 基础设定/agents/_standards.md 的枚举：甲方/乙方）
-- 执行者：人工在 Supabase Dashboard SQL Editor 执行
-- 风险：低（ADD COLUMN IF NOT EXISTS 幂等，不影响现有数据）

ALTER TABLE public.job_descriptions 
ADD COLUMN IF NOT EXISTS party_label TEXT;

-- 校验
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'job_descriptions' 
  AND column_name = 'party_label';
-- 期望：返回 1 行，data_type=text, is_nullable=YES