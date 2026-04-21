import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 领取奖励
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const { inviteId } = await request.json();

    if (!inviteId) {
      return NextResponse.json(
        { error: '缺少邀请记录ID' },
        { status: 400 }
      );
    }

    // 获取邀请记录
    const inviteResult = await execSql(
      `SELECT * FROM invites WHERE id = '${inviteId}' AND inviter_id = '${userId}' LIMIT 1`
    );

    if (!inviteResult || inviteResult.length === 0) {
      return NextResponse.json(
        { error: '邀请记录不存在' },
        { status: 404 }
      );
    }

    const invite = inviteResult[0] as {
      id: string;
      reward_status: string;
      reward_quota: number;
      reward_days: number;
    };

    if (invite.reward_status === 'claimed') {
      return NextResponse.json(
        { error: '奖励已领取' },
        { status: 400 }
      );
    }

    // 发放奖励
    const now = new Date();
    
    // 1. 添加配额奖励
    await execSql(
      `UPDATE users SET monthly_quota = monthly_quota + ${invite.reward_quota} WHERE id = '${userId}'`
    );

    // 2. 延长会员时间（如果有）
    const userResult = await execSql(
      `SELECT member_expire_time FROM users WHERE id = '${userId}' LIMIT 1`
    );

    if (userResult && userResult.length > 0) {
      const user = userResult[0] as { member_expire_time: string };
      let newExpireTime: Date;

      if (user.member_expire_time) {
        const currentExpire = new Date(user.member_expire_time);
        newExpireTime = new Date(currentExpire.getTime() + invite.reward_days * 24 * 60 * 60 * 1000);
      } else {
        newExpireTime = new Date(now.getTime() + invite.reward_days * 24 * 60 * 60 * 1000);
      }

      await execSql(
        `UPDATE users SET 
          member_type = 'monthly',
          member_expire_time = '${newExpireTime.toISOString()}'
         WHERE id = '${userId}'`
      );
    }

    // 3. 更新邀请记录状态
    await execSql(
      `UPDATE invites SET 
        reward_status = 'claimed',
        claimed_at = '${now.toISOString()}'
       WHERE id = '${inviteId}'`
    );

    // 检查里程碑奖励
    const totalInvitesResult = await execSql(
      `SELECT COUNT(*) as total FROM invites WHERE inviter_id = '${userId}' AND reward_status = 'claimed'`
    );

    const totalInvites = totalInvitesResult && totalInvitesResult.length > 0 
      ? parseInt((totalInvitesResult[0] as { total: string }).total) || 0 
      : 0;

    let milestoneReward = null;
    
    // 3人里程碑：额外30天会员
    if (totalInvites === 3) {
      const userResult = await execSql(
        `SELECT member_expire_time FROM users WHERE id = '${userId}' LIMIT 1`
      );
      
      if (userResult && userResult.length > 0) {
        const user = userResult[0] as { member_expire_time: string };
        let newExpireTime: Date;

        if (user.member_expire_time) {
          const currentExpire = new Date(user.member_expire_time);
          newExpireTime = new Date(currentExpire.getTime() + 30 * 24 * 60 * 60 * 1000);
        } else {
          newExpireTime = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        }

        await execSql(
          `UPDATE users SET 
            member_type = 'monthly',
            member_expire_time = '${newExpireTime.toISOString()}'
           WHERE id = '${userId}'`
        );
        milestoneReward = '30天会员';
      }
    }

    // 10人里程碑：额外90天会员+简历精修（记录到数据库）
    if (totalInvites === 10) {
      await execSql(
        `UPDATE users SET 
          monthly_quota = monthly_quota + 10,
          member_type = 'yearly',
          member_expire_time = DATE_ADD(NOW(), INTERVAL 90 DAY)
         WHERE id = '${userId}'`
      );
      milestoneReward = '90天会员+简历精修服务';
    }

    return NextResponse.json({
      success: true,
      message: '奖励领取成功',
      data: {
        quota_added: invite.reward_quota,
        days_added: invite.reward_days,
        milestone_reward: milestoneReward
      }
    });

  } catch (error) {
    console.error('领取奖励失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
