/**
 * S6 P5-B · 雇主余额查询
 * GET /api/employer/credits/balance
 */
import { NextRequest } from 'next/server';
import { jsonOk, jsonError } from '@/lib/api-contracts/_shared';
import { EmployerBalanceDataSchema } from '@/lib/api-contracts/employer';
import { getEmployerSession } from '@/lib/employer-auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const session = await getEmployerSession(request);
  if (!session) {
    return jsonError('UNAUTHORIZED', '请先登录雇主账号');
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { data, error } = await supabase
    .from('employer_profiles')
    .select('credit_balance,total_recharged,total_consumed')
    .eq('id', session.employerId)
    .single();

  if (error || !data) {
    console.error('[employer/balance] query failed', error);
    return jsonError('INTERNAL_ERROR', '余额查询失败');
  }

  return jsonOk(EmployerBalanceDataSchema, {
    credit_balance: data.credit_balance,
    total_recharged: data.total_recharged,
    total_consumed: data.total_consumed,
  });
}
