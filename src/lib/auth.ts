import { getSupabase } from './supabase';

/**
 * 从请求中获取已认证的用户（JWT验证）
 * 优先从Authorization: Bearer <token>获取JWT，验证后返回用户
 */
export async function getAuthUser(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.replace('Bearer ', '');
  const supabase = getSupabase();
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return null;
  }
  
  return user;
}

/**
 * 要求用户必须已认证（JWT验证）
 * 未认证时抛出Error
 */
export async function requireAuth(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

/**
 * 渐进式迁移：优先JWT，兼容期fallback到x-user-id
 * 添加了警告日志，后续应完全移除x-user-id
 */
export async function getUserId(request: Request): Promise<string | null> {
  // 1. 优先尝试JWT认证
  const authUser = await getAuthUser(request);
  if (authUser) {
    return authUser.id;
  }
  
  // 2. 兼容期：fallback到x-user-id（标记为待移除）
  const headerUserId = request.headers.get('x-user-id');
  if (headerUserId) {
    console.warn('[DEPRECATED] x-user-id authentication used. Migrate to JWT auth. Caller:', request.url);
    // TODO: 移除x-user-id兼容，强制JWT认证
    return headerUserId;
  }
  
  return null;
}
