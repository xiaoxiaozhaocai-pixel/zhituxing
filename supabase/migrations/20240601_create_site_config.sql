-- Migration: 20240601_create_site_config
-- Feature Flag 基础设施：site_config 表

CREATE TABLE IF NOT EXISTS site_config (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_config_key ON site_config(key);

ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_site_config" ON site_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 插入初始 flag 数据
INSERT INTO site_config (key, enabled, description) VALUES
  ('context_compression', true, '三层混合上下文压缩'),
  ('xiaozhi_v2', true, '小职调度链 v0.1'),
  ('interview_multi_style', false, '多风格面试官'),
  ('resume_editor', false, '可交互简历编辑器'),
  ('cost_dashboard', false, '成本监控看板'),
  ('voice_feedback', false, 'TTS语音反馈')
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE site_config IS 'Feature Flag 配置表，控制功能开关';
COMMENT ON COLUMN site_config.key IS '功能标识符，与 FeatureFlag 枚举对应';
COMMENT ON COLUMN site_config.enabled IS '是否启用';
