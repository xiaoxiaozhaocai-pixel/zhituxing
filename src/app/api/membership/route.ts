export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getUserProfile, getUserQuotaFromDb } from '@/lib/quota';

export async function GET(request: NextRequest) {
  try {
    // 认证检查
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return NextResponse.json({ code: 401, message: '请先登录' }, { status: 401 });
    }

    const userId = authResult.id;

    // 查询用户画像
    const profile = await getUserProfile(userId);
    
    // 查询用户配额（不存在会自动 upsert 默认记录）
    const quota = await getUserQuotaFromDb(userId);

    // 计算 is_expired（lifetime 用户永远不过期）
    const isLifetime = profile.userType === 'lifetime';
    const isExpired = !isLifetime && profile.memberExpiresAt 
      ? new Date(profile.memberExpiresAt) < new Date()
      : false;

    // 计算剩余配额（负数返0）
    const monthlyQuota = quota.monthly_quota || 10;
    const usedQuota = quota.used_quota || 0;
    const remainingQuota = Math.max(0, monthlyQuota - usedQuota);

    return NextResponse.json({
      code: 200,
      data: {
        user_type: profile.userType,
        membership_type: profile.userType,
        membership_expires_at: isLifetime ? null : profile.memberExpiresAt,
        is_expired: isExpired,
        monthly_quota: monthlyQuota,
        used_quota: usedQuota,
        remaining_quota: remainingQuota,
        interview_quota: quota.interview_quota || 3,
        assessment_quota: quota.assessment_quota || 1,
      }
    });
  } catch (err) {
    console.error('Membership API error:', err);
    return NextResponse.json({ code: 500, message: '服务器错误' }, { status: 500 });
  }
}