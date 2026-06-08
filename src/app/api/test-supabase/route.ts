import { NextResponse } from 'next/server';
import { getSupabase, getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabaseAuth = getSupabase();
  const _supabaseAdmin = getSupabaseAdmin();
  
  // 测试登录
  const { data, error } = await supabaseAuth.auth.signInWithPassword({
    email: '13900000002@phone.temp',
    password: 'test123456'
  });
  
  return NextResponse.json({
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    loginSuccess: !!data?.session,
    loginError: error?.message || null,
    tokenPreview: data?.session?.access_token?.substring(0, 30) || null
  });
}
