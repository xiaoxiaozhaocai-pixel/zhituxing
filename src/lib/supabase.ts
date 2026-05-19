import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ========== 懒加载 Supabase 客户端 ==========
// 构建时不初始化，避免环境变量缺失导致构建失败
// 只有在实际调用时才初始化

let clientInstance: SupabaseClient | null = null;
let adminInstance: SupabaseClient | null = null;

/**
 * 获取 Supabase 客户端（使用 ANON_KEY）
 * 用于前端和不需要绕过 RLS 的操作
 */
export function getSupabase(): SupabaseClient {
  if (clientInstance) return clientInstance;
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.COZE_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.COZE_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  
  clientInstance = createClient(url, key);
  return clientInstance;
}

/**
 * 获取 Supabase Admin 客户端（使用 SERVICE_ROLE_KEY）
 * 用于 API 路由，绕过 RLS
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (adminInstance) return adminInstance;
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.COZE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.COZE_SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  
  adminInstance = createClient(url, key);
  return adminInstance;
}

// ========== 兼容旧代码的导出 ==========
// 注意：这些是 getter 函数，不是直接导出的客户端实例
// 使用方式：import { getSupabase, getSupabaseAdmin } from '@/lib/supabase'
//          const supabase = getSupabase()

export interface User {
  id: string;
  phone: string;
  nickname: string;
  password?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface VerificationCode {
  id: string;
  phone: string;
  code: string;
  type: 'register' | 'login' | 'reset_password';
  expires_at: string;
  used: boolean;
}
