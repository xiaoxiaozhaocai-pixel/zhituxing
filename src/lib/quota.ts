/**
 * 用户配额管理模块 — v3 每日按功能独立计数
 * 从数据库实时查询用户配额，基于会员状态进行功能访问控制
 * 
 * 变更(v3): 配额从共享计数器改为每功能独立日计数器，每日0点自动重置
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import {
  MembershipPermissions,
  tierMeetsMinimum,
  type MembershipTier,
} from '@/config/membership-permissions';

export interface UserQuota {
  monthly_quota: number;
  quota_reset_time: string | null;
  member_type: string;
  member_expire_time: string | null;
  used_quota: number;
  interview_quota: number;
  interview_quota_reset_time: string | null;
  assessment_quota: number;
  assessment_quota_reset_time: string | null;
  resume_optimize_quota: number;
  resume_optimize_reset_time: string | null;
  decision_quota: number;
  decision_reset_time: string | null;
}

export type FeatureType =
  | 'career_planning'
  | 'interview'
  | 'assessment'
  | 'competency'
  | 'decision'
  | 'resume_optimize';

/** 每个功能对应的配额计数器和重置时间字段 */
const FEATURE_QUOTA_FIELDS: Record<FeatureType, { used: keyof UserQuota; reset: keyof UserQuota }> = {
  career_planning: { used: 'used_quota', reset: 'quota_reset_time' },
  interview:       { used: 'interview_quota', reset: 'interview_quota_reset_time' },
  assessment:      { used: 'assessment_quota', reset: 'assessment_quota_reset_time' },
  competency:      { used: 'used_quota', reset: 'quota_reset_time' },
  decision:        { used: 'decision_quota', reset: 'decision_reset_time' },
  resume_optimize: { used: 'resume_optimize_quota', reset: 'resume_optimize_reset_time' },
};

/** 次日 00:00:00 UTC */
function nextMidnight(): string {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.toISOString();
}

export async function getUserProfile(userId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_type, membership_tier, member_expires_at, membership_expires_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return { userType: 'free', memberExpiresAt: null };
  }

  const membershipTier = data.membership_tier || data.user_type;

  return {
    userType: membershipTier || 'free',
    memberExpiresAt: data.membership_expires_at || data.member_expires_at
  };
}

export async function getUserQuotaFromDb(userId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('user_quotas')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    const midnight = nextMidnight();
    const defaultRecord = {
      user_id: userId,
      monthly_quota: 10,
      used_quota: 0,
      interview_quota: 0,
      assessment_quota: 0,
      resume_optimize_quota: 0,
      decision_quota: 0,
      member_type: 'free',
      quota_reset_time: midnight,
      interview_quota_reset_time: midnight,
      assessment_quota_reset_time: midnight,
      resume_optimize_reset_time: midnight,
      decision_reset_time: midnight,
    };
    const { data: upsertedData, error: upsertError } = await supabase
      .from('user_quotas')
      .upsert(defaultRecord, { onConflict: 'user_id' })
      .select()
      .single();
    if (upsertError || !upsertedData) {
      return defaultRecord;
    }
    return upsertedData;
  }
  return data;
}

export async function getUserQuota(userId: string): Promise<UserQuota | null> {
  const profile = await getUserProfile(userId);
  const quota = await getUserQuotaFromDb(userId);

  if (!quota) {
    const midnight = nextMidnight();
    return {
      monthly_quota: 10,
      quota_reset_time: midnight,
      member_type: profile.userType,
      member_expire_time: profile.memberExpiresAt,
      used_quota: 0,
      interview_quota: 0,
      interview_quota_reset_time: midnight,
      assessment_quota: 0,
      assessment_quota_reset_time: midnight,
      resume_optimize_quota: 0,
      resume_optimize_reset_time: midnight,
      decision_quota: 0,
      decision_reset_time: midnight,
    };
  }

  return {
    monthly_quota: quota.monthly_quota || 10,
    quota_reset_time: quota.quota_reset_time || null,
    member_type: quota.member_type || profile.userType,
    member_expire_time: quota.member_expires_at || profile.memberExpiresAt,
    used_quota: quota.used_quota || 0,
    interview_quota: quota.interview_quota || 0,
    interview_quota_reset_time: quota.interview_quota_reset_time || null,
    assessment_quota: quota.assessment_quota || 0,
    assessment_quota_reset_time: quota.assessment_quota_reset_time || null,
    resume_optimize_quota: quota.resume_optimize_quota ?? 0,
    resume_optimize_reset_time: quota.resume_optimize_reset_time || null,
    decision_quota: quota.decision_quota ?? 0,
    decision_reset_time: quota.decision_reset_time || null,
  };
}

/**
 * 获取用户当前 membership_tier（统一真相源）
 */
export async function getMembershipTier(userId: string): Promise<MembershipTier> {
  const profile = await getUserProfile(userId);
  const tier = (profile.userType || 'free') as MembershipTier;

  if (tier !== 'free' && tier !== 'lifetime' && profile.memberExpiresAt) {
    const expiresAt = new Date(profile.memberExpiresAt);
    if (expiresAt < new Date()) {
      return 'free';
    }
  }

  return tier;
}

/** @deprecated 使用 getMembershipTier() 替代 */
export async function isMember(userId: string): Promise<boolean> {
  const tier = await getMembershipTier(userId);
  return tier !== 'free';
}

/** 检查某功能配额是否过期（需重置） */
function isQuotaExpired(resetTime: string | null): boolean {
  if (!resetTime) return true;
  return new Date(resetTime) < new Date();
}

/**
 * v3：按功能独立检查每日配额
 */
export async function checkFeatureAccess(
  userId: string,
  feature: FeatureType
): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
  const tier = await getMembershipTier(userId);
  const quota = await getUserQuota(userId);
  const perm = MembershipPermissions[feature];

  // 会员 → 无限
  if (tier !== 'free') {
    return { allowed: true, remaining: -1 };
  }

  // 免费用户 → 检查功能最低 tier
  if (!tierMeetsMinimum(tier, perm.minTier)) {
    return {
      allowed: false,
      reason: `此功能需${perm.minTier === 'monthly' ? '开通会员' : '升级会员'}即可使用`,
    };
  }

  // 无限配额功能
  if (perm.freeQuota === -1) {
    return { allowed: true, remaining: -1 };
  }

  // 按功能独立检查
  const fields = FEATURE_QUOTA_FIELDS[feature];
  const used = (quota?.[fields.used] as number) || 0;
  const resetTime = quota?.[fields.reset] as string | null;

  // 已过期 → 视为满配额（deductQuota 会重置）
  if (isQuotaExpired(resetTime)) {
    return { allowed: true, remaining: perm.freeQuota };
  }

  const remaining = perm.freeQuota - used;
  if (remaining > 0) {
    return { allowed: true, remaining };
  }

  return {
    allowed: false,
    reason: '免费试用次数已用完，开通会员即可无限使用',
  };
}

/**
 * v3：按功能独立扣减，每日自动重置
 */
export async function deductQuota(
  userId: string,
  feature: FeatureType
): Promise<{ success: boolean; reason?: string; remaining?: number }> {
  const supabase = getSupabaseAdmin();
  const quota = await getUserQuota(userId);
  const perm = MembershipPermissions[feature];
  const fields = FEATURE_QUOTA_FIELDS[feature];

  if (!quota) {
    const midnight = nextMidnight();
    const init: Record<string, unknown> = {
      user_id: userId,
      monthly_quota: 10,
      used_quota: 0,
      interview_quota: 0,
      assessment_quota: 0,
      resume_optimize_quota: 0,
      decision_quota: 0,
      quota_reset_time: midnight,
      interview_quota_reset_time: midnight,
      assessment_quota_reset_time: midnight,
      resume_optimize_reset_time: midnight,
      decision_reset_time: midnight,
    };
    init[fields.used as string] = 1;
    await supabase.from('user_quotas').insert(init);
    return { success: true, remaining: perm.freeQuota - 1 };
  }

  const used = (quota[fields.used] as number) || 0;
  const resetTime = quota[fields.reset] as string | null;
  const expired = isQuotaExpired(resetTime);

  if (!expired && used >= perm.freeQuota) {
    return { success: false, reason: '配额已用完', remaining: 0 };
  }

  const midnight = nextMidnight();
  const newUsed = expired ? 1 : used + 1;

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  update[fields.used as string] = newUsed;
  if (expired) {
    update[fields.reset as string] = midnight;
  }

  const { error } = await supabase
    .from('user_quotas')
    .update(update)
    .eq('user_id', userId);

  if (error) {
    console.error('扣减配额失败:', error);
    return { success: false, reason: '配额扣减失败' };
  }

  return { success: true, remaining: Math.max(0, perm.freeQuota - newUsed) };
}

export async function getAllQuotas(userId: string): Promise<{
  career_planning: { remaining: number; unlimited: boolean };
  interview: { remaining: number; unlimited: boolean };
  assessment: { remaining: number; unlimited: boolean };
  competency: { isMemberOnly: boolean; hasReport: boolean };
  decision: { remaining: number; unlimited: boolean };
  resume_optimize: { remaining: number; unlimited: boolean };
  isMember: boolean;
  tier: MembershipTier;
}> {
  const tier = await getMembershipTier(userId);
  const quota = await getUserQuota(userId);
  const isPaid = tier !== 'free';

  const dailyRemaining = (feature: FeatureType): number => {
    if (isPaid) return -1;
    const perm = MembershipPermissions[feature];
    if (perm.freeQuota === -1) return -1;
    const fields = FEATURE_QUOTA_FIELDS[feature];
    const used = (quota?.[fields.used] as number) || 0;
    const resetTime = quota?.[fields.reset] as string | null;
    if (isQuotaExpired(resetTime)) return perm.freeQuota;
    return Math.max(0, perm.freeQuota - used);
  };

  return {
    career_planning: { remaining: -1, unlimited: true },
    interview:       { remaining: dailyRemaining('interview'), unlimited: isPaid },
    assessment:      { remaining: dailyRemaining('assessment'), unlimited: isPaid },
    competency:      { isMemberOnly: !isPaid, hasReport: false },
    decision:        { remaining: dailyRemaining('decision'), unlimited: isPaid },
    resume_optimize: { remaining: dailyRemaining('resume_optimize'), unlimited: isPaid },
    isMember: isPaid,
    tier,
  };
}

export async function initUserQuota(userId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const midnight = nextMidnight();
  const { error } = await supabase.from('user_quotas').upsert({
    user_id: userId,
    monthly_quota: 10,
    used_quota: 0,
    interview_quota: 0,
    assessment_quota: 0,
    resume_optimize_quota: 0,
    decision_quota: 0,
    quota_reset_time: midnight,
    interview_quota_reset_time: midnight,
    assessment_quota_reset_time: midnight,
    resume_optimize_reset_time: midnight,
    decision_reset_time: midnight,
  });

  if (error) {
    console.error('初始化用户配额失败:', error);
  }
}
