-- 数据贡献单独同意表
-- 依据: 个人信息保护法, 用户数据用于模型训练需单独同意
-- 核心原则: 脱敏+聚合+可选, 与个性化推荐脱钩

CREATE TABLE IF NOT EXISTS data_contribution (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contribution_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  consented_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- RLS
ALTER TABLE data_contribution ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可以查看自己的数据贡献状态"
  ON data_contribution FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的数据贡献设置"
  ON data_contribution FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以修改自己的数据贡献设置"
  ON data_contribution FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "服务端可管理所有数据贡献记录"
  ON data_contribution FOR ALL
  USING (auth.role() = 'service_role');
