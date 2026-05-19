import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || '';

interface AuthResult {
  userId: string;
  authMethod: 'jwt' | 'header';
}

/**
 * JWT双认证中间件
 * 优先JWT Bearer Token，回退x-user-id兼容认证
 * 排除test_前缀（安全后门已关闭）
 */
export async function authenticateUser(request: NextRequest): Promise<AuthResult | null> {
  // 1. 优先JWT Bearer Token
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const jwtResult = verifyJWT(token);
    if (jwtResult) {
      if (jwtResult.startsWith('test_')) return null;
      return { userId: jwtResult, authMethod: 'jwt' };
    }
  }

  // 2. 回退x-user-id header
  const headerUserId = request.headers.get('x-user-id');
  if (headerUserId) {
    if (headerUserId.startsWith('test_')) return null;
    const isValid = await verifyUserExists(headerUserId);
    if (isValid) {
      return { userId: headerUserId, authMethod: 'header' };
    }
  }

  return null;
}

/**
 * 必须认证 — 未认证返回401 Response
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult | Response> {
  const result = await authenticateUser(request);
  if (!result) {
    return new Response(JSON.stringify({ error: '请先登录', code: 401 }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  return result;
}

/**
 * 验证JWT Token（HMAC-SHA256）
 */
function verifyJWT(token: string): string | null {
  if (!JWT_SECRET) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const crypto = require('crypto');
    const signedContent = parts[0] + '.' + parts[1];
    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(signedContent)
      .digest('base64url');

    if (expectedSig !== parts[2]) return null;

    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8')
    );

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload.sub || null;
  } catch {
    return null;
  }
}

/**
 * 生成JWT Token
 */
export function generateJWT(userId: string, expiresInHours: number = 72): string {
  if (!JWT_SECRET) throw new Error('JWT_SECRET not configured');

  const crypto = require('crypto');
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    iat: now,
    exp: now + expiresInHours * 3600
  })).toString('base64url');

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(header + '.' + payload)
    .digest('base64url');

  return header + '.' + payload + '.' + signature;
}

/**
 * 验证用户是否存在于user_profiles表
 */
async function verifyUserExists(userId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Auth: user verification error:', error);
      return false;
    }
    return !!data;
  } catch (e) {
    console.error('Auth: user verification failed:', e);
    return false;
  }
}
