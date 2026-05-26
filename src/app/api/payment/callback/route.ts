export const dynamic = 'force-dynamic';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// 会员套餐天数配置
const planDays: Record<string, number> = {
  monthly: 30,
  quarterly: 90,
  trial: 30,
  semester: 180,
  yearly: 365
};

// 支付回调（签名验证已强制启用）
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();
    const { orderNo, status, paidAt, sign } = body;

    // 【安全修复】始终执行签名验证，不再依赖环境变量开关
    // 生产环境必须验证签名，防止伪造支付回调
    const signKey = process.env.PAYMENT_SIGN_KEY;
    if (!signKey) {
      console.error('支付签名密钥未配置，请设置 PAYMENT_SIGN_KEY 环境变量');
      return NextResponse.json({ success: false, error: '支付配置错误' }, { status: 500 });
    }
    
    // 构建签名Payload
    const payload = `${orderNo}${status}`;
    const expectedSign = crypto.createHmac('sha256', signKey).update(payload).digest('hex');
    
    // 验证签名（安全比较，防止时序攻击）
    if (!sign || !crypto.timingSafeEqual(Buffer.from(sign), Buffer.from(expectedSign))) {
      console.warn('支付签名验证失败:', { orderNo, receivedSign: sign?.substring(0, 10) });
      return NextResponse.json({ success: false, error: '签名验证失败' }, { status: 401 });
    }

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
    const days = planDays[planId] || 30;

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
        newExpiresAt = new Date(currentExpires.getTime() + days * 24 * 60 * 60 * 1000);
      } else {
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
        quota: 999999,
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
