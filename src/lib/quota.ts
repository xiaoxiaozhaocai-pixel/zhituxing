/**
 * 用户配额管理模块
 * 从数据库实时查询用户配额，基于会员状态进行功能访问控制
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
}

export type FeatureType = 
  | 'career_planning'
  | 'interview'
  | 'assessment'
  | 'competency'
  | 'decision'
  | 'resume_optimize';

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

  // 优先读 membership_tier（新真相源），fallback 读 user_type（旧字段兼容）
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
    // 自动 upsert 默认记录
    const now = new Date();
    const defaultRecord = {
      user_id: userId,
      monthly_quota: 10,
      used_quota: 0,
      interview_quota: 3,
      assessment_quota: 1,
      member_type: 'free',
      quota_reset_time: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      interview_quota_reset_time: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      assessment_quota_reset_time: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
    const { data: upsertedData, error: upsertError } = await supabase
      .from('user_quotas')
      .upsert(defaultRecord, { onConflict: 'user_id' })
      .select()
      .single();
    if (upsertError || !upsertedData) {
      // fallback 返回默认对象
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
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    return {
      monthly_quota: 10,
      quota_reset_time: futureDate,
      member_type: profile.userType,
      member_expire_time: profile.memberExpiresAt,
      used_quota: 0,
      interview_quota: 3,
      interview_quota_reset_time: futureDate,
      assessment_quota: 1,
      assessment_quota_reset_time: futureDate
    };
  }
  
  return {
    monthly_quota: quota.monthly_quota || 10,
    quota_reset_time: quota.quota_reset_time || null,
    member_type: quota.member_type || profile.userType,
    member_expire_time: quota.member_expires_at || profile.memberExpiresAt,
    used_quota: quota.used_quota || 0,
    interview_quota: quota.interview_quota || 3,
    interview_quota_reset_time: quota.interview_quota_reset_time || null,
    assessment_quota: quota.assessment_quota || 1,
    assessment_quota_reset_time: quota.assessment_quota_reset_time || null
  };
}

/**
 * 获取用户当前 membership_tier（统一真相源）
 * 返回标准化 tier 值，含过期降级逻辑
 */
export async function getMembershipTier(userId: string): Promise<MembershipTier> {
  const profile = await getUserProfile(userId);
  const tier = (profile.userType || 'free') as MembershipTier;

  // 非 lifetime 会员检查是否过期 → 降级为 free
  if (tier !== 'free' && tier !== 'lifetime' && profile.memberExpiresAt) {
    const expiresAt = new Date(profile.memberExpiresAt);
    if (expiresAt < new Date()) {
      return 'free';
    }
  }

  return tier;
}

/**
 * @deprecated 使用 getMembershipTier() 替代
 * 保留以兼容旧调用方
 */
export async function isMember(userId: string): Promise<boolean> {
  const tier = await getMembershipTier(userId);
  return tier !== 'free';
}

function isQuotaExpired(resetTime: string | null): boolean {
  if (!resetTime) return true;
  return new Date(resetTime) < new Date();
}

export async function checkFeatureAccess(
  userId: string,
  feature: FeatureType
): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
  const tier = await getMembershipTier(userId);
  const quota = await getUserQuota(userId);
  const perm = MembershipPermissions[feature];

  // 会员（任意等级）→ 全部功能无限使用
  if (tier !== 'free') {
    return { allowed: true, remaining: -1 };
  }

  // 免费用户 → 检查该功能最低 tier 要求
  if (!tierMeetsMinimum(tier, perm.minTier)) {
    return {
      allowed: false,
      reason: `此功能需${perm.minTier === 'monthly' ? '开通会员' : '升级会员'}即可使用`,
    };
  }

  // 免费用户 → 检查试用配额
  if (perm.freeQuota === -1) {
    return { allowed: true, remaining: -1 };
  }

  if (quota && !isQuotaExpired(quota.quota_reset_time)) {
    const remaining = perm.freeQuota - quota.used_quota;
    if (remaining > 0) {
      return { allowed: true, remaining };
    }
  }

  return {
    allowed: false,
    reason: '免费试用次数已用完，开通会员即可无限使用',
  };
}

export async function deductQuota(
  userId: string,
  _feature: FeatureType
): Promise<{ success: boolean; reason?: string; remaining?: number }> {
  const supabase = getSupabaseAdmin();
  const quota = await getUserQuota(userId);
  
  if (!quota) {
    // 初始化配额
    await supabase.from('user_quotas').insert({
      user_id: userId,
      monthly_quota: 10,
      used_quota: 1,
      quota_reset_time: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });
    return { success: true, remaining: 9 };
  }
  
  const remaining = quota.monthly_quota - quota.used_quota;
  if (remaining <= 0) {
    return { 
      success: false, 
      reason: '配额已用完',
      remaining: 0 
    };
  }
  
  const { error } = await supabase
    .from('user_quotas')
    .update({ 
      used_quota: quota.used_quota + 1,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);
  
  if (error) {
    console.error('扣减配额失败:', error);
    return { success: false, reason: '配额扣减失败' };
  }
  
  return { success: true, remaining: remaining - 1 };
}

export async function getAllQuotas(userId: string): Promise<{
  career_planning: { remaining: number; unlimited: boolean };
  interview: { remaining: number; unlimited: boolean };
  assessment: { remaining: number; unlimited: boolean };
  competency: { isMemberOnly: boolean; hasReport: boolean };
  decision: { remaining: number; unlimited: boolean };
  isMember: boolean;
  tier: MembershipTier;
}> {
  const tier = await getMembershipTier(userId);
  const quota = await getUserQuota(userId);
  const isPaid = tier !== 'free';

  return {
    career_planning: { remaining: -1, unlimited: true },
    interview: {
      remaining: isPaid ? -1 : (quota?.interview_quota || 3),
      unlimited: isPaid,
    },
    assessment: {
      remaining: isPaid ? -1 : (quota?.assessment_quota || 1),
      unlimited: isPaid,
    },
    competency: { isMemberOnly: !isPaid, hasReport: false },
    decision: {
      remaining: isPaid ? -1 : (quota?.monthly_quota || 10),
      unlimited: isPaid,
    },
    isMember: isPaid,
    tier,
  };
}

export async function initUserQuota(userId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('user_quotas').upsert({
    user_id: userId,
    monthly_quota: 10,
    used_quota: 0,
    interview_quota: 3,
    assessment_quota: 1,
    quota_reset_time: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    interview_quota_reset_time: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    assessment_quota_reset_time: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  });
  
  if (error) {
    console.error('初始化用户配额失败:', error);
  }
}
