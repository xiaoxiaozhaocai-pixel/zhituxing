/**
 * POST /api/employer/auth/login
 * 雇主登录：邮箱+密码·必须存在 employer_profiles 且 status='active'
 *
 * Body: { email, password }
 * 成功返回：{ ok: true, data: EmployerAuthData } + 设置登录 cookie
 */

import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { setAuthCookies } from '@/lib/auth-cookies';
import { checkRateLimit } from '@/lib/rate-limit';
import { jsonOk, jsonError } from '@/lib/api-contracts/_shared';
import {
  EmployerLoginRequestSchema,
  EmployerAuthDataSchema,
} from '@/lib/api-contracts/employer';
import { getEmployerProfileRaw } from '@/lib/employer-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const rl = checkRateLimit(`employer-login:${ip}`, {
      maxRequests: 5,
      windowMs: 60_000,
    });
    if (!rl.success) {
      return jsonError('RATE_LIMITED', '请求过于频繁，请稍后重试', { status: 429 });
    }

    const raw = await request.json();
    const parsed = EmployerLoginRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return jsonError('MISSING_FIELD', '请输入邮箱和密码');
    }
    const { email, password } = parsed.data;

    const supabase = getSupabaseAdmin();
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (authErr || !authData.user || !authData.session) {
      return jsonError('UNAUTHORIZED', '邮箱或密码错误', { status: 401 });
    }

    // 检查 employer_profiles
    const emp = await getEmployerProfileRaw(authData.user.id);
    if (!emp) {
      return jsonError('FORBIDDEN', '该账号不是雇主账号', { status: 403 });
    }
    if (emp.status === 'frozen') {
      return jsonError('FORBIDDEN', '账号已冻结，请联系客服', { status: 403 });
    }
    if (emp.status === 'disabled') {
      return jsonError('FORBIDDEN', '账号已禁用', { status: 403 });
    }

    const response = jsonOk(EmployerAuthDataSchema, {
      employer_id: emp.id,
      user_id: authData.user.id,
      email: authData.user.email ?? null,
      real_name: emp.real_name,
      role: emp.role,
      company_id: emp.company_id,
      credit_balance: emp.credit_balance,
    });
    setAuthCookies(
      response,
      authData.session.access_token,
      authData.session.refresh_token,
      authData.session.expires_at!
    );
    return response;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[employer/login] error:', msg);
    return jsonError('INTERNAL_ERROR', msg || '登录失败');
  }
}
