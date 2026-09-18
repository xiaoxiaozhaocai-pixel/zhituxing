/**
 * S6 P5-B · 雇主充值发起（Xorpay）
 * POST /api/employer/credits/create-order
 *
 * 流程：雇主登录 → 前端选套餐(credits) → 服务端从 Xorpay 套餐配置校验金额
 *      → 生成唯一 order_id → 调 Xorpay /api/pay/{aid} → 返回支付二维码
 *
 * 安全：
 *  - 价格金额一律服务端读取 XORPAY_PACKAGES（JSON），前端只传 credits，金额防篡改
 *  - 未配置 XORPAY_AID / XORPAY_SECRET 时 fail-closed（支付未开通，不改任何数据）
 *  - order_id 服务端生成 `emp_{employerId简短}_{时间戳}_{随机}` 保证唯一
 *
 * 环境变量：
 *  - XORPAY_AID          Xorpay 商户appid（Xorpay后台查看）
 *  - XORPAY_SECRET       Xorpay app secret（签名密钥）
 *  - XORPAY_PACKAGES     JSON: [{"credits":100,"price":99},...]（服务端权威套餐价）
 *  - XORPAY_NOTIFY_URL   回调地址（线上=https://zhituxing.tech/api/employer/credits/recharge-callback）
 */
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { jsonOk, jsonError, parseRequestBody } from '@/lib/api-contracts/_shared';
import { EmployerCreateOrderRequestSchema, EmployerCreateOrderDataSchema } from '@/lib/api-contracts/employer';
import { getEmployerSession } from '@/lib/employer-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// 服务端权威套餐（默认与前端 PACKAGES 一致；生产可经 XORPAY_PACKAGES 覆盖）
const DEFAULT_PACKAGES: Record<number, number> = { 100: 99, 500: 449, 1000: 849 };

function loadPackages(): Record<number, number> {
  try {
    const raw = process.env.XORPAY_PACKAGES;
    if (!raw) return DEFAULT_PACKAGES;
    const list = JSON.parse(raw) as { credits: number; price: number }[];
    const map: Record<number, number> = {};
    for (const p of list) map[p.credits] = p.price;
    return { ...DEFAULT_PACKAGES, ...map };
  } catch {
    return DEFAULT_PACKAGES;
  }
}

function xorpaySign(params: Record<string, string>, secret: string): string {
  // Xorpay 发起签名：MD5( name + pay_type + price + order_id + notify_url + secret ) 纯值拼接
  const raw = `${params.name}${params.pay_type}${params.price}${params.order_id}${params.notify_url}${secret}`;
  return crypto.createHash('md5').update(raw, 'utf8').digest('hex');
}

export async function POST(request: NextRequest) {
  const session = await getEmployerSession(request);
  if (!session) {
    return jsonError('UNAUTHORIZED', '请先登录雇主账号');
  }

  const aid = process.env.XORPAY_AID;
  const secret = process.env.XORPAY_SECRET;
  if (!aid || !secret) {
    // fail-closed：支付未配置时拒绝下单，不改任何数据
    return jsonError('PAYMENT_NOT_CONFIGURED', '线上支付未开通，请联系商务 bd@zhituxing.tech');
  }

  const parsed = await parseRequestBody(request, EmployerCreateOrderRequestSchema);
  if (!parsed.ok) return parsed.response;
  const { credits, pay_type } = parsed.data;

  const packages = loadPackages();
  const price = packages[credits];
  if (price === undefined) {
    return jsonError('INVALID_PACKAGE', '无效的充值套餐');
  }

  // 生成唯一订单号（内含完整 employer_id，回调端据此精确反查）
  const order_id = `emp_${session.employerId}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  const notify_url = process.env.XORPAY_NOTIFY_URL || 'https://zhituxing.tech/api/employer/credits/recharge-callback';
  const name = `职途星雇主充值-${credits}条`;

  const sign = xorpaySign(
    { name: String(name), pay_type: String(pay_type), price: price.toFixed(2), order_id: String(order_id), notify_url: String(notify_url) },
    secret,
  );

  // 请求 Xorpay
  const body = new URLSearchParams();
  body.set('name', String(name));
  body.set('pay_type', String(pay_type));
  body.set('price', price.toFixed(2));
  body.set('order_id', order_id);
  body.set('order_uid', session.employerId);
  body.set('notify_url', notify_url);
  body.set('more', String(credits));
  body.set('expire', '1800');
  body.set('sign', sign);

  let result: { status: string; aoid?: string; info?: { qr?: string }; expires_in?: number; msg?: string };
  try {
    const resp = await fetch(`https://xorpay.com/api/pay/${aid}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      cache: 'no-store',
    });
    result = await resp.json();
  } catch (e) {
    console.error('[employer/create-order] xorpay request failed', e);
    return jsonError('PAYMENT_GATEWAY_ERROR', '支付网关异常，请稍后重试');
  }

  if (result.status !== 'ok' || !result.aoid || !result.info?.qr) {
    console.error('[employer/create-order] xorpay error', result);
    const msg = result.msg || `支付发起失败(${result.status})`;
    return jsonError('PAYMENT_GATEWAY_ERROR', msg);
  }

  return jsonOk(EmployerCreateOrderDataSchema, {
    order_id,
    aoid: result.aoid,
    qr: result.info.qr,
    pay_type,
    credits,
    price,
    expire_seconds: result.expires_in || 1800,
  });
}