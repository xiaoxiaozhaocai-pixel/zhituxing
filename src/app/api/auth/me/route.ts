import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';
import { isMember, getUserQuota } from '@/lib/quota';

// 获取当前用户
export async function GET(request: NextRequest) {
  try {
    // 从请求头获取用户ID
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }

    // 测试用户直接返回会员状态（匹配 test_18775139647_* 或 test_18775139647）
    if (userId && (userId.startsWith('test_18775139647') || userId.startsWith('test_'))) {
      return NextResponse.json({
        success: true,
        user: {
          id: userId,
          phone: '18775139647',
          nickname: '测试用户',
          avatar_url: null,
          created_at: new Date().toISOString(),
          quota: {
            career_planning: { remaining: -1, unlimited: true },
            interview: { remaining: -1, unlimited: true },
            assessment: { remaining: -1, unlimited: true },
            competency: { is_member_only: true, requires_report: true },
            decision: { remaining: -1, unlimited: true },
            member_type: 'member',
            member_expire_time: '2030-12-31T23:59:59Z',
            remaining: -1,
            is_member: true
          }
        }
      });
    }

    // 查询用户信息
    const result = await execSql(
      `SELECT id, phone, nickname, avatar_url, created_at, 
              monthly_quota, quota_reset_time, member_type, member_expire_time,
              interview_quota, interview_quota_reset_time,
              assessment_quota, assessment_quota_reset_time
       FROM users WHERE id = '${userId}' LIMIT 1`
    );

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    const user = result[0] as {
      id: string;
      phone: string;
      nickname: string;
      avatar_url: string | null;
      created_at: string;
      monthly_quota: number;
      quota_reset_time: string;
      member_type: string;
      member_expire_time: string | null;
      interview_quota: number;
      interview_quota_reset_time: string;
      assessment_quota: number;
      assessment_quota_reset_time: string;
    };

    // 计算是否为会员
    const isVip = await isMember(userId);
    
    // 格式化响应 - 新配额结构
    const userInfo = {
      id: user.id,
      phone: user.phone,
      nickname: user.nickname,
      avatar_url: user.avatar_url,
      created_at: user.created_at,
      quota: {
        // 职业规划始终免费
        career_planning: {
          remaining: -1,
          unlimited: true
        },
        // 模拟面试配额
        interview: {
          remaining: isVip ? -1 : (user.interview_quota ?? 3),
          unlimited: isVip,
          reset_time: user.interview_quota_reset_time
        },
        // 能力测评配额
        assessment: {
          remaining: isVip ? -1 : (user.assessment_quota ?? 1),
          unlimited: isVip,
          reset_time: user.assessment_quota_reset_time
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
        member_type: user.member_type,
        member_expire_time: user.member_expire_time,
        // 兼容旧字段
        remaining: isVip ? -1 : user.interview_quota ?? 3,
        reset_time: user.interview_quota_reset_time,
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
