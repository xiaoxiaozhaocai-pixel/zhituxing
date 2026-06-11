-- ============================================================
-- 001_membership_v2: 会员数据层重构
-- 统一真相源：membership_tier + membership_subscriptions + audit_log
-- 不删旧字段：user_type / membership_type / membership_expires_at 保留
-- ============================================================

-- 1. user_profiles 新增 membership_tier 字段
ALTER TABLE IF EXISTS user_profiles
  ADD COLUMN IF NOT EXISTS membership_tier TEXT DEFAULT 'free'
  CHECK (membership_tier IN ('free', 'monthly', 'semester', 'annual', 'lifetime'));

-- 2. 数据迁移：将现有 user_type 值复制到 membership_tier
-- 处理 member→monthly 等映射（旧数据中 user_type='member' 统一为 monthly）
UPDATE user_profiles
SET membership_tier = CASE
  WHEN user_type = 'lifetime' THEN 'lifetime'
  WHEN user_type = 'annual' THEN 'annual'
  WHEN user_type = 'semester' THEN 'semester'
  WHEN user_type = 'monthly' THEN 'monthly'
  WHEN user_type = 'member' THEN 'monthly'
  ELSE 'free'
END
WHERE membership_tier = 'free' OR membership_tier IS NULL;

-- 也可以用 membership_type 做二次补填（user_type 可能为 NULL 或非标值）
UPDATE user_profiles
SET membership_tier = CASE
  WHEN membership_type = 'lifetime' THEN 'lifetime'
  WHEN membership_type = 'annual' THEN 'annual'
  WHEN membership_type = 'semester' THEN 'semester'
  WHEN membership_type = 'monthly' THEN 'monthly'
  WHEN membership_type = 'member' THEN 'monthly'
  ELSE membership_tier
END
WHERE (membership_tier = 'free' OR membership_tier IS NULL);

-- 3. 新建 membership_subscriptions 表
CREATE TABLE IF NOT EXISTS membership_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('monthly','semester','annual','lifetime')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,  -- NULL for lifetime
  auto_renew BOOLEAN DEFAULT false,
  payment_method TEXT,
  amount_paid NUMERIC(10,2),
  order_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  cancelled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON membership_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON membership_subscriptions(status);

-- 4. 新建 membership_audit_log 表
CREATE TABLE IF NOT EXISTS membership_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('activate','expire','upgrade','downgrade','cancel','renew')),
  from_tier TEXT,
  to_tier TEXT,
  triggered_by TEXT NOT NULL DEFAULT 'system' CHECK (triggered_by IN ('system','manual','payment')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON membership_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON membership_audit_log(created_at);

-- 5. RLS 策略：membership_subscriptions
ALTER TABLE membership_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'membership_subscriptions'
      AND policyname = 'users_read_own_subscriptions'
  ) THEN
    CREATE POLICY "users_read_own_subscriptions"
      ON membership_subscriptions
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'membership_subscriptions'
      AND policyname = 'service_role_all_subscriptions'
  ) THEN
    CREATE POLICY "service_role_all_subscriptions"
      ON membership_subscriptions
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

-- 6. RLS 策略：membership_audit_log
ALTER TABLE membership_audit_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'membership_audit_log'
      AND policyname = 'users_read_own_audit_log'
  ) THEN
    CREATE POLICY "users_read_own_audit_log"
      ON membership_audit_log
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'membership_audit_log'
      AND policyname = 'service_role_all_audit_log'
  ) THEN
    CREATE POLICY "service_role_all_audit_log"
      ON membership_audit_log
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;
