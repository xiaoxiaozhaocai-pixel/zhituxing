import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 会员套餐配置
const membershipPlans = {
  monthly: {
    name: '月卡会员',
    days: 30,
    price: 9.9
  },
  quarterly: {
    name: '季卡会员',
    days: 90,
    price: 19.9
  },
  yearly: {
    name: '年卡会员',
    days: 365,
    price: 49.9
  }
};

// 创建订单
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planId, paymentMethod } = body;

    // 获取当前用户
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    // 验证套餐
    const plan = membershipPlans[planId as keyof typeof membershipPlans];
    if (!plan) {
      return NextResponse.json({ success: false, error: '无效的套餐' }, { status: 400 });
    }

    // 生成订单号
    const orderNo = `ZX${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // 创建订单记录
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        order_no: orderNo,
        user_id: authHeader.replace('Bearer ', ''),
        plan_id: planId,
        plan_name: plan.name,
        amount: plan.price,
        payment_method: paymentMethod || 'wechat',
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('创建订单失败:', error);
      return NextResponse.json({ success: false, error: '创建订单失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        orderNo: order.order_no,
        amount: plan.price,
        planName: plan.name,
        // 模拟支付链接，实际应调用微信/支付宝API
        paymentUrl: `/payment/${order.order_no}`
      }
    });

  } catch (error) {
    console.error('创建订单失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}

// 获取订单列表
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const userId = authHeader.replace('Bearer ', '');

    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        orders: (orders || []).map(o => ({
          id: o.id,
          orderNo: o.order_no,
          planName: o.plan_name,
          amount: o.amount,
          status: o.status,
          createdAt: o.created_at,
          paidAt: o.paid_at
        }))
      }
    });

  } catch (error) {
    console.error('获取订单列表失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
