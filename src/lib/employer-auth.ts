/**
 * 雇主端鉴权工具
 * 复用 Supabase auth + 检查 employer_profiles 是否存在且 active
 * S6 P4 落地后替代 candidates API 里的 ADMIN_USER_IDS MVP 鉴权
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from './auth';
import { getSupabaseAdmin } from './supabase';

export interface EmployerSession {
  userId: string;          // auth.users.id
  employerId: string;      // employer_profiles.id
  email: string | null;
  realName: string;
  role: 'owner' | 'recruiter' | 'viewer';
  companyId: string | null;
  status: 'active' | 'frozen' | 'disabled';
  creditBalance: number;
}

/**
 * 验证当前登录用户是否为有效雇主
 * 返回 EmployerSession（active 状态）或 null
 */
export async function getEmployerSession(
  request: NextRequest
): Promise<EmployerSession | null> {
  const user = await getAuthenticatedUser(request);
  if (!user) return null;

  const supabase = getSupabaseAdmin();
  const { data: emp, error } = await supabase
    .from('employer_profiles')
    .select('id, real_name, role, company_id, status, credit_balance')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[employer-auth] DB error:', error.message);
    return null;
  }
  if (!emp) return null;
  if (emp.status !== 'active') return null;

  return {
    userId: user.id,
    employerId: emp.id,
    email: user.email,
    realName: emp.real_name,
    role: emp.role,
    companyId: emp.company_id,
    status: emp.status,
    creditBalance: emp.credit_balance,
  };
}

/**
 * 仅做存在性检查（不限定 active 状态）
 * 用于登录时区分"不存在" vs "被冻结"
 */
export async function getEmployerProfileRaw(userId: string) {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('employer_profiles')
    .select('id, real_name, role, company_id, status, credit_balance')
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}
