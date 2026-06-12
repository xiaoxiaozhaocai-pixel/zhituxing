/**
 * S6 P5-B · 雇主充值回调（Xorpay webhook 占位）
 * POST /api/employer/credits/recharge-callback
 *
 * ⚠️ 当前为架子状态：
 *   - 签名校验已实现（HMAC-SHA256(payment_id|employer_id|credits, PAYMENT_SIGN_KEY)）
 *   - 等主人 Xorpay 实名后再对齐真实 webhook payload + 替换签名算法
 *   - 暂用环境变量 PAYMENT_SIGN_KEY 进行简单校验
 *
 * 调用 recharge_credits(employer_id, credits, payment_id, note) RPC（service_role）
 *   - status='ok' 充值入账成功
 *   - status='duplicate' 同 payment_id 已入账（幂等）
 *   - status='error' 业务异常
 */
import { NextRequest } from 'next/server';
import { jsonOk, jsonError, parseRequestBody } from '@/lib/api-contracts/_shared';
import {
  EmployerRechargeCallbackSchema,
  EmployerRechargeCallbackDataSchema,
} from '@/lib/api-contracts/employer';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function verifySign(
  payload: { payment_id: string; employer_id: string; credits: number },
  sign: string,
  key: string,
): boolean {
  // 临时签名规则：HMAC-SHA256(`${payment_id}|${employer_id}|${credits}`, key)
  // Xorpay 实名后改为对方约定算法
  const raw = `${payload.payment_id}|${payload.employer_id}|${payload.credits}`;
  const expected = crypto.createHmac('sha256', key).update(raw).digest('hex');
  // 防 timing attack
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sign));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const parsed = await parseRequestBody(request, EmployerRechargeCallbackSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const signKey = process.env.PAYMENT_SIGN_KEY;
  if (!signKey) {
    console.error('[employer/recharge-callback] PAYMENT_SIGN_KEY not set');
    return jsonError('INTERNAL_ERROR', '支付服务未配置');
  }

  if (!verifySign(
    { payment_id: body.payment_id, employer_id: body.employer_id, credits: body.credits },
    body.sign,
    signKey,
  )) {
    return jsonError('FORBIDDEN', '签名校验失败');
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { data, error } = await supabase.rpc('recharge_credits', {
    p_employer_id: body.employer_id,
    p_credits: body.credits,
    p_payment_id: body.payment_id,
    p_note: body.note ?? null,
  });

  if (error) {
    console.error('[employer/recharge-callback] rpc error', error);
    return jsonError('INTERNAL_ERROR', '充值入账失败：' + error.message);
  }

  const result = data as {
    status: 'ok' | 'duplicate' | 'error';
    message?: string;
    balance_after?: number;
  };

  if (result.status === 'error') {
    return jsonError('BUSINESS_ERROR', result.message ?? '充值入账失败');
  }

  return jsonOk(EmployerRechargeCallbackDataSchema, {
    status: result.status,
    balance_after: result.balance_after ?? null,
    message: result.message ?? (result.status === 'duplicate' ? '该订单已入账' : '充值成功'),
  });
}
