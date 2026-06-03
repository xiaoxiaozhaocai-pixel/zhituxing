export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getUserProfile, getUserQuotaFromDb } from '@/lib/quota';
import { jsonOk, jsonError, ErrorCode } from '@/lib/api-contracts/_shared';
import { MembershipDataSchema } from '@/lib/api-contracts/membership';

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return jsonError(ErrorCode.UNAUTHORIZED, '请先登录');
    }
    const userId = authResult.id;

    const profile = await getUserProfile(userId);
    const quota = await getUserQuotaFromDb(userId);

    // 计算 is_expired（lifetime 用户永远不过期）
    const isLifetime = profile.userType === 'lifetime';
    const isExpired = !isLifetime && profile.memberExpiresAt
      ? new Date(profile.memberExpiresAt) < new Date()
      : false;

    const isMember = profile.userType !== 'free' && !isExpired;
    const membershipPlan = isMember ? profile.userType : null;

    const monthlyQuota = quota.monthly_quota || 10;
    const usedQuota = quota.used_quota || 0;
    const remainingQuota = Math.max(0, monthlyQuota - usedQuota);

    return jsonOk(MembershipDataSchema, {
      userType: profile.userType,
      membershipType: profile.userType,
      membershipPlan,
      isMember,
      isExpired,
      membershipExpiresAt: isLifetime ? null : (profile.memberExpiresAt ?? null),
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
