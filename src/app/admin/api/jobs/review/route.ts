import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-auth';

const supabase = getSupabaseAdmin();

// 获取待审核列表
export async function GET(request: NextRequest) {
  const _authCheck = requireAdmin(request);
  if (_authCheck) return _authCheck;
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const offset = (page - 1) * pageSize;

    const { data: list, count: total } = await supabase
      .from('jd_submissions')
      .select('*', { count: 'exact' })
      .eq('status', 'pending')
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
    console.error('获取待审核列表失败:', error);
    return NextResponse.json({ code: 500, message: '获取列表失败' }, { status: 500 });
  }
}

// 审核操作
export async function POST(request: NextRequest) {
  const _authCheck = requireAdmin(request);
  if (_authCheck) return _authCheck;
  try {
    const body = await request.json();
    const { id, action, reason, adminId, adminUsername } = body;

    if (!id || !action) {
      return NextResponse.json({ code: 400, message: '参数不完整' }, { status: 400 });
    }

    const status = action === 'approve' ? 'approved' : 'rejected';

    // 获取提交信息
    const { data: submission } = await supabase
      .from('jd_submissions')
      .select('user_id')
      .eq('id', id)
      .single();

    // 更新状态
    const { error } = await supabase
      .from('jd_submissions')
      .update({ 
        status, 
        review_note: reason || '',
        reviewed_at: new Date().toISOString(),
        reviewer: adminUsername || 'system'
      })
      .eq('id', id);

    if (error) throw error;

    // 发送通知给用户
    if (submission?.user_id) {
      await supabase.from('notifications').insert({
        user_id: submission.user_id,
        title: 'JD审核结果',
        content: action === 'approve' ? '您的JD提交已通过审核' : `您的JD提交被拒绝: ${reason || ''}`,
        type: 'jd_review',
        is_read: false
      });
    }

    // 记录操作日志
    await supabase.from('admin_operation_logs').insert({
      admin_id: adminId || 0,
      admin_username: adminUsername || 'unknown',
      operation_type: 'jd_review',
      operation_content: `审核JD: #${id} -> ${status}`
    });

    return NextResponse.json({ code: 200, message: '审核成功' });
  } catch (error) {
    console.error('审核失败:', error);
    return NextResponse.json({ code: 500, message: '操作失败' }, { status: 500 });
  }
}
