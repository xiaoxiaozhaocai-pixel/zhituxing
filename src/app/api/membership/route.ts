import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { jsonOk, jsonError, ErrorCode } from '@/lib/api-contracts/_shared';
import { MembershipDataSchema } from '@/lib/api-contracts/membership';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return jsonError(ErrorCode.UNAUTHORIZED, '请先登录');
    }
    const userId = authResult.id;

    // 直接内联查询，绕过 getUserProfile 和 getUserQuotaFromDb
    const supabaseAdmin = getSupabaseAdmin();
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('user_type, membership_type, membership_tier, membership_expires_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('[Membership] profile query error:', profileError);
    }

    // 优先读 membership_tier（新真相源），fallback 读 user_type/membership_type（旧字段兼容）
    const membershipTier = profile?.membership_tier || profile?.membership_type || profile?.user_type || 'free';
    const userType = profile?.user_type || membershipTier;
    const membershipType = profile?.membership_type || userType;
    const membershipExpiresAt = profile?.membership_expires_at || null;

    const isLifetime = membershipTier === 'lifetime';
    const isExpired = !isLifetime && membershipExpiresAt
      ? new Date(membershipExpiresAt) < new Date()
      : false;
    const isMember = membershipTier !== 'free' && !isExpired;
    const membershipPlan = isMember ? membershipTier : null;

    // 查询配额
    const { data: quota } = await supabaseAdmin
      .from('user_quotas')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const monthlyQuota = quota?.monthly_quota || 10;
    const usedQuota = quota?.used_quota || 0;
    const remainingQuota = Math.max(0, monthlyQuota - usedQuota);

    return jsonOk(MembershipDataSchema, {
      membershipTier,
      userType,
      membershipType,
      membershipPlan,
      isMember,
      isExpired,
      membershipExpiresAt: isLifetime ? null : membershipExpiresAt,
      monthlyQuota,
      usedQuota,
      remainingQuota,
      interviewQuota: quota?.interview_quota || 3,
      assessmentQuota: quota?.assessment_quota || 1,
    });
  } catch (err) {
    console.error('Membership API error:', err);
    return jsonError(ErrorCode.INTERNAL_ERROR, '服务器错误');
  }
}
