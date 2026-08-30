import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/';
  
  // 获取 Supabase 配置
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.COZE_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.COZE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(`${origin}/auth?error=配置错误`);
  }
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // 方式1：使用 code 交换 token（OAuth 回调）
  if (code) {
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('[auth/callback] exchangeCodeForSession error:', error.message);
        return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent(error.message)}`);
      }
      
      return NextResponse.redirect(`${origin}${next}`);
    } catch (err: unknown) {
      const _err_ = err as Error;
      console.error('[auth/callback] exchangeCodeForSession exception:', err);
      return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent(_err_.message || '认证失败')}`);
    }
  }
  
  // 方式2：使用 token_hash 验证（Magic Link / Email Confirmation 回调）
  if (token_hash && type) {
    try {
      // 根据类型选择验证方式
      const validTypes = ['signup', 'magiclink', 'recovery', 'invite', 'email_change'];
      
      if (!validTypes.includes(type)) {
        return NextResponse.redirect(`${origin}/auth?error=无效的验证类型`);
      }
      
      // 对于 email 类型的验证，使用 verifyOtp
      // 注意：这里 token_hash 实际上是 OTP token
      if (type === 'signup' || type === 'magiclink') {
        // 获取邮箱参数
        const email = searchParams.get('email');
        
        if (email) {
          const { error } = await supabase.auth.verifyOtp({
            email,
            token: token_hash,
            type: type === 'signup' ? 'signup' : 'magiclink'
          });
          
          if (error) {
            console.error('[auth/callback] verifyOtp error:', error.message);
            return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent(error.message)}`);
          }
        } else {
          // 没有 email 参数，尝试用 PKCE 流程
          const { error } = await supabase.auth.exchangeCodeForSession(token_hash);
          if (error) {
            console.error('[auth/callback] PKCE exchange error:', error.message);
            return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent(error.message)}`);
          }
        }
      } else {
        // 其他类型直接交换
        const { error } = await supabase.auth.exchangeCodeForSession(token_hash);
        if (error) {
          console.error('[auth/callback] exchangeCodeForSession error:', error.message);
          return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent(error.message)}`);
        }
      }
      
      return NextResponse.redirect(`${origin}${next}`);
    } catch (err: unknown) {
      const _err_ = err as Error;
      console.error('[auth/callback] token_hash verification exception:', err);
      return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent(_err_.message || '验证失败')}`);
    }
  }
  
  // 没有 code 或 token_hash，重定向到登录页
  return NextResponse.redirect(`${origin}/auth?error=无效的回调链接`);
}
