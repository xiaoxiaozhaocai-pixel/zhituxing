-- ============================================
-- 生物识别信息单独同意记录表
-- 依据：《个人信息保护法》第29条
-- 用途：记录用户对AI模拟面试中生物特征数据处理的单独同意
-- ============================================

CREATE TABLE IF NOT EXISTS biometric_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- 同意状态
  consent_granted BOOLEAN NOT NULL DEFAULT false,
  
  -- 告知内容（当时展示给用户的完整文本，不可篡改快照）
  consent_purpose TEXT NOT NULL DEFAULT 'AI面试生物特征识别',
  data_processing_scope TEXT NOT NULL DEFAULT '面试过程中的语音特征、面部表情特征、回答内容的行为特征分析，用于评估面试表现和提供改进建议',
  retention_period TEXT NOT NULL DEFAULT '面试会话结束后立即删除，不保留原始生物特征数据',
  
  -- 时间戳
  consented_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  
  -- 操作来源（用于审计追踪）
  ip_address TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- 每个用户只有一条记录（upsert 模式）
  UNIQUE(user_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_biometric_consent_user_id ON biometric_consent(user_id);
CREATE INDEX IF NOT EXISTS idx_biometric_consent_granted ON biometric_consent(consent_granted);

COMMENT ON TABLE biometric_consent IS '生物识别信息单独同意记录 - 个保法第29条合规';
COMMENT ON COLUMN biometric_consent.consent_purpose IS '处理目的（快照，不可篡改）';
COMMENT ON COLUMN biometric_consent.data_processing_scope IS '处理范围（快照，不可篡改）';
COMMENT ON COLUMN biometric_consent.retention_period IS '保存期限（快照，不可篡改）';
COMMENT ON COLUMN biometric_consent.withdrawn_at IS '撤回时间，非空表示用户已撤回同意';
