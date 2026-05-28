-- approve_pending_order RPC 函数（事务化审批 + lifetime 防降级）
-- 主控 5/28 18:36 部署 | 修复版（来自 DS 出货 + 主控修 2 处瑕疵）
-- 历史 bug 防御：
--   1. RAISE EXCEPTION 会被 WHEN OTHERS 吞成 500，业务码丢失 → 改用 RETURN code:409
--   2. FOR UPDATE 行锁防并发双开会员

CREATE OR REPLACE FUNCTION approve_pending_order(
  p_order_id UUID,
  p_admin_id UUID,
  p_admin_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_user_profile RECORD;
  v_plan RECORD;
  v_starts_at TIMESTAMPTZ;
  v_expires_at TIMESTAMPTZ;
  v_membership_order_id UUID;
BEGIN
  -- 1. 锁定并检查订单（行锁防并发双开会员）
  SELECT * INTO v_order
  FROM pending_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 404, 'message', '订单不存在');
  END IF;

  IF v_order.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'code', 400, 'message', '订单已是 ' || v_order.status || ' 状态');
  END IF;

  -- 2. 锁定 user_profile（防并发改 user_type）
  SELECT * INTO v_user_profile
  FROM user_profiles
  WHERE user_id = v_order.user_id
  FOR UPDATE;

  -- 3. lifetime 防降级（用 RETURN 提前返回，不要 RAISE EXCEPTION）
  IF v_user_profile.user_type = 'lifetime' AND v_order.plan != 'lifetime' THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 409,
      'message', '用户已是终身会员，无需购买非终身套餐'
    );
  END IF;

  -- 4. 获取 plan 信息
  SELECT * INTO v_plan
  FROM membership_plans
  WHERE plan = v_order.plan;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 400, 'message', '无效的套餐类型');
  END IF;

  -- 5. 计算时间（续费叠加：未过期则从当前 expires_at 续）
  IF v_user_profile.membership_expires_at IS NOT NULL AND v_user_profile.membership_expires_at > NOW() THEN
    v_starts_at := v_user_profile.membership_expires_at;
  ELSE
    v_starts_at := NOW();
  END IF;

  IF v_plan.duration_days IS NULL THEN
    v_expires_at := NULL;  -- lifetime
  ELSE
    v_expires_at := v_starts_at + (v_plan.duration_days || ' days')::INTERVAL;
  END IF;

  -- 6. 插入 membership_orders
  INSERT INTO membership_orders (
    user_id, pending_order_id, plan, amount,
    payment_method, starts_at, expires_at
  )
  VALUES (
    v_order.user_id, p_order_id, v_order.plan, v_order.amount,
    v_order.payment_method, v_starts_at, v_expires_at
  )
  RETURNING id INTO v_membership_order_id;

  -- 7. 更新 user_profiles（lifetime 时 expires_at 真清 NULL）
  UPDATE user_profiles
  SET
    user_type = CASE WHEN v_plan.duration_days IS NULL THEN 'lifetime' ELSE 'member' END,
    membership_type = v_order.plan,
    membership_expires_at = v_expires_at,
    updated_at = NOW()
  WHERE user_id = v_order.user_id;

  -- 8. mark pending_orders approved
  UPDATE pending_orders
  SET
    status = 'approved',
    admin_note = p_admin_note,
    approved_at = NOW(),
    approved_by = p_admin_id,
    updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'code', 200,
    'message', '审批成功',
    'data', jsonb_build_object(
      'id', v_membership_order_id,
      'user_id', v_order.user_id,
      'plan', v_order.plan,
      'starts_at', v_starts_at,
      'expires_at', v_expires_at
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 500,
      'message', '审批失败：' || SQLERRM
    );
END;
$$;
