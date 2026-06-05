import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-auth';

const supabase = getSupabaseAdmin();

// 获取通知列表
export async function GET(request: NextRequest) {
  const _authCheck = requireAdmin(request);
  if (_authCheck) return _authCheck;
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const offset = (page - 1) * pageSize;

    const { data: list, count: total } = await supabase
      .from('admin_notifications')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    return NextResponse.json({
      code: 200,
      data: {
        list: list || [],
        pagination: { page, pageSize, total: total || 0 }
      }
    });
  } catch (error) {
    console.error('获取通知列表失败:', error);
    return NextResponse.json({ code: 500, message: '获取列表失败' }, { status: 500 });
  }
}

// 发送通知
export async function POST(request: NextRequest) {
  const _authCheck = requireAdmin(request);
  if (_authCheck) return _authCheck;
  try {
    const body = await request.json();
    const { title, content, type, targetUsers, adminId, adminUsername } = body;

    if (!title || !content) {
      return NextResponse.json({ code: 400, message: '参数不完整' }, { status: 400 });
    }

    // 批量插入通知
    const notifications = (targetUsers || []).map((userId: string) => ({
      user_id: userId,
      title,
      content,
      type: type || 'system',
      is_read: false,
      created_at: new Date().toISOString()
    }));

    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications);
    }

    // 记录操作日志
    await supabase.from('admin_operation_logs').insert({
      admin_id: adminId || 0,
      admin_username: adminUsername || 'unknown',
      operation_type: 'notification_send',
      operation_content: `发送通知: ${title} 给 ${notifications.length} 用户`
    });

    return NextResponse.json({ code: 200, message: '通知发送成功' });
  } catch (error) {
    console.error('发送通知失败:', error);
    return NextResponse.json({ code: 500, message: '操作失败' }, { status: 500 });
  }
}

// 删除通知
export async function DELETE(request: NextRequest) {
  const _authCheck = requireAdmin(request);
  if (_authCheck) return _authCheck;
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ code: 400, message: '缺少id' }, { status: 400 });
    }

    const { error } = await supabase
      .from('admin_notifications')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ code: 200, message: '删除成功' });
  } catch (error) {
    console.error('删除通知失败:', error);
    return NextResponse.json({ code: 500, message: '删除失败' }, { status: 500 });
  }
}
