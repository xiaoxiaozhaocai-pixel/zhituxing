export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUserId } from '@/lib/auth';

const supabase = getSupabaseAdmin();

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { data: invite, error } = await supabase
      .from('invites')
      .select('*')
      .eq('inviter_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({ success: true, data: invite });
  } catch (error) {
    console.error('获取邀请码失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}
