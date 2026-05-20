/**
 * 用户配额管理模块 V2
 * 暂时禁用 quota 检查，让所有功能都可以正常使用
 * 原因：Supabase 中没有 users 表，quota 系统暂时无法工作
 */

export interface UserQuota {
  monthly_quota: number;
  quota_reset_time: string;
  member_type: string;
  member_expire_time: string | null;
  interview_quota: number;
  interview_quota_reset_time: string;
  assessment_quota: number;
  assessment_quota_reset_time: string;
}

/**
 * 功能类型枚举
 */
export type FeatureType = 
  | 'career_planning'  // 职业规划 - 完全免费
  | 'interview'       // 模拟面试 - 免费3次
  | 'assessment'       // 能力测评 - 基础版免费
  | 'competency'       // 胜任力评估 - 仅会员
  | 'decision'         // 考研就业决策 - 基础版免费
  | 'resume_optimize'; // 简历优化 - 付费

/**
 * 功能权限配置
 */
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

/**
 * 获取用户配额信息 - 暂时返回默认值
 */
export async function getUserQuota(userId: string): Promise<UserQuota | null> {
  // 暂时返回默认配额，不查询数据库
  return {
    monthly_quota: 10,
    quota_reset_time: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    member_type: 'free',
    member_expire_time: null,
    interview_quota: 3,
    interview_quota_reset_time: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    assessment_quota: 1,
    assessment_quota_reset_time: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  };
}

/**
 * 检查用户是否为会员 - 暂时返回 false
 */
export async function isMember(userId: string): Promise<boolean> {
  // 暂时返回 false，所有用户都按免费用户处理
  return false;
}

/**
 * 检查功能是否可用 - 暂时全部返回可用
 */
export async function checkFeatureAccess(
  userId: string,
  feature: FeatureType
): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
  // 暂时让所有功能都可用（除了 competency 会员专属）
  if (feature === 'competency') {
    return { 
      allowed: false, 
      reason: '此功能为会员专属，开通会员即可使用' 
    };
  }
  
  // 所有其他功能都可用
  return { allowed: true, remaining: 10 };
}

/**
 * 扣减配额 - 暂时不做任何操作
 */
export async function deductQuota(
  userId: string,
  feature: FeatureType
): Promise<{ success: boolean; reason?: string; remaining?: number }> {
  // 暂时不扣减，直接返回成功
  return { success: true, remaining: 10 };
}

/**
 * 获取用户各功能剩余配额 - 暂时返回默认值
 */
export async function getAllQuotas(userId: string): Promise<{
  career_planning: { remaining: number; unlimited: boolean };
  interview: { remaining: number; unlimited: boolean };
  assessment: { remaining: number; unlimited: boolean };
  competency: { isMemberOnly: boolean; hasReport: boolean };
  decision: { remaining: number; unlimited: boolean };
  isMember: boolean;
}> {
  return {
    career_planning: { remaining: -1, unlimited: true },
    interview: { remaining: 3, unlimited: false },
    assessment: { remaining: 1, unlimited: false },
    competency: { isMemberOnly: true, hasReport: false },
    decision: { remaining: 3, unlimited: false },
    isMember: false
  };
}

/**
 * 初始化用户配额 - 暂时不做任何操作
 */
export async function initUserQuota(userId: string): Promise<void> {
  // 暂时不初始化
}
