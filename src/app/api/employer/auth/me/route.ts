/**
 * GET /api/employer/auth/me
 * 获取当前登录雇主的信息（含余额、公司、角色）
 */

import { NextRequest } from 'next/server';
import { getEmployerSession } from '@/lib/employer-auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { jsonOk, jsonError } from '@/lib/api-contracts/_shared';
import { EmployerMeDataSchema } from '@/lib/api-contracts/employer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const session = await getEmployerSession(request);
  if (!session) {
    return jsonError('UNAUTHORIZED', '请先登录雇主账号', { status: 401 });
  }

  let company = null;
  if (session.companyId) {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('companies')
      .select('id, name, industry, size_range, city, verified')
      .eq('id', session.companyId)
      .maybeSingle();
    if (data) {
      company = {
        id: data.id,
        name: data.name,
        industry: data.industry,
        size_range: data.size_range,
        city: data.city,
        verified: data.verified,
      };
    }
  }

  return jsonOk(EmployerMeDataSchema, {
    employer_id: session.employerId,
    user_id: session.userId,
    email: session.email,
    real_name: session.realName,
    role: session.role,
    status: session.status,
    credit_balance: session.creditBalance,
    company,
  });
}
