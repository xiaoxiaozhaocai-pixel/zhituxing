-- ============================================================
-- S6 P4: B 端雇主端 schema
-- Tables: employer_profiles, companies, employer_credit_transactions, candidate_unlocks
-- Function: unlock_candidate (原子扣费 + 24h 去重)
-- Date: 2026-06-12
-- Pricing: 1条=¥10, 100/500/1000三档充值
-- ============================================================

BEGIN;

-- ============================================================
-- 1. companies 企业资料
-- ============================================================
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  industry text,
  size_range text CHECK (size_range IN ('1-50','51-200','201-1000','1000+')),
  city text,
  logo_url text,
  business_license_no text,
  verified boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_companies_industry ON public.companies(industry);
CREATE INDEX IF NOT EXISTS idx_companies_verified ON public.companies(verified) WHERE verified = true;

-- ============================================================
-- 2. employer_profiles 雇主主表
-- ============================================================
CREATE TABLE IF NOT EXISTS public.employer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  role text NOT NULL DEFAULT 'recruiter' CHECK (role IN ('owner','recruiter','viewer')),
  real_name text NOT NULL,
  phone text,
  title text,
  credit_balance int NOT NULL DEFAULT 0 CHECK (credit_balance >= 0),
  total_recharged int NOT NULL DEFAULT 0 CHECK (total_recharged >= 0),
  total_consumed int NOT NULL DEFAULT 0 CHECK (total_consumed >= 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','frozen','disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_employer_profiles_company_id ON public.employer_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_employer_profiles_status ON public.employer_profiles(status);

-- ============================================================
-- 3. employer_credit_transactions 充值/消耗流水
-- ============================================================
CREATE TABLE IF NOT EXISTS public.employer_credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL REFERENCES public.employer_profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('recharge','consume','refund','bonus')),
  amount int NOT NULL,                       -- 正充负扣
  balance_after int NOT NULL CHECK (balance_after >= 0),
  related_candidate_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  related_payment_id text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_credit_tx_employer_id ON public.employer_credit_transactions(employer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_tx_type ON public.employer_credit_transactions(type);

-- ============================================================
-- 4. candidate_unlocks 解锁记录（24h 去重）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.candidate_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL REFERENCES public.employer_profiles(id) ON DELETE CASCADE,
  candidate_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);
CREATE INDEX IF NOT EXISTS idx_unlocks_lookup ON public.candidate_unlocks(employer_id, candidate_user_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_unlocks_candidate ON public.candidate_unlocks(candidate_user_id);

-- ============================================================
-- 5. updated_at 自动更新 trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_companies_updated_at ON public.companies;
CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_employer_profiles_updated_at ON public.employer_profiles;
CREATE TRIGGER trg_employer_profiles_updated_at BEFORE UPDATE ON public.employer_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 6. 财务字段保护 trigger（防直接改余额）
-- ============================================================
CREATE OR REPLACE FUNCTION public.guard_employer_balance()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.credit_balance IS DISTINCT FROM OLD.credit_balance
     OR NEW.total_recharged IS DISTINCT FROM OLD.total_recharged
     OR NEW.total_consumed IS DISTINCT FROM OLD.total_consumed THEN
    IF current_user NOT IN ('postgres','service_role','supabase_admin') THEN
      RAISE EXCEPTION '余额/累计字段不可直接修改，请通过 unlock_candidate / recharge_credits 函数';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_employer_balance ON public.employer_profiles;
CREATE TRIGGER trg_guard_employer_balance BEFORE UPDATE ON public.employer_profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_employer_balance();

-- ============================================================
-- 7. unlock_candidate 原子扣费函数
--    - 24h 内已解锁 → 返回 cached 不扣费
--    - 余额不足 → 返回 insufficient
--    - 成功 → 扣 1 条 + 写流水 + 写解锁记录
-- ============================================================
CREATE OR REPLACE FUNCTION public.unlock_candidate(
  p_employer_id uuid,
  p_candidate_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_existing public.candidate_unlocks%ROWTYPE;
  v_employer public.employer_profiles%ROWTYPE;
  v_new_balance int;
  v_unlock_id uuid;
BEGIN
  -- 1) 24h 内已解锁？
  SELECT * INTO v_existing
  FROM public.candidate_unlocks
  WHERE employer_id = p_employer_id
    AND candidate_user_id = p_candidate_user_id
    AND expires_at > now()
  ORDER BY unlocked_at DESC
  LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'status','cached',
      'message','24小时内已解锁,免费查看',
      'unlock_id', v_existing.id,
      'expires_at', v_existing.expires_at
    );
  END IF;

  -- 2) 锁行查余额
  SELECT * INTO v_employer
  FROM public.employer_profiles
  WHERE id = p_employer_id AND status = 'active'
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','error','message','雇主账号不存在或已冻结');
  END IF;
  IF v_employer.credit_balance < 1 THEN
    RETURN jsonb_build_object('status','insufficient','message','余额不足,请充值','balance', v_employer.credit_balance);
  END IF;

  -- 3) 扣 1 条
  v_new_balance := v_employer.credit_balance - 1;
  UPDATE public.employer_profiles
  SET credit_balance = v_new_balance,
      total_consumed = total_consumed + 1
  WHERE id = p_employer_id;

  -- 4) 写流水
  INSERT INTO public.employer_credit_transactions(
    employer_id, type, amount, balance_after, related_candidate_id, note
  ) VALUES (p_employer_id,'consume',-1,v_new_balance,p_candidate_user_id,'解锁候选人完整画像');

  -- 5) 写解锁记录
  INSERT INTO public.candidate_unlocks(employer_id, candidate_user_id)
  VALUES (p_employer_id, p_candidate_user_id)
  RETURNING id INTO v_unlock_id;

  RETURN jsonb_build_object(
    'status','ok',
    'message','解锁成功',
    'unlock_id', v_unlock_id,
    'balance_after', v_new_balance,
    'expires_at', now() + interval '24 hours'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.unlock_candidate(uuid, uuid) TO authenticated;

-- ============================================================
-- 8. recharge_credits 充值函数（webhook 回调使用）
-- ============================================================
CREATE OR REPLACE FUNCTION public.recharge_credits(
  p_employer_id uuid,
  p_credits int,
  p_payment_id text,
  p_note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_new_balance int;
  v_dup int;
BEGIN
  IF p_credits <= 0 THEN
    RETURN jsonb_build_object('status','error','message','充值条数必须>0');
  END IF;

  -- 幂等：相同 payment_id 不重复入账
  SELECT count(*) INTO v_dup FROM public.employer_credit_transactions
  WHERE related_payment_id = p_payment_id AND type = 'recharge';
  IF v_dup > 0 THEN
    RETURN jsonb_build_object('status','duplicate','message','该订单已入账');
  END IF;

  UPDATE public.employer_profiles
  SET credit_balance = credit_balance + p_credits,
      total_recharged = total_recharged + p_credits
  WHERE id = p_employer_id
  RETURNING credit_balance INTO v_new_balance;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','error','message','雇主账号不存在');
  END IF;

  INSERT INTO public.employer_credit_transactions(
    employer_id, type, amount, balance_after, related_payment_id, note
  ) VALUES (p_employer_id,'recharge',p_credits,v_new_balance,p_payment_id, COALESCE(p_note,'充值'));

  RETURN jsonb_build_object('status','ok','balance_after', v_new_balance);
END;
$$;

-- recharge 仅 service_role 调用（webhook 后端）
REVOKE EXECUTE ON FUNCTION public.recharge_credits(uuid,int,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recharge_credits(uuid,int,text,text) TO service_role;

-- ============================================================
-- 9. RLS policies
-- ============================================================
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employer_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_unlocks ENABLE ROW LEVEL SECURITY;

-- companies
DROP POLICY IF EXISTS "companies_select_member" ON public.companies;
CREATE POLICY "companies_select_member" ON public.companies FOR SELECT USING (
  id IN (SELECT company_id FROM public.employer_profiles WHERE user_id = auth.uid())
  OR auth.uid() = created_by
);
DROP POLICY IF EXISTS "companies_insert_auth" ON public.companies;
CREATE POLICY "companies_insert_auth" ON public.companies
FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "companies_update_creator" ON public.companies;
CREATE POLICY "companies_update_creator" ON public.companies
FOR UPDATE USING (auth.uid() = created_by);

-- employer_profiles
DROP POLICY IF EXISTS "employer_select_self" ON public.employer_profiles;
CREATE POLICY "employer_select_self" ON public.employer_profiles
FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "employer_insert_self" ON public.employer_profiles;
CREATE POLICY "employer_insert_self" ON public.employer_profiles
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "employer_update_self" ON public.employer_profiles;
CREATE POLICY "employer_update_self" ON public.employer_profiles
FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
-- 财务字段由 trigger 守护

-- credit_transactions
DROP POLICY IF EXISTS "credit_tx_select_self" ON public.employer_credit_transactions;
CREATE POLICY "credit_tx_select_self" ON public.employer_credit_transactions
FOR SELECT USING (
  employer_id IN (SELECT id FROM public.employer_profiles WHERE user_id = auth.uid())
);

-- candidate_unlocks
DROP POLICY IF EXISTS "unlocks_select_self" ON public.candidate_unlocks;
CREATE POLICY "unlocks_select_self" ON public.candidate_unlocks
FOR SELECT USING (
  employer_id IN (SELECT id FROM public.employer_profiles WHERE user_id = auth.uid())
);

-- ============================================================
-- 10. comments
-- ============================================================
COMMENT ON TABLE public.employer_profiles IS 'B端雇主主表·关联auth.users·按条计费';
COMMENT ON TABLE public.companies IS '企业资料表·支持营业执照认证';
COMMENT ON TABLE public.employer_credit_transactions IS '雇主credit流水·recharge/consume/refund/bonus';
COMMENT ON TABLE public.candidate_unlocks IS '候选人解锁记录·24h去重';
COMMENT ON FUNCTION public.unlock_candidate IS '原子扣费解锁·24h内重复免费';
COMMENT ON FUNCTION public.recharge_credits IS '充值入账·幂等·仅service_role';

COMMIT;
