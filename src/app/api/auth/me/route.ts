import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isMember, getUserQuota } from '@/lib/quota';
import { authenticateUser } from '@/lib/auth';

// 获取当前用户
export async function GET(request: NextRequest) {
  try {
    // JWT双认证
    const authResult = await authenticateUser(request);
    if (!authResult) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }
    const userId = authResult.userId;

    // 查询用户信息（user_profiles表实际字段）
    const supabase = getSupabaseAdmin();
    const { data: result, error: queryError } = await supabase
      .from('user_profiles')
      .select('user_id, phone, nickname, user_type, membership_type, membership_expires_at, created_at')
      .eq('user_id', userId)
      .maybeSingle();

    // 详细错误处理
    if (queryError) {
      console.error('[auth/me] Supabase query error:', queryError);
      return NextResponse.json(
        { error: '查询失败', details: queryError.message },
        { status: 500 }
      );
    }

    if (!result) {
      console.warn('[auth/me] User not found:', userId);
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    const user = result as {
      user_id: string;
      phone: string | null;
      nickname: string | null;
      user_type: string | null;
      membership_type: string | null;
      membership_expires_at: string | null;
      created_at: string;
    };

    // 计算是否为会员
    const isVip = await isMember(userId);
    
    // 格式化响应 - 新配额结构
    const memberType = user.membership_type || user.user_type || 'free';
    const userInfo = {
      id: user.user_id,
      phone: user.phone,
      nickname: user.nickname,
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
          remaining: isVip ? -1 : 3,
          unlimited: isVip
        },
        // 会员状态
        member_type: memberType,
        member_expire_time: user.membership_expires_at,
        // 兼容旧字段
        remaining: isVip ? -1 : 3,
        is_member: isVip
      }
    };

    return NextResponse.json({
      success: true,
      user: userInfo
    });

  } catch (error) {
    console.error('获取用户信息失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
