import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // 获取所有用户
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (usersError) {
      return NextResponse.json({ success: false, error: usersError.message }, { status: 500 });
    }

    // 获取所有配额记录
    const { data: quotas } = await supabase
      .from('user_quotas')
      .select('*');

    // 获取所有邀请记录
    const { data: invites } = await supabase
      .from('user_invites')
      .select('*');

    // 合并数据
    const enrichedUsers = (users || []).map(user => {
      const userQuota = quotas?.find(q => q.user_id === user.id);
      const userInvites = invites?.filter(i => i.inviter_id === user.id) || [];

      return {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatarUrl: user.avatar_url,
        memberType: userQuota?.member_type || 'free',
        quota: userQuota?.quota || 5,
        usedQuota: userQuota?.used_quota || 0,
        invites: userInvites.length,
        createdAt: user.created_at
      };
    });

    return NextResponse.json({ 
      success: true, 
      data: { users: enrichedUsers } 
    });

  } catch (error) {
    console.error('获取用户列表失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
