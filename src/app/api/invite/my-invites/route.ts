import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 获取当前用户的邀请记录
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    // 获取邀请记录
    const invitesResult = await execSql(
      `SELECT 
        i.id,
        i.invitee_id,
        u.nickname as invitee_nickname,
        u.phone as invitee_phone,
        i.reward_quota,
        i.reward_days,
        i.reward_status,
        i.created_at,
        i.claimed_at
       FROM invites i
       LEFT JOIN users u ON i.invitee_id = u.id
       WHERE i.inviter_id = '${userId}'
       ORDER BY i.created_at DESC
       LIMIT 50`
    );

    // 获取被邀请记录（我通过谁的邀请码注册的）
    const myInviteResult = await execSql(
      `SELECT 
        i.id,
        i.inviter_id,
        inviter.nickname as inviter_nickname,
        inviter.phone as inviter_phone,
        i.reward_quota,
        i.reward_days,
        i.reward_status,
        i.created_at
       FROM invites i
       LEFT JOIN users inviter ON i.inviter_id = inviter.id
       WHERE i.invitee_id = '${userId}'
       LIMIT 10`
    );

    // 计算累计奖励进度
    const totalInvites = invitesResult ? invitesResult.length : 0;
    const extraRewards = {
      milestone_3: { unlocked: totalInvites >= 3, reward: '30天会员' },
      milestone_10: { unlocked: totalInvites >= 10, reward: '90天会员+简历精修' }
    };

    return NextResponse.json({
      success: true,
      data: {
        my_invites: (invitesResult || []).map((inv: unknown) => {
          const i = inv as { 
            id: string;
            invitee_nickname: string;
            invitee_phone: string;
            reward_quota: number;
            reward_days: number;
            reward_status: string;
            created_at: string;
            claimed_at: string;
          };
          return {
            id: i.id,
            invitee_name: i.invitee_nickname || `用户${i.invitee_phone?.slice(-4) || '未知'}`,
            reward_quota: i.reward_quota,
            reward_days: i.reward_days,
            status: i.reward_status,
            created_at: i.created_at,
            claimed_at: i.claimed_at
          };
        }),
        invited_by_me: myInviteResult && myInviteResult.length > 0 ? {
          inviter_name: (myInviteResult[0] as { inviter_nickname: string }).inviter_nickname || '未知',
          reward_quota: (myInviteResult[0] as { reward_quota: number }).reward_quota,
          reward_days: (myInviteResult[0] as { reward_days: number }).reward_days
        } : null,
        milestones: {
          total: totalInvites,
          next_milestone: totalInvites < 3 ? 3 : totalInvites < 10 ? 10 : null,
          rewards: extraRewards
        }
      }
    });

  } catch (error) {
    console.error('获取邀请记录失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
