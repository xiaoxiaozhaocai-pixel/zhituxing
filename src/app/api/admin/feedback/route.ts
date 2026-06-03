export const dynamic = 'force-dynamic';
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

// 获取所有工单
export async function GET(request: NextRequest) {
  // 鉴权检查
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: '未授权访问' }, { status: 401 });
  }
  
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('feedback')
      .select(`
        *,
        user:users(id, phone, nickname)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: feedbacks, error, count } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const formattedFeedbacks = (feedbacks || []).map(f => ({
      id: f.id,
      userId: f.user_id,
      userPhone: f.user?.phone || '未登录',
      userName: f.user?.nickname || '游客',
      content: f.content,
      type: f.type,
      status: f.status,
      contact: f.contact,
      reply: f.reply,
      createdAt: f.created_at,
      updatedAt: f.updated_at
    }));

    return NextResponse.json({
      success: true,
      data: {
        feedbacks: formattedFeedbacks,
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('获取工单列表失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
