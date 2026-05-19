export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const supabase = getSupabaseAdmin();

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 生成邀请码
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data: invite, error } = await supabase
      .from('invites')
      .insert({
        inviter_id: userId,
        code,
        created_at: new Date().toISOString(),
        status: 'active'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: invite });
  } catch (error) {
    console.error('生成邀请码失败:', error);
    return NextResponse.json({ error: '生成失败' }, { status: 500 });
  }
}
