import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * 根据 user_profiles 行构造前端 useAuth 期望的 quota 对象
 * 修复 5/28：之前 me 接口没返回 quota，导致全站会员状态判断永远 false
 */
function buildQuota(profileRow: { user_type?: string | null; membership_type?: string | null; membership_expires_at?: string | null } | null) {
  const userType = profileRow?.user_type || 'free';
  const membershipType = profileRow?.membership_type || null;
  const expiresAt = profileRow?.membership_expires_at || null;
  const isMember = userType === 'member' || userType === 'lifetime';
  const isLifetime = userType === 'lifetime';
  // 到期判断（lifetime 永不过期）
  const isExpired = !isLifetime && expiresAt ? new Date(expiresAt) < new Date() : false;
  const isMemberActive = isMember && !isExpired;

  return {
    career_planning: { remaining: -1, unlimited: isMemberActive },
    interview: { remaining: isMemberActive ? -1 : 3, unlimited: isMemberActive },
    assessment: { remaining: isMemberActive ? -1 : 1, unlimited: isMemberActive },
    competency: { is_member_only: true, requires_report: true },
    decision: { remaining: isMemberActive ? -1 : 3, unlimited: isMemberActive },
    remaining: isMemberActive ? -1 : 3,
    reset_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    is_member: isMemberActive,
    is_lifetime_member: isLifetime,
    member_type: isMemberActive ? (membershipType || 'monthly') : 'free',
    member_expire_time: isLifetime ? null : expiresAt,
    user_type: userType,
    membership_type: membershipType,
    membership_expires_at: expiresAt,
  };
}

export async function GET(request: Request) {
  try {
    // 从 cookie 读取 sb-access-token
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/sb-access-token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;

    if (!token) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 动态导入 Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 验证 token
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json({ error: '认证失败' }, { status: 401 });
    }

    // 查 user_profiles 拿会员状态（不存在/失败时按 free 兜底）
    let profileRow: { user_type?: string | null; membership_type?: string | null; membership_expires_at?: string | null } | null = null;
    try {
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('user_type, membership_type, membership_expires_at')
        .eq('user_id', user.id)
        .maybeSingle();
      profileRow = profileData || null;
    } catch (e) {
      console.warn('[auth/me] 查询 user_profiles 失败，按 free 兜底:', e);
    }

    const quota = buildQuota(profileRow);

    // 返回用户信息（带 quota + user_type，供 useAuth 直接 setQuota）
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        phone: user.user_metadata?.phone || user.phone || null,
        nickname: user.user_metadata?.nickname || '用户' + (user.email?.split('@')[0]?.slice(-4) || ''),
        user_type: quota.user_type,
        is_member: quota.is_member,
        is_lifetime_member: quota.is_lifetime_member,
        membership_type: quota.membership_type,
        membership_expires_at: quota.membership_expires_at,
        quota,
      }
    });
  } catch (err) {
    console.error('[auth/me] Error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
