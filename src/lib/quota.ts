/**
 * 用户配额管理模块
 * 从数据库实时查询用户配额，基于会员状态进行功能访问控制
 */

import { getSupabaseAdmin } from '@/lib/supabase';

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

export const FeatureConfig: Record<FeatureType, {
  freeQuota: number;
  memberOnly: boolean;
  requiresBaseReport: boolean;
}> = {
  career_planning: { freeQuota: -1, memberOnly: false, requiresBaseReport: false },
  interview: { freeQuota: 3, memberOnly: false, requiresBaseReport: false },
  assessment: { freeQuota: 1, memberOnly: false, requiresBaseReport: false },
  competency: { freeQuota: 0, memberOnly: true, requiresBaseReport: true },
  decision: { freeQuota: 3, memberOnly: false, requiresBaseReport: false },
  resume_optimize: { freeQuota: 0, memberOnly: false, requiresBaseReport: false }
};

export async function getUserProfile(userId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_type, member_expires_at')
    .eq('user_id', userId)
    .maybeSingle();
  
  if (error || !data) {
    return { userType: 'free', memberExpiresAt: null };
  }
  return { 
    userType: data.user_type || 'free',
    memberExpiresAt: data.member_expires_at 
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
    return {
      monthly_quota: 10,
      quota_reset_time: null,
      member_type: profile.userType,
      member_expire_time: profile.memberExpiresAt,
      used_quota: 0,
      interview_quota: 3,
      interview_quota_reset_time: null,
      assessment_quota: 1,
      assessment_quota_reset_time: null
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

export async function isMember(userId: string): Promise<boolean> {
  const profile = await getUserProfile(userId);
  if (profile.userType === 'member') {
    // 检查会员是否过期
    if (profile.memberExpiresAt) {
      const expiresAt = new Date(profile.memberExpiresAt);
      if (expiresAt < new Date()) {
        return false;
      }
    }
    return true;
  }
  return false;
}

function isQuotaExpired(resetTime: string | null): boolean {
  if (!resetTime) return true;
  return new Date(resetTime) < new Date();
}

export async function checkFeatureAccess(
  userId: string,
  feature: FeatureType
): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
  const member = await isMember(userId);
  const quota = await getUserQuota(userId);
  const config = FeatureConfig[feature];
  
  if (member) {
    // 会员可以访问所有功能
    return { allowed: true, remaining: -1 };
  }
  
  if (config.memberOnly) {
    return { 
      allowed: false, 
      reason: '此功能为会员专属，开通会员即可使用' 
    };
  }
  
  if (quota && !isQuotaExpired(quota.quota_reset_time)) {
    const remaining = quota.monthly_quota - quota.used_quota;
    if (remaining > 0) {
      return { allowed: true, remaining };
    }
  }
  
  return { 
    allowed: false, 
    reason: '配额已用完，开通会员可获得无限次使用' 
  };
}

export async function deductQuota(
  userId: string,
  feature: FeatureType
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
}> {
  const member = await isMember(userId);
  const quota = await getUserQuota(userId);
  
  return {
    career_planning: { remaining: -1, unlimited: true },
    interview: { 
      remaining: member ? -1 : (quota?.interview_quota || 3),
      unlimited: member 
    },
    assessment: { 
      remaining: member ? -1 : (quota?.assessment_quota || 1),
      unlimited: member 
    },
    competency: { isMemberOnly: true, hasReport: false },
    decision: { 
      remaining: member ? -1 : (quota?.monthly_quota || 10),
      unlimited: member 
    },
    isMember: member
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
