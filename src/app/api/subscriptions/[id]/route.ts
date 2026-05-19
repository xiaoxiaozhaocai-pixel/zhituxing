export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const supabase = getSupabaseAdmin();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !subscription) {
      return NextResponse.json({ error: '订阅不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: subscription });
  } catch (error) {
    console.error('获取订阅失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: subscription });
  } catch (error) {
    console.error('更新订阅失败:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 取消订阅
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // 如果取消成功，更新用户类型
    if (subscription?.user_id) {
      await supabase
        .from('user_profiles')
        .update({ user_type: 'free' })
        .eq('user_id', subscription.user_id);
    }

    return NextResponse.json({ success: true, message: '订阅已取消' });
  } catch (error) {
    console.error('取消订阅失败:', error);
    return NextResponse.json({ error: '取消失败' }, { status: 500 });
  }
}
