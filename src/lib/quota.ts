/**
 * 用户配额管理模块
 * 处理配额扣减、重置、查询等逻辑
 */

import { execSql } from './exec-sql';

export interface UserQuota {
  monthly_quota: number;
  quota_reset_time: string;
  member_type: string;
  member_expire_time: string | null;
}

/**
 * 获取用户配额信息
 */
export async function getUserQuota(userId: string): Promise<UserQuota | null> {
  const result = await execSql(
    `SELECT monthly_quota, quota_reset_time, member_type, member_expire_time 
     FROM users WHERE id = '${userId}' LIMIT 1`
  );
  
  if (!result || result.length === 0) {
    return null;
  }
  
  return result[0] as UserQuota;
}

/**
 * 检查并重置配额（如果已到重置时间）
 */
export async function checkAndResetQuota(userId: string): Promise<boolean> {
  const user = await getUserQuota(userId);
  
  if (!user) return false;
  
  const now = new Date();
  const resetTime = new Date(user.quota_reset_time);
  
  // 如果当前时间已超过重置时间，重置配额
  if (now > resetTime) {
    const nextResetTime = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
    await execSql(
      `UPDATE users SET monthly_quota = 5, quota_reset_time = '${nextResetTime.toISOString()}' 
       WHERE id = '${userId}'`
    );
    return true;
  }
  
  return false;
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
 * 扣减用户配额（非会员用户）
 * @returns true: 扣减成功, false: 配额不足或已是会员
 */
export async function deductQuota(userId: string): Promise<{ success: boolean; reason?: string }> {
  // 会员不扣减配额
  const member = await isMember(userId);
  if (member) {
    return { success: true };
  }
  
  // 先检查并重置配额
  await checkAndResetQuota(userId);
  
  const user = await getUserQuota(userId);
  
  if (!user) {
    return { success: false, reason: '用户不存在' };
  }
  
  if (user.monthly_quota <= 0) {
    return { success: false, reason: '本月免费次数已用完' };
  }
  
  // 扣减配额
  await execSql(
    `UPDATE users SET monthly_quota = monthly_quota - 1 WHERE id = '${userId}'`
  );
  
  return { success: true };
}

/**
 * 获取用户剩余配额
 */
export async function getRemainingQuota(userId: string): Promise<number> {
  const member = await isMember(userId);
  if (member) {
    return -1; // -1表示会员无限次
  }
  
  await checkAndResetQuota(userId);
  
  const user = await getUserQuota(userId);
  return user?.monthly_quota ?? 0;
}

/**
 * 添加配额（用于邀请奖励等场景）
 */
export async function addQuota(userId: string, amount: number): Promise<void> {
  await execSql(
    `UPDATE users SET monthly_quota = monthly_quota + ${amount} WHERE id = '${userId}'`
  );
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
