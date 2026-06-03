/**
 * Coze 用户验证模块
 * 提供 JWT token 认证
 */

import { NextRequest } from 'next/server';

export interface UserInfo {
  userId: string;
  userType: string; // 'free' | 'member'
}

/**
 * 用户验证 — 使用统一的 JWT token 认证
 * 漏洞修复：不再信任 x-user-id header，改为验证 JWT token
 */
export async function getUserInfoFromRequest(request: NextRequest): Promise<UserInfo | null> {
  const { getAuthenticatedUserWithType } = await import('../auth');
  const result = await getAuthenticatedUserWithType(request);

  if (!result) return null;

  return {
    userId: result.userId,
    userType: result.userType,
  };
}
