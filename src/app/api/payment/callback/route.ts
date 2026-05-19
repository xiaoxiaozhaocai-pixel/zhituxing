import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// 会员套餐天数配置
const planDays = {
  monthly: 30,
  quarterly: 90,
  yearly: 365
};

// 支付回调（模拟）
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();
    const { orderNo, status, paidAt } = body;

    // 查找订单
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('order_no', orderNo)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ success: false, error: '订单不存在' }, { status: 404 });
    }

    // 如果订单已支付，直接返回
    if (order.status === 'paid') {
      return NextResponse.json({ success: true, message: '订单已支付' });
    }

    // 更新订单状态
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        paid_at: paidAt || new Date().toISOString()
      })
      .eq('order_no', orderNo);

    if (updateError) {
      return NextResponse.json({ success: false, error: '更新订单状态失败' }, { status: 500 });
    }

    // 更新用户会员状态
    const planId = order.plan_id;
    const days = planDays[planId as keyof typeof planDays] || 30;

    // 计算新的到期时间
    let newExpiresAt: Date;
    const { data: currentQuota } = await supabase
      .from('user_quotas')
      .select('*')
      .eq('user_id', order.user_id)
      .single();

    if (currentQuota && currentQuota.member_expires_at) {
      const currentExpires = new Date(currentQuota.member_expires_at);
      if (currentExpires > new Date()) {
        // 会员未过期，累加时间
        newExpiresAt = new Date(currentExpires.getTime() + days * 24 * 60 * 60 * 1000);
      } else {
        // 会员已过期，从现在开始计算
        newExpiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      }
    } else {
      newExpiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }

    // 更新用户配额
    const { error: quotaError } = await supabase
      .from('user_quotas')
      .upsert({
        user_id: order.user_id,
        member_type: planId,
        quota: 999999, // 无限次
        used_quota: 0,
        member_expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString()
      });

    if (quotaError) {
      console.error('更新用户配额失败:', quotaError);
    }

    return NextResponse.json({ success: true, message: '支付成功' });

  } catch (error) {
    console.error('支付回调处理失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
