import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { authenticateUser } from '@/lib/auth';

// 会员套餐配置
const membershipPlans = {
  trial: {
    name: '体验会员',
    days: 30,
    price: 9.9
  },
  semester: {
    name: '学期会员',
    days: 180,
    price: 29.9
  },
  yearly: {
    name: '年度会员',
    days: 365,
    price: 49.9
  },
  // 增值付费服务
  'resume-refine': {
    name: '1v1简历精修',
    days: 0,
    price: 39.9
  },
  'interview-review': {
    name: '1v1模拟面试复盘',
    days: 0,
    price: 59.9
  },
  'career-report': {
    name: '专属职业规划定制报告',
    days: 0,
    price: 99.9
  }
};

// 创建订单
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { planId, paymentMethod, amount } = body;

    // JWT双认证
    const authResult = await authenticateUser(request);
    if (!authResult) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }
    const userId = authResult.userId;

    // 验证套餐
    const plan = membershipPlans[planId as keyof typeof membershipPlans];
    if (!plan) {
      return NextResponse.json({ success: false, error: '无效的套餐' }, { status: 400 });
    }

    // 服务端价格校验（防止金额篡改）
    const PLAN_PRICES: Record<string, number> = {
      trial: 9.9,
      semester: 29.9,
      yearly: 49.9,
      'resume-refine': 39.9,
      'interview-review': 59.9,
      'career-report': 99.9
    };
    const expectedPrice = PLAN_PRICES[planId];
    if (!expectedPrice) {
      return NextResponse.json({ success: false, error: '无效的套餐' }, { status: 400 });
    }
    if (amount !== undefined && Math.abs(amount - expectedPrice) > 0.01) {
      return NextResponse.json({ success: false, error: '金额不匹配' }, { status: 400 });
    }

    // 生成订单号
    const orderNo = `ZX${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // 创建订单记录（使用服务端价格，不信任客户端金额）
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        order_no: orderNo,
        user_id: userId,
        plan_id: planId,
        plan_name: plan.name,
        amount: expectedPrice,
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
        amount: expectedPrice,
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
    const supabase = getSupabase();

    // JWT双认证
    const authResult = await authenticateUser(request);
    if (!authResult) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }
    const userId = authResult.userId;

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
