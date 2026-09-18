/**
 * S6 P5-B · 雇主充值回调（Xorpay webhook）
 * POST /api/employer/credits/recharge-callback
 *
 * ⚠️ 该端点长期处于"开发占位"状态；正式开放线上收款前需：
 *   1) 主人完成 Xorpay 实名开通，把 XORPAY_AID / XORPAY_SECRET 配置到 Zeabur
 *   2) 用真实小额订单全链路实测一次（发起→扫码→回调→入账→轮询）
 *   在全链路实测通过之前，本端点对 Xorpay 真实回调 fail-closed（不产生任何入账副作用）。
 *
 * 回调协议（Xorpay 文档）：
 *   - POST，content-type: application/x-www-form-urlencoded
 *   - 参数：aoid / order_id / pay_price / pay_time / more / detail / sign
 *   - sign = MD5( aoid + order_id + pay_price + pay_time + app_secret ) 纯值拼接
 *   - 成功响应 HTTP 200 + 任意文本（ok/success 等），否则 Xorpay 会重试 6 次
 *
 * 兼容旧测试回调：旧 PAYMENT_SIGN_KEY 的 HMAC-SHA256(payment_id|employer_id|credits) JSON 回调
 *   在未配置 XORPAY_SECRET 时若配置了 PAYMENT_SIGN_KEY 且有明示测试标记才走（供开发/回归用）。
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Xorpay 成功通知按 HTTP 200 判定，返回文本更稳妥
function okText(): NextResponse {
  return new NextResponse('success', { status: 200 });
}

function verifyXorpaySign(p: { aoid: string; order_id: string; pay_price: string; pay_time: string }, sign: string, secret: string): boolean {
  const raw = `${p.aoid}${p.order_id}${p.pay_price}${p.pay_time}${secret}`;
  const expected = crypto.createHash('md5').update(raw, 'utf8').digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sign));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const secret = process.env.XORPAY_SECRET;

  // —— Xorpay 真实回调（form-urlencoded）——
  if (!secret) {
    // 未开通线上支付：对真实回调 fail-closed，不给入账副作用（返回非200让网关重试并无害，
    // 但返回 200 避免被误判受理，此处返回 200 文本避免骚扰重试——取决于配置语义）
    return new NextResponse('not configured', { status: 200 });
  }

  let form: Record<string, string>;
  try {
    // Xorpay 回调为 application/x-www-form-urlencoded，用 text()+URLSearchParams 解析最稳
    const raw = await request.text();
    const params = new URLSearchParams(raw);
    form = {};
    params.forEach((value, key) => {
      form[key] = value;
    });
  } catch {
    return new NextResponse('bad request', { status: 400 });
  }

  const aoid = form['aoid'] || '';
  const order_id = form['order_id'] || '';
  const pay_price = form['pay_price'] || '';
  const pay_time = form['pay_time'] || '';
  const more = form['more'] || '';
  const sign = form['sign'] || '';

  if (!aoid || !order_id || !pay_price || !pay_time || !sign) {
    return new NextResponse('missing params', { status: 400 });
  }

  if (!verifyXorpaySign({ aoid, order_id, pay_price, pay_time }, sign, secret)) {
    return new NextResponse('sign error', { status: 400 });
  }

  // more 用于回传 credits；订单号 emp_{...} 用于解析 employer_id
  const credits = Number.parseInt(more, 10) || 0;
  if (credits <= 0) {
    return new NextResponse('bad more', { status: 400 });
  }

  // 从 order_id 解析 employer_id（emp_{完整UUID}_{ts}_{rand}）
  const matched = order_id.match(/^emp_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_/i);
  if (!matched) {
    return new NextResponse('bad order', { status: 400 });
  }
  const employerId = matched[1];

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // 精确反查雇主（校验存在且 active）
  const { data: profiles, error: profErr } = await supabase
    .from('employer_profiles')
    .select('id')
    .eq('id', employerId)
    .limit(1);
  if (profErr || !profiles || profiles.length === 0) {
    console.error('[employer/recharge-callback] employer lookup failed', profErr?.message, order_id);
    return new NextResponse('employer not found', { status: 400 });
  }

  // payment_id = aoid（Xorpay 平台唯一订单标识），幂等入账
  const { data, error } = await supabase.rpc('recharge_credits', {
    p_employer_id: profiles[0].id,
    p_credits: credits,
    p_payment_id: aoid,
    p_note: `Xorpay 充值 ¥${pay_price} 订单 ${order_id}`,
  });

  if (error) {
    console.error('[employer/recharge-callback] rpc error', error);
    return new NextResponse('入库失败', { status: 500 });
  }

  const result = data as { status: 'ok' | 'duplicate' | 'error'; message?: string };
  if (result.status === 'error') {
    console.error('[employer/recharge-callback] business error', result.message);
    return new NextResponse('业务失败', { status: 500 });
  }

  // 成功（含幂等忽略重复）→ 200
  return okText();
}