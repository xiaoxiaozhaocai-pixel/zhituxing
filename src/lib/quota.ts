/**
 * 用户配额管理模块 V2
 * 按照新的权限策略设计：
 * - AI职业规划：完全免费
 * - AI模拟面试：免费用户3次机会
 * - 专业能力测评：基础版免费
 * - 胜任力评估：仅会员可用
 * - 考研就业决策：基础版免费
 */

import { execSql } from './exec-sql';

export interface UserQuota {
  monthly_quota: number;
  quota_reset_time: string;
  member_type: string;
  member_expire_time: string | null;
  // 新增：模拟面试配额
  interview_quota: number;
  interview_quota_reset_time: string;
  // 新增：能力测评配额
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
  freeQuota: number;        // 免费配额（-1表示无限制）
  memberOnly: boolean;      // 是否仅会员可用
  requiresBaseReport: boolean; // 是否需要先有基础报告
}> = {
  career_planning: {
    freeQuota: -1,  // 无限制，完全免费
    memberOnly: false,
    requiresBaseReport: false
  },
  interview: {
    freeQuota: 3,  // 免费3次
    memberOnly: false,
    requiresBaseReport: false
  },
  assessment: {
    freeQuota: 1,  // 免费1次测评
    memberOnly: false,
    requiresBaseReport: false
  },
  competency: {
    freeQuota: 0,  // 0次，仅会员
    memberOnly: true,
    requiresBaseReport: true  // 需要先有职业规划报告
  },
  decision: {
    freeQuota: 3,  // 免费3次基础分析
    memberOnly: false,
    requiresBaseReport: false
  },
  resume_optimize: {
    freeQuota: 0,  // 0次，完全付费
    memberOnly: false,
    requiresBaseReport: false
  }
};

/**
 * 获取用户配额信息
 */
export async function getUserQuota(userId: string): Promise<UserQuota | null> {
  const result = await execSql(
    `SELECT monthly_quota, quota_reset_time, member_type, member_expire_time,
            interview_quota, interview_quota_reset_time,
            assessment_quota, assessment_quota_reset_time
     FROM users WHERE id = '${userId}' LIMIT 1`
  );
  
  if (!result || result.length === 0) {
    return null;
  }
  
  return result[0] as UserQuota;
}

/**
 * 检查用户是否为会员
 */
export async function isMember(userId: string): Promise<boolean> {
  const user = await getUserQuota(userId);
  
  if (!user) return false;
  
  // 检查会员类型和过期时间
  if (user.member_type === 'free' || !user.member_expire_time) {
    return false;
  }
  
  return new Date(user.member_expire_time) > new Date();
}

/**
 * 检查功能是否可用
 */
export async function checkFeatureAccess(
  userId: string,
  feature: FeatureType
): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
  const config = FeatureConfig[feature];
  
  // 检查会员专属
  if (config.memberOnly) {
    const member = await isMember(userId);
    if (!member) {
      return { 
        allowed: false, 
        reason: '此功能为会员专属，开通会员即可使用' 
      };
    }
  }
  
  // 职业规划完全免费
  if (feature === 'career_planning') {
    return { allowed: true, remaining: -1 };
  }
  
  // 检查配额
  const user = await getUserQuota(userId);
  if (!user) {
    return { allowed: false, reason: '用户不存在' };
  }
  
  let quota = 0;
  let resetTime = new Date();
  
  switch (feature) {
    case 'interview':
      quota = user.interview_quota ?? 3;
      resetTime = new Date(user.interview_quota_reset_time);
      break;
    case 'assessment':
      quota = user.assessment_quota ?? 1;
      resetTime = new Date(user.assessment_quota_reset_time);
      break;
    default:
      // 其他功能暂不限制
      return { allowed: true, remaining: -1 };
  }
  
  // 如果是会员，配额无限
  const member = await isMember(userId);
  if (member) {
    return { allowed: true, remaining: -1 };
  }
  
  // 检查是否需要重置配额
  const now = new Date();
  if (now > resetTime) {
    // 重置配额
    const nextResetTime = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
    const defaultQuota = config.freeQuota;
    
    await execSql(`UPDATE users SET 
      interview_quota = ${defaultQuota},
      interview_quota_reset_time = '${nextResetTime.toISOString()}'
      WHERE id = '${userId}'`);
    
    return { 
      allowed: defaultQuota > 0, 
      remaining: defaultQuota,
      reason: defaultQuota <= 0 ? `免费次数已用完` : undefined
    };
  }
  
  if (quota <= 0) {
    return { 
      allowed: false, 
      reason: '本月免费次数已用完，开通会员解锁无限次',
      remaining: 0 
    };
  }
  
  return { allowed: true, remaining: quota };
}

/**
 * 扣减配额
 */
export async function deductQuota(
  userId: string,
  feature: FeatureType
): Promise<{ success: boolean; reason?: string; remaining?: number }> {
  // 职业规划完全免费，不扣减
  if (feature === 'career_planning') {
    return { success: true, remaining: -1 };
  }
  
  // 先检查是否可用
  const access = await checkFeatureAccess(userId, feature);
  if (!access.allowed) {
    return { success: false, reason: access.reason };
  }
  
  // 如果是会员，不扣减
  const member = await isMember(userId);
  if (member) {
    return { success: true, remaining: -1 };
  }
  
  // 获取用户当前配额
  const user = await getUserQuota(userId);
  if (!user) {
    return { success: false, reason: '用户不存在' };
  }
  
  let currentQuota = 0;
  const now = new Date();
  
  switch (feature) {
    case 'interview':
      currentQuota = user.interview_quota ?? 3;
      await execSql(
        `UPDATE users SET interview_quota = interview_quota - 1 WHERE id = '${userId}'`
      );
      break;
    case 'assessment':
      currentQuota = user.assessment_quota ?? 1;
      await execSql(
        `UPDATE users SET assessment_quota = assessment_quota - 1 WHERE id = '${userId}'`
      );
      break;
    default:
      return { success: true, remaining: -1 };
  }
  
  return { success: true, remaining: currentQuota - 1 };
}

/**
 * 获取用户各功能剩余配额
 */
export async function getAllQuotas(userId: string): Promise<{
  career_planning: { remaining: number; unlimited: boolean };
  interview: { remaining: number; unlimited: boolean };
  assessment: { remaining: number; unlimited: boolean };
  competency: { isMemberOnly: boolean; hasReport: boolean };
  decision: { remaining: number; unlimited: boolean };
  isMember: boolean;
}> {
  const member = await isMember(userId);
  const user = await getUserQuota(userId);
  
  if (!user) {
    return {
      career_planning: { remaining: 0, unlimited: false },
      interview: { remaining: 0, unlimited: false },
      assessment: { remaining: 0, unlimited: false },
      competency: { isMemberOnly: true, hasReport: false },
      decision: { remaining: 0, unlimited: false },
      isMember: false
    };
  }
  
  const now = new Date();
  
  // 计算模拟面试配额
  let interviewRemaining = member ? -1 : (user.interview_quota ?? 3);
  if (!member && new Date(user.interview_quota_reset_time) <= now) {
    interviewRemaining = 3; // 重置
  }
  
  // 计算能力测评配额
  let assessmentRemaining = member ? -1 : (user.assessment_quota ?? 1);
  if (!member && new Date(user.assessment_quota_reset_time) <= now) {
    assessmentRemaining = 1; // 重置
  }
  
  return {
    career_planning: { remaining: -1, unlimited: true }, // 始终免费
    interview: { remaining: interviewRemaining, unlimited: member },
    assessment: { remaining: assessmentRemaining, unlimited: member },
    competency: { isMemberOnly: true, hasReport: false }, // 需要检查是否有职业规划报告
    decision: { remaining: member ? -1 : 3, unlimited: member },
    isMember: member
  };
}

/**
 * 设置用户会员状态
 */
export async function setMemberStatus(
  userId: string, 
  memberType: string, 
  expireTime: string
): Promise<void> {
  await execSql(
    `UPDATE users SET member_type = '${memberType}', member_expire_time = '${expireTime}' 
     WHERE id = '${userId}'`
  );
}

/**
 * 添加配额（用于邀请奖励等场景）
 */
export async function addQuota(userId: string, feature: FeatureType, amount: number): Promise<void> {
  switch (feature) {
    case 'interview':
      await execSql(
        `UPDATE users SET interview_quota = interview_quota + ${amount} WHERE id = '${userId}'`
      );
      break;
    case 'assessment':
      await execSql(
        `UPDATE users SET assessment_quota = assessment_quota + ${amount} WHERE id = '${userId}'`
      );
      break;
    default:
      // 其他功能暂不支持
      break;
  }
}
