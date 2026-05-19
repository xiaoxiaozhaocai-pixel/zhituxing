import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const supabase = getSupabaseAdmin();

// 获取奖励列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const offset = (page - 1) * pageSize;

    const { data: list, count: total } = await supabase
      .from('rewards')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    return NextResponse.json({
      code: 200,
      data: {
        list: list || [],
        pagination: { page, pageSize, total: total || 0 }
      }
    });
  } catch (error) {
    console.error('获取奖励列表失败:', error);
    return NextResponse.json({ code: 500, message: '获取列表失败' }, { status: 500 });
  }
}

// 发放奖励
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, rewardType, rewardValue, adminId, adminUsername } = body;

    if (!userId || !rewardType) {
      return NextResponse.json({ code: 400, message: '参数不完整' }, { status: 400 });
    }

    // 获取用户信息
    const { data: user } = await supabase
      .from('users')
      .select('id, nickname')
      .eq('id', userId)
      .single();

    if (!user) {
      return NextResponse.json({ code: 404, message: '用户不存在' }, { status: 404 });
    }

    // 发放奖励
    if (rewardType === 'member_days') {
      const days = parseInt(rewardValue) || 7;
      const { data: currentUser } = await supabase
        .from('users')
        .select('member_expire_time')
        .eq('id', userId)
        .single();

      let newExpireTime: Date;
      if (currentUser?.member_expire_time) {
        newExpireTime = new Date(currentUser.member_expire_time);
        newExpireTime.setDate(newExpireTime.getDate() + days);
      } else {
        newExpireTime = new Date();
        newExpireTime.setDate(newExpireTime.getDate() + days);
      }

      await supabase
        .from('users')
        .update({ 
          member_type: 'rewarded',
          member_expire_time: newExpireTime.toISOString() 
        })
        .eq('id', userId);
    }

    // 记录奖励发放
    await supabase.from('rewards').insert({
      user_id: userId,
      reward_type: rewardType,
      reward_value: rewardValue,
      granted_by: adminUsername || 'system',
      granted_at: new Date().toISOString()
    });

    // 记录操作日志
    await supabase.from('admin_operation_logs').insert({
      admin_id: adminId || 0,
      admin_username: adminUsername || 'unknown',
      operation_type: 'reward_grant',
      operation_content: `发放奖励: ${rewardType}=${rewardValue} 给用户 #${userId}`
    });

    return NextResponse.json({ code: 200, message: '奖励发放成功' });
  } catch (error) {
    console.error('发放奖励失败:', error);
    return NextResponse.json({ code: 500, message: '操作失败' }, { status: 500 });
  }
}
