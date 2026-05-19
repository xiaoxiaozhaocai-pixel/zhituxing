export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

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

    const supabase = getSupabaseAdmin();

    // 获取邀请记录
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .select('*')
      .eq('id', inviteId)
      .eq('inviter_id', userId)
      .maybeSingle();

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: '邀请记录不存在' },
        { status: 404 }
      );
    }

    if (invite.reward_status === 'claimed') {
      return NextResponse.json(
        { error: '奖励已领取' },
        { status: 400 }
      );
    }

    // 发放奖励
    const now = new Date();
    
    // 1. 添加配额奖励
    const { error: rpcError } = await supabase
      .rpc('add_monthly_quota', {
        p_user_id: userId,
        p_quota: invite.reward_quota
      });
    
    if (rpcError) {
      // 如果 RPC 不存在，直接更新
      const { data: quotaData } = await supabase
        .from('users')
        .select('monthly_quota')
        .eq('id', userId)
        .single();
      
      if (quotaData) {
        await supabase
          .from('users')
          .update({ monthly_quota: (quotaData.monthly_quota || 0) + invite.reward_quota })
          .eq('id', userId);
      }
    }

    // 2. 延长会员时间（如果有）
    const { data: user } = await supabase
      .from('users')
      .select('member_expire_time')
      .eq('id', userId)
      .maybeSingle();

    if (user) {
      let newExpireTime: Date;

      if (user.member_expire_time) {
        const currentExpire = new Date(user.member_expire_time);
        newExpireTime = new Date(currentExpire.getTime() + invite.reward_days * 24 * 60 * 60 * 1000);
      } else {
        newExpireTime = new Date(now.getTime() + invite.reward_days * 24 * 60 * 60 * 1000);
      }

      await supabase
        .from('users')
        .update({
          member_type: 'monthly',
          member_expire_time: newExpireTime.toISOString()
        })
        .eq('id', userId);
    }

    // 3. 更新邀请记录状态
    await supabase
      .from('invites')
      .update({
        reward_status: 'claimed',
        claimed_at: now.toISOString()
      })
      .eq('id', inviteId);

    // 检查里程碑奖励
    const { count: totalInvites } = await supabase
      .from('invites')
      .select('id', { count: 'exact', head: true })
      .eq('inviter_id', userId)
      .eq('reward_status', 'claimed');

    let milestoneReward = null;
    
    // 3人里程碑：额外30天会员
    if (totalInvites === 3) {
      const { data: user2 } = await supabase
        .from('users')
        .select('member_expire_time')
        .eq('id', userId)
        .maybeSingle();
      
      if (user2) {
        let newExpireTime: Date;

        if (user2.member_expire_time) {
          const currentExpire = new Date(user2.member_expire_time);
          newExpireTime = new Date(currentExpire.getTime() + 30 * 24 * 60 * 60 * 1000);
        } else {
          newExpireTime = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        }

        await supabase
          .from('users')
          .update({
            member_type: 'monthly',
            member_expire_time: newExpireTime.toISOString()
          })
          .eq('id', userId);
        milestoneReward = '30天会员';
      }
    }

    // 10人里程碑：额外90天会员+简历精修（记录到数据库）
    if (totalInvites === 10) {
      const newExpireTime = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      await supabase
        .from('users')
        .update({
          member_type: 'yearly',
          member_expire_time: newExpireTime.toISOString()
        })
        .eq('id', userId);
      
      // 添加配额
      const { data: user3 } = await supabase
        .from('users')
        .select('monthly_quota')
        .eq('id', userId)
        .maybeSingle();
      
      await supabase
        .from('users')
        .update({ monthly_quota: (user3?.monthly_quota || 0) + 10 })
        .eq('id', userId);
      
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
