export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isMember } from '@/lib/quota';

/**
 * 获取当前用户信息
 * 认证方式：与 /api/chat 完全相同
 * - 从 cookie 读取 sb-access-token
 * - 使用 Supabase Auth 验证 token
 * - 直接返回 auth.users 中的用户信息，不查询 user_profiles 表
 */
export async function GET(request: NextRequest) {
  try {
    // ============================================================
    // 认证检查（与 /api/chat 完全相同）
    // ============================================================
    const accessToken = request.cookies.get('sb-access-token');
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      );
    }

    // 使用 Supabase Auth 验证 token
    const supabase = getSupabaseAdmin();
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken.value);
    
    if (authError || !user) {
      console.error('[auth/me] Token verification failed:', authError?.message);
      return NextResponse.json(
        { success: false, error: '登录已过期，请重新登录' },
        { status: 401 }
      );
    }

    // ============================================================
    // 直接使用 auth.users 中的用户信息，不查询 user_profiles 表
    // ============================================================
    const userId = user.id;
    const userEmail = user.email || '';
    const userPhone = userPhoneFromEmail(userEmail);
    
    // 计算是否为会员
    const isVip = await isMember(userId);
    
    // 格式化响应 - 使用 auth.users 的信息
    const userInfo = {
      id: userId,
      phone: userPhone,
      email: userEmail,
      nickname: user.user_metadata?.nickname || userPhone?.slice(-4) || '用户',
      created_at: user.created_at,
      quota: {
        // 职业规划始终免费
        career_planning: {
          remaining: -1,
          unlimited: true
        },
        // 模拟面试配额
        interview: {
          remaining: isVip ? -1 : 3,
          unlimited: isVip
        },
        // 能力测评配额
        assessment: {
          remaining: isVip ? -1 : 1,
          unlimited: isVip
        },
        // 胜任力评估（仅会员）
        competency: {
          is_member_only: true,
          requires_report: true
        },
        // 考研就业决策
        decision: {
          remaining: isVip ? -1 : 5,
          unlimited: isVip
        }
      },
      is_member: isVip
    };

    return NextResponse.json({
      success: true,
      user: userInfo
    });

  } catch (error) {
    console.error('[auth/me] Error:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}

/**
 * 从邮箱中提取手机号
 * 邮箱格式：phone@phone.temp 或正常邮箱
 */
function userPhoneFromEmail(email: string): string | null {
  if (!email) return null;
  if (email.endsWith('@phone.temp')) {
    return email.split('@')[0];
  }
  return null;
}
