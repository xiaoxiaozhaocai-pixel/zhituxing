/**
 * S6 P5-B · 雇主积分流水
 * GET /api/employer/credits/transactions?page=1&page_size=20&type=consume
 */
import { NextRequest } from 'next/server';
import { jsonOk, jsonError } from '@/lib/api-contracts/_shared';
import { EmployerTransactionsDataSchema } from '@/lib/api-contracts/employer';
import { getEmployerSession } from '@/lib/employer-auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_TYPES = ['recharge', 'consume', 'refund', 'adjust'] as const;
type TxType = (typeof ALLOWED_TYPES)[number];

export async function GET(request: NextRequest) {
  const session = await getEmployerSession(request);
  if (!session) {
    return jsonError('UNAUTHORIZED', '请先登录雇主账号');
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('page_size') || '20')));
  const typeRaw = searchParams.get('type');
  const type: TxType | null = typeRaw && (ALLOWED_TYPES as readonly string[]).includes(typeRaw)
    ? (typeRaw as TxType)
    : null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  let query = supabase
    .from('employer_credit_transactions')
    .select(
      'id,type,amount,balance_after,related_candidate_id,related_payment_id,note,created_at',
      { count: 'exact' },
    )
    .eq('employer_id', session.employerId)
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (type) {
    query = query.eq('type', type);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[employer/transactions] query failed', error);
    return jsonError('INTERNAL_ERROR', '流水查询失败');
  }

  const total = count ?? 0;
  return jsonOk(EmployerTransactionsDataSchema, {
    items: (data ?? []).map((row) => ({
      id: row.id,
      type: row.type as TxType,
      amount: row.amount,
      balance_after: row.balance_after,
      related_candidate_id: row.related_candidate_id,
      related_payment_id: row.related_payment_id,
      note: row.note,
      created_at: row.created_at,
    })),
    total,
    page,
    page_size: pageSize,
    has_more: page * pageSize < total,
  });
}
