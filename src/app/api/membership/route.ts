export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getUserQuotaFromDb } from '@/lib/quota';
import { jsonOk, jsonError, ErrorCode } from '@/lib/api-contracts/_shared';
import { MembershipDataSchema } from '@/lib/api-contracts/membership';

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return jsonError(ErrorCode.UNAUTHORIZED, '请先登录');
    }
    const userId = authResult.id;

    // 直接查询 user_profiles（与 login API 一致，绕过 getUserProfile）
    const supabase = getSupabaseAdmin();
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('user_type, member_expires_at')
      .eq('user_id', userId)
      .maybeSingle();

    const userType = profileData?.user_type || 'free';
    const memberExpiresAt = profileData?.member_expires_at || null;

    const quota = await getUserQuotaFromDb(userId);

    // 计算 is_expired（lifetime 用户永远不过期）
    const isLifetime = userType === 'lifetime';
    const isExpired = !isLifetime && memberExpiresAt
      ? new Date(memberExpiresAt) < new Date()
      : false;

    const isMember = userType !== 'free' && !isExpired;
    const membershipPlan = isMember ? userType : null;

    const monthlyQuota = quota.monthly_quota || 10;
    const usedQuota = quota.used_quota || 0;
    const remainingQuota = Math.max(0, monthlyQuota - usedQuota);

    return jsonOk(MembershipDataSchema, {
      _debug: "inline-v3",
      userType,
      membershipType: userType,
      membershipPlan,
      isMember,
      isExpired,
      membershipExpiresAt: isLifetime ? null : (memberExpiresAt ?? null),
      monthlyQuota,
      usedQuota,
      remainingQuota,
      interviewQuota: quota.interview_quota || 3,
      assessmentQuota: quota.assessment_quota || 1,
    });
  } catch (err) {
    console.error('Membership API error:', err);
    return jsonError(ErrorCode.INTERNAL_ERROR, '服务器错误');
  }
}
