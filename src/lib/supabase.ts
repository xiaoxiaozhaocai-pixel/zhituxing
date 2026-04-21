import { createClient } from '@supabase/supabase-js';

// 使用Coze平台提供的环境变量
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.COZE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.COZE_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.COZE_SUPABASE_SERVICE_ROLE_KEY || '';

// 客户端 - 用于前端
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 服务端客户端 - 用于API路由（绕过RLS）
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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
  created_at: string;
}
