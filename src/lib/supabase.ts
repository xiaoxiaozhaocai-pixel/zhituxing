import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface User {
  id: string;
  phone: string;
  nickname: string;
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
