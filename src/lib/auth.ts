/**
 * 统一认证工具
 * 从 JWT token 验证用户身份，替代不安全的 x-user-id header
 * 
 * 漏洞修复：x-user-id 认证绕过
 * 原问题：攻击者可伪造 x-user-id header 冒充任意用户
 * 修复方案：从 cookie 读取 JWT token 并用 Supabase 验证
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from './supabase';
import { parseAccessTokenFromCookie } from './auth-cookies';

export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  nickname: string | null;
  userType: 'free' | 'member';
}

/**
 * 获取认证用户
 * 优先从 JWT token 验证，生产环境强制验证
 * 开发环境允许 x-user-id fallback（仅用于开发测试）
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<AuthUser | null> {
  // 1. 尝试从 cookie 获取并验证 token
  const accessToken = parseAccessTokenFromCookie(request.headers);
  
  if (accessToken) {
    try {
      const supabase = getSupabaseAdmin();
      const { data: { user }, error } = await supabase.auth.getUser(accessToken);
      
      if (error || !user) {
        console.error('[auth] Token verification failed:', error?.message);
        return null;
      }
      
      // 从 user_profiles 获取用户类型
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('user_type, membership_type, membership_expires_at, nickname')
        .eq('user_id', user.id)
        .maybeSingle();
      
      const rawType = profile?.user_type || 'free';
      const membershipExpiresAt = profile?.membership_expires_at;
      
      // 判断是否有效会员：非 free 且（永久会员 或 未过期）
      const isLifetime = rawType === 'lifetime';
      const isExpired = !isLifetime && membershipExpiresAt
        ? new Date(membershipExpiresAt) < new Date()
        : false;
      const effectiveType = (rawType !== 'free' && !isExpired) ? 'member' as const : 'free' as const;
      
      return {
        id: user.id,
        email: user.email ?? null,
        phone: user.user_metadata?.phone || user.phone || null,
        nickname: profile?.nickname || user.user_metadata?.nickname || null,
        userType: effectiveType,
      };
    } catch (err) {
      console.error('[auth] Unexpected error:', err);
      return null;
    }
  }
  
  // 2. 开发环境 fallback 到 x-user-id（仅开发环境）
  if (process.env.NODE_ENV !== 'production') {
    const headerUserId = request.headers.get('x-user-id');
    if (headerUserId) {
      console.warn('[auth] WARNING: Using x-user-id fallback in non-production environment');
      return {
        id: headerUserId,
        email: null,
        phone: null,
        nickname: null,
        userType: 'free',
      };
    }
  }
  
  return null;
}

/**
 * 获取认证用户ID（简化版）
 */
export async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  const user = await getAuthenticatedUser(request);
  return user?.id || null;
}

/**
 * 获取认证用户（包含用户类型，用于需要权限判断的场景）
 */
export async function getAuthenticatedUserWithType(request: NextRequest): Promise<{ userId: string; userType: string } | null> {
  const user = await getAuthenticatedUser(request);
  if (!user) return null;
  return { userId: user.id, userType: user.userType };
}

/**
 * 快速验证函数，用于需要立即返回401的场景
 * 返回 { user, userId } 或直接返回 NextResponse
 */
export async function requireAuth(request: NextRequest): Promise<{ user: AuthUser; userId: string } | NextResponse> {
  const user = await getAuthenticatedUser(request);
  
  if (!user) {
    return NextResponse.json(
      { error: '请先登录' },
      { status: 401 }
    );
  }
  
  return { user, userId: user.id };
}

/**
 * 检查用户是否为会员
 */
export async function requireMember(request: NextRequest): Promise<{ user: AuthUser; userId: string } | NextResponse> {
  const user = await getAuthenticatedUser(request);
  
  if (!user) {
    return NextResponse.json(
      { error: '请先登录' },
      { status: 401 }
    );
  }
  
  if (user.userType !== 'member') {
    return NextResponse.json(
      { error: '此功能仅对会员开放' },
      { status: 403 }
    );
  }
  
  return { user, userId: user.id };
}
