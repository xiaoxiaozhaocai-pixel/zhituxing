import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUserId } from '@/lib/auth';
export const dynamic = 'force-dynamic';


/**
 * 邀请归因（基建）— 2026-09-13
 * 前端在登录/注册成功后上报邀请码（auth 页从 URL 捕获、localStorage 持久 30 天），
 * 本接口建立 inviter→invitee 关系，落 invite_relations 表。
 * 幂等：invitee_id 唯一约束 + upsert，重复上报不产生重复关系。
 * 奖励结算由后续邀请方案基于本表实现，本接口不做任何奖励发放。
 */
export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin(); // 运行时初始化，避免构建期 dummy client 缓存
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    if (!/^[A-Za-z0-9_-]{4,32}$/.test(code)) {
      return NextResponse.json({ success: false, error: '邀请码无效' });
    }

    const { data: invite, error: inviteErr } = await supabase
      .from('invites')
      .select('inviter_id, status')
      .eq('code', code.toUpperCase())
      .maybeSingle();
    if (inviteErr) {
      console.error('[invite/track] invites 查询失败:', inviteErr.message, inviteErr.details, inviteErr.hint);
      return NextResponse.json({ success: false, error: '查询失败' }, { status: 500 });
    }

    if (!invite || invite.status !== 'active') {
      return NextResponse.json({ success: false, error: '邀请码不存在或已失效' });
    }
    if (invite.inviter_id === userId) {
      return NextResponse.json({ success: false, error: '不能邀请自己' });
    }

    const { error } = await supabase
      .from('invite_relations')
      .upsert(
        { inviter_id: invite.inviter_id, invitee_id: userId, invite_code: code.toUpperCase() },
        { onConflict: 'invitee_id' }
      );
    if (error) {
      console.error('[invite/track] relations 写入失败:', error.message, error.details, error.hint);
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('邀请归因失败:', e);
    return NextResponse.json({ success: false, error: '归因失败，请稍后重试' }, { status: 500 });
  }
}
