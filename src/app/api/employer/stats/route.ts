/**
 * S6 P6 · 雇主数据看板
 * GET /api/employer/stats?range_days=30
 *
 * 返回：
 *   - 余额概览（balance/total_recharged/total_consumed）
 *   - 时间窗口内：解锁总数、独立候选人数、当前有效解锁数
 *   - 每日时序（unlocks/consumed）
 *   - 重复解锁 top 候选人
 */
import { NextRequest } from 'next/server';
import { jsonOk, jsonError } from '@/lib/api-contracts/_shared';
import { EmployerStatsDataSchema } from '@/lib/api-contracts/employer';
import { getEmployerSession } from '@/lib/employer-auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const session = await getEmployerSession(request);
  if (!session) {
    return jsonError('UNAUTHORIZED', '请先登录雇主账号');
  }

  const { searchParams } = new URL(request.url);
  const rangeDays = Math.min(180, Math.max(1, parseInt(searchParams.get('range_days') || '30')));

  const now = new Date();
  const rangeStart = new Date(now.getTime() - rangeDays * 24 * 3600 * 1000);
  const rangeStartIso = rangeStart.toISOString();
  const nowIso = now.toISOString();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // 1) 余额概览
  const { data: emp, error: empErr } = await supabase
    .from('employer_profiles')
    .select('credit_balance,total_recharged,total_consumed')
    .eq('id', session.employerId)
    .maybeSingle();

  if (empErr || !emp) {
    console.error('[employer/stats] employer query failed', empErr);
    return jsonError('INTERNAL_ERROR', '雇主信息查询失败');
  }

  // 2) 解锁记录（窗口内）
  const { data: unlocksRows, error: unlocksErr } = await supabase
    .from('candidate_unlocks')
    .select('candidate_user_id,unlocked_at,expires_at')
    .eq('employer_id', session.employerId)
    .gte('unlocked_at', rangeStartIso)
    .order('unlocked_at', { ascending: false })
    .limit(5000);

  if (unlocksErr) {
    console.error('[employer/stats] unlocks query failed', unlocksErr);
    return jsonError('INTERNAL_ERROR', '解锁记录查询失败');
  }

  const unlocks = unlocksRows ?? [];
  const unlocksPartial = unlocks.length >= 5000;

  // 3) 当前有效解锁数（不限窗口）
  const { count: activeCount, error: activeErr } = await supabase
    .from('candidate_unlocks')
    .select('id', { count: 'exact', head: true })
    .eq('employer_id', session.employerId)
    .gt('expires_at', nowIso);

  if (activeErr) {
    console.error('[employer/stats] active count failed', activeErr);
  }

  // 4) 窗口内消耗流水（按日）
  const { data: txRows, error: txErr } = await supabase
    .from('employer_credit_transactions')
    .select('amount,created_at')
    .eq('employer_id', session.employerId)
    .eq('type', 'consume')
    .gte('created_at', rangeStartIso)
    .limit(5000);

  if (txErr) {
    console.error('[employer/stats] tx query failed', txErr);
  }

  const txs = txRows ?? [];
  const txsPartial = txs.length >= 5000;

  // 聚合：每日时序
  const dayMap = new Map<string, { unlocks: number; consumed: number }>();
  // 预填窗口内所有日期为 0
  for (let i = 0; i < rangeDays; i++) {
    const d = new Date(now.getTime() - i * 24 * 3600 * 1000);
    const key = d.toISOString().slice(0, 10);
    dayMap.set(key, { unlocks: 0, consumed: 0 });
  }
  for (const u of unlocks) {
    const k = (u.unlocked_at as string).slice(0, 10);
    const e = dayMap.get(k);
    if (e) e.unlocks += 1;
  }
  for (const t of txs) {
    const k = (t.created_at as string).slice(0, 10);
    const e = dayMap.get(k);
    if (e) e.consumed += Math.abs(Number(t.amount) || 0);
  }
  const daily = Array.from(dayMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, v]) => ({ date, unlocks: v.unlocks, consumed: v.consumed }));

  // 独立候选人 + 重复 top
  const candCounter = new Map<string, { count: number; lastAt: string }>();
  for (const u of unlocks) {
    const cid = u.candidate_user_id as string;
    const prev = candCounter.get(cid);
    if (prev) {
      prev.count += 1;
      if ((u.unlocked_at as string) > prev.lastAt) prev.lastAt = u.unlocked_at as string;
    } else {
      candCounter.set(cid, { count: 1, lastAt: u.unlocked_at as string });
    }
  }
  const topRepeat = Array.from(candCounter.entries())
    .filter(([, v]) => v.count > 1)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([cid, v]) => ({
      candidate_user_id: cid,
      unlock_count: v.count,
      last_unlocked_at: v.lastAt,
    }));

  return jsonOk(EmployerStatsDataSchema, {
    credit_balance: emp.credit_balance ?? 0,
    total_recharged: emp.total_recharged ?? 0,
    total_consumed: emp.total_consumed ?? 0,
    range_days: rangeDays,
    range_start: rangeStartIso,
    range_end: nowIso,
    total_unlocks: unlocks.length,
    unique_candidates: candCounter.size,
    active_unlocks: activeCount ?? 0,
    daily_timeseries: daily,
    top_repeat_candidates: topRepeat,
    data_truncated: unlocksPartial || txsPartial,
  });
}
