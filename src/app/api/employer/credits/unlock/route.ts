/**
 * S6 P5-B · 雇主解锁候选人
 * POST /api/employer/credits/unlock
 *   body: { candidate_user_id: uuid }
 *
 * 调用 unlock_candidate(employer_id, candidate_user_id) RPC
 *   - status='cached' 24h 内已解锁，免费返回
 *   - status='ok' 扣 1 条成功
 *   - status='insufficient' 余额不足 → 429 QUOTA_EXCEEDED
 *   - status='error' 业务异常 → 400 BUSINESS_ERROR
 */
import { NextRequest } from 'next/server';
import { jsonOk, jsonError, parseRequestBody } from '@/lib/api-contracts/_shared';
import {
  EmployerUnlockRequestSchema,
  EmployerUnlockDataSchema,
} from '@/lib/api-contracts/employer';
import { getEmployerSession } from '@/lib/employer-auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const session = await getEmployerSession(request);
  if (!session) {
    return jsonError('UNAUTHORIZED', '请先登录雇主账号');
  }

  // 限流：每雇主 30 次/分钟（防误点连刷）
  const rl = checkRateLimit(`employer-unlock:${session.employerId}`, { maxRequests: 30, windowMs: 60_000 });
  if (!rl.success) {
    return jsonError('RATE_LIMITED', '请求过于频繁，请稍后再试');
  }

  const parsed = await parseRequestBody(request, EmployerUnlockRequestSchema);
  if (!parsed.ok) return parsed.response;
  const { candidate_user_id } = parsed.data;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { data, error } = await supabase.rpc('unlock_candidate', {
    p_employer_id: session.employerId,
    p_candidate_user_id: candidate_user_id,
  });

  if (error) {
    console.error('[employer/unlock] rpc error', error);
    return jsonError('INTERNAL_ERROR', '解锁失败：' + error.message);
  }

  // RPC 返回 jsonb：{ status, message, unlock_id?, balance_after?, expires_at?, balance? }
  const result = data as {
    status: 'ok' | 'cached' | 'insufficient' | 'error';
    message: string;
    unlock_id?: string;
    balance_after?: number;
    expires_at?: string;
    balance?: number;
  };

  if (result.status === 'insufficient') {
    return jsonError('QUOTA_EXCEEDED', result.message, {
      details: { balance: result.balance ?? 0 },
    });
  }
  if (result.status === 'error') {
    return jsonError('BUSINESS_ERROR', result.message);
  }

  // ok / cached 走成功通道
  return jsonOk(EmployerUnlockDataSchema, {
    status: result.status,
    unlock_id: result.unlock_id!,
    expires_at: result.expires_at!,
    balance_after: result.balance_after ?? null,
    message: result.message,
  });
}
