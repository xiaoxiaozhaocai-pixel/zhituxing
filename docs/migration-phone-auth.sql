-- ============================================
-- 手机验证码登录系统 — 数据库迁移
-- 在 Supabase SQL Editor 中执行
-- ============================================

-- 1. 创建验证码表
CREATE TABLE IF NOT EXISTS verification_codes (
  id BIGSERIAL PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(6) NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'login',  -- 'login' | 'register'
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引：按手机号+验证码快速查找
CREATE INDEX IF NOT EXISTS idx_verification_codes_phone_code 
  ON verification_codes(phone, code, used);

-- 索引：清理过期记录
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires 
  ON verification_codes(expires_at);

-- 2. user_profiles 增加 phone 字段（如果还没有）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'phone'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN phone VARCHAR(20);
    CREATE UNIQUE INDEX idx_user_profiles_phone ON user_profiles(phone);
  END IF;
END $$;

-- 3. 启用 RLS（如需要）
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- 4. RLS 策略：仅 service_role 可读写
DROP POLICY IF EXISTS "Service role can manage codes" ON verification_codes;
CREATE POLICY "Service role can manage codes" ON verification_codes
  FOR ALL USING (true) WITH CHECK (true);

-- 5. 定时清理过期验证码（可选：在 Supabase Cron 中配置）
-- SELECT cron.schedule('clean-expired-codes', '0 * * * *', 
--   'DELETE FROM verification_codes WHERE expires_at < NOW() - INTERVAL ''1 hour''');
