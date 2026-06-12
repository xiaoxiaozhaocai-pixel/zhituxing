/**
 * POST /api/employer/auth/signup
 * 雇主注册：创建 auth.users + employer_profiles + 可选 companies
 *
 * Body: { email, password, real_name, phone?, title?, company_name? }
 * 成功返回：{ ok: true, data: EmployerAuthData } + 设置登录 cookie
 */

import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { setAuthCookies } from '@/lib/auth-cookies';
import { checkRateLimit } from '@/lib/rate-limit';
import { jsonOk, jsonError } from '@/lib/api-contracts/_shared';
import {
  EmployerSignupRequestSchema,
  EmployerAuthDataSchema,
} from '@/lib/api-contracts/employer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // 限流：5 次 / 60 秒 / IP
    const ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const rl = checkRateLimit(`employer-signup:${ip}`, {
      maxRequests: 5,
      windowMs: 60_000,
    });
    if (!rl.success) {
      return jsonError('RATE_LIMITED', '请求过于频繁，请稍后重试', { status: 429 });
    }

    // 解析+校验请求体
    const raw = await request.json();
    const parsed = EmployerSignupRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return jsonError('INVALID_REQUEST', parsed.error.issues[0]?.message || '请求体格式错误');
    }
    const { email, password, real_name, phone, title, company_name } = parsed.data;

    const supabase = getSupabaseAdmin();

    // 1) 创建 auth.users
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { is_employer: true, real_name },
    });
    if (authErr) {
      const msg = authErr.message || '注册失败';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('registered')) {
        return jsonError('ALREADY_EXISTS', '该邮箱已被注册');
      }
      return jsonError('UPSTREAM_ERROR', msg);
    }
    if (!authData.user) {
      return jsonError('INTERNAL_ERROR', '注册失败：未返回 user');
    }
    const userId = authData.user.id;

    // 2) 创建/复用 company（可选）
    let companyId: string | null = null;
    if (company_name) {
      const { data: existed } = await supabase
        .from('companies')
        .select('id')
        .eq('name', company_name)
        .maybeSingle();

      if (existed) {
        companyId = existed.id;
      } else {
        const { data: comp, error: cErr } = await supabase
          .from('companies')
          .insert({ name: company_name, created_by: userId })
          .select('id')
          .single();
        if (cErr) {
          console.warn('[employer/signup] company insert failed:', cErr.message);
        } else if (comp) {
          companyId = comp.id;
        }
      }
    }

    // 3) 创建 employer_profiles
    const { data: emp, error: empErr } = await supabase
      .from('employer_profiles')
      .insert({
        user_id: userId,
        real_name,
        phone: phone || null,
        title: title || null,
        company_id: companyId,
        role: 'owner',
      })
      .select('id, credit_balance')
      .single();

    if (empErr || !emp) {
      // 回滚 auth.users，避免孤儿
      await supabase.auth.admin.deleteUser(userId).catch(() => {});
      return jsonError(
        'INTERNAL_ERROR',
        `创建雇主资料失败: ${empErr?.message || 'unknown'}`
      );
    }

    // 4) 自动登录（生成 session）
    const { data: session, error: sErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (sErr || !session.session) {
      return jsonError('INTERNAL_ERROR', '注册成功但自动登录失败，请手动登录');
    }

    // 5) 返回 + 设置 cookie
    const response = jsonOk(EmployerAuthDataSchema, {
      employer_id: emp.id,
      user_id: userId,
      email,
      real_name,
      role: 'owner' as const,
      company_id: companyId,
      credit_balance: emp.credit_balance,
    });
    setAuthCookies(
      response,
      session.session.access_token,
      session.session.refresh_token,
      session.session.expires_at!
    );
    return response;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[employer/signup] error:', msg);
    return jsonError('INTERNAL_ERROR', msg || '注册失败');
  }
}
