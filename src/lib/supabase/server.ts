import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ========== 懒加载 Supabase Admin 客户端 ==========
// 构建时不初始化，避免环境变量缺失导致构建失败

let adminInstance: SupabaseClient | null = null;

/**
 * 获取 Supabase Admin 客户端（使用 SERVICE_ROLE_KEY）
 * 用于 API 路由，绕过 RLS
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (adminInstance) return adminInstance;
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  
  adminInstance = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  
  return adminInstance;
}

// 兼容旧代码的别名导出
export const getSupabase = getSupabaseAdmin;
