export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// 登出 - 清除认证 cookie
export async function POST() {
  try {
    // 尝试在 Supabase 端也登出
    const supabase = getSupabaseAdmin();
    await supabase.auth.signOut();
  } catch {
    // 忽略 Supabase 登出错误
  }

  const response = NextResponse.json({
    success: true,
    message: '登出成功'
  });

  // 清除认证 cookie
  response.cookies.delete('sb-access-token');
  response.cookies.delete('sb-refresh-token');
  
  // 也清除旧格式的 cookie（兼容）
  response.cookies.delete('session_token');
  response.cookies.delete('user_id');

  return response;
}
