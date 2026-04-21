import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 获取当前用户的邀请码
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    // 获取用户邀请码
    const userResult = await execSql(
      `SELECT invite_code FROM users WHERE id = '${userId}' LIMIT 1`
    );

    if (!userResult || userResult.length === 0) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    let inviteCode = (userResult[0] as { invite_code: string }).invite_code;

    // 如果没有邀请码，生成一个
    if (!inviteCode) {
      const newCode = userId.substring(0, 8).toUpperCase();
      await execSql(
        `UPDATE users SET invite_code = '${newCode}' WHERE id = '${userId}'`
      );
      inviteCode = newCode;
    }

    // 获取邀请统计
    const statsResult = await execSql(
      `SELECT 
        COUNT(*) as total_invites,
        COUNT(CASE WHEN reward_status = 'claimed' THEN 1 END) as claimed_rewards,
        SUM(reward_quota) as total_quota_earned,
        SUM(reward_days) as total_days_earned
       FROM invites WHERE inviter_id = '${userId}'`
    );

    const stats = statsResult && statsResult.length > 0 ? statsResult[0] : {
      total_invites: 0,
      claimed_rewards: 0,
      total_quota_earned: 0,
      total_days_earned: 0
    };

    return NextResponse.json({
      success: true,
      data: {
        invite_code: inviteCode,
        stats: {
          total_invites: parseInt((stats as { total_invites: string }).total_invites) || 0,
          claimed_rewards: parseInt((stats as { claimed_rewards: string }).claimed_rewards) || 0,
          total_quota_earned: parseInt((stats as { total_quota_earned: string }).total_quota_earned) || 0,
          total_days_earned: parseInt((stats as { total_days_earned: string }).total_days_earned) || 0
        }
      }
    });

  } catch (error) {
    console.error('获取邀请码失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
