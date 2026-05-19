export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const supabase = getSupabaseAdmin();

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ success: true, data: subscription });
  } catch (error) {
    console.error('获取订阅失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { plan, paymentId } = body;

    // 计算过期时间
    const expiresAt = new Date();
    if (plan === 'monthly') {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else if (plan === 'yearly') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan,
        status: 'active',
        payment_id: paymentId,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // 更新用户类型
    await supabase
      .from('user_profiles')
      .update({ user_type: 'member' })
      .eq('user_id', userId);

    return NextResponse.json({ success: true, data: subscription });
  } catch (error) {
    console.error('创建订阅失败:', error);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}
