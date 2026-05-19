import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

// 管理员鉴权验证
async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const adminToken = request.headers.get('x-admin-token') || request.headers.get('Authorization')?.replace('Bearer ', '');
  const validToken = process.env.ADMIN_SECRET_KEY || 'admin-secret-key';
  return adminToken === validToken;
}

// 获取所有订单（管理员）
export async function GET(request: NextRequest) {
  // 鉴权检查
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: '未授权访问' }, { status: 401 });
  }
  
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('orders')
      .select(`
        *,
        user:users(id, phone, nickname)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: orders, error, count } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // 格式化返回数据
    const formattedOrders = (orders || []).map(order => ({
      id: order.id,
      orderNo: order.order_no,
      userId: order.user_id,
      userPhone: order.user?.phone || '未知',
      userName: order.user?.nickname || '未设置昵称',
      planName: order.plan_name,
      planId: order.plan_id,
      amount: parseFloat(order.amount),
      paymentMethod: order.payment_method,
      status: order.status,
      createdAt: order.created_at,
      paidAt: order.paid_at
    }));

    return NextResponse.json({
      success: true,
      data: {
        orders: formattedOrders,
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('获取订单列表失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
