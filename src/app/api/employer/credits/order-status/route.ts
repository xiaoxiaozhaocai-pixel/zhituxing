/**
 * S6 P5-B · 雇主充值订单状态轮询
 * GET /api/employer/credits/order-status?order_id=xxx
 *
 * 前端扫码支付后轮询：是否已入账。
 * 检测依据：employer_credit_transactions 中存在 note 含该 order_id 的充值记录
 *          （recharge-callback 回调成功时把 `订单 <order_id>` 写入 note）
 *
 * 返回：
 *  data = { status: 'processing' | 'paid', balance_after?: number }
 */
import { NextRequest } from 'next/server';
import { jsonOk, jsonError } from '@/lib/api-contracts/_shared';
import { EmployerOrderStatusDataSchema } from '@/lib/api-contracts/employer';
import { getEmployerSession } from '@/lib/employer-auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const session = await getEmployerSession(request);
  if (!session) {
    return jsonError('UNAUTHORIZED', '请先登录雇主账号');
  }

  const order_id = request.nextUrl.searchParams.get('order_id');
  if (!order_id || !/^emp_/.test(order_id)) {
    return jsonError('INVALID_REQUEST', '订单号无效');
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // 查询该订单的、归属当前雇主的入账记录（note 标注订单号）
  const { data, error } = await supabase
    .from('employer_credit_transactions')
    .select('type, amount, balance_after, note, created_at')
    .eq('employer_id', session.employerId)
    .eq('type', 'recharge')
    .ilike('note', `%${order_id}%`)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('[employer/order-status] query failed', error);
    return jsonError('INTERNAL_ERROR', '订单状态查询失败');
  }
  if (data && data.length > 0) {
    return jsonOk(null, { status: 'paid', balance_after: data[0].balance_after ?? null });
  }

  return jsonOk(null, { status: 'processing', balance_after: null });
}