import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// 管理员鉴权验证
async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const adminToken = request.headers.get('x-admin-token') || request.headers.get('Authorization')?.replace('Bearer ', '');
  const validToken = process.env.ADMIN_SECRET_KEY;
  if (!validToken) {
    console.error('ADMIN_SECRET_KEY is not configured');
    return false;
  }
  return adminToken === validToken;
}

// 更新订单状态
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 鉴权检查
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: '未授权访问' }, { status: 401 });
  }
  
  try {
    const supabase = getSupabaseAdmin();
    const { id } = await params;
    const { status } = await request.json();

    if (!['pending', 'paid', 'cancelled', 'refunded'].includes(status)) {
      return NextResponse.json({ success: false, error: '无效的订单状态' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { status };
    
    if (status === 'paid' && !updateData.paid_at) {
      updateData.paid_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // 如果是标记为已支付，同时更新用户会员状态
    if (status === 'paid') {
      const planDays = {
        monthly: 30,
        quarterly: 90,
        yearly: 365
      };

      const days = planDays[data.plan_id as keyof typeof planDays] || 30;
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

      await supabase
        .from('user_quotas')
        .upsert({
          user_id: data.user_id,
          member_type: data.plan_id,
          quota: 999999,
          used_quota: 0,
          member_expires_at: expiresAt,
          updated_at: new Date().toISOString()
        });
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('更新订单失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}

// 获取单个订单详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseAdmin();
    const { id } = await params;

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        user:users(id, phone, nickname, avatar_url, created_at)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: '订单不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        orderNo: data.order_no,
        userId: data.user_id,
        userPhone: data.user?.phone,
        userName: data.user?.nickname || '未设置昵称',
        userAvatar: data.user?.avatar_url,
        userCreatedAt: data.user?.created_at,
        planName: data.plan_name,
        planId: data.plan_id,
        amount: parseFloat(data.amount),
        paymentMethod: data.payment_method,
        status: data.status,
        createdAt: data.created_at,
        paidAt: data.paid_at
      }
    });

  } catch (error) {
    console.error('获取订单详情失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
