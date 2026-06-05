import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-auth';

const supabase = getSupabaseAdmin();

// 获取回收站列表
export async function GET(request: NextRequest) {
  const _authCheck = requireAdmin(request);
  if (_authCheck) return _authCheck;
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const table = searchParams.get('table');
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('recycle_bin')
      .select('*', { count: 'exact' });

    if (table) {
      query = query.eq('original_table', table);
    }

    const { data: list, count: total } = await query
      .order('deleted_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    return NextResponse.json({
      code: 200,
      data: {
        list: list || [],
        pagination: { page, pageSize, total: total || 0 }
      }
    });
  } catch (error) {
    console.error('获取回收站列表失败:', error);
    return NextResponse.json({ code: 500, message: '获取列表失败' }, { status: 500 });
  }
}

// 恢复或永久删除
export async function POST(request: NextRequest) {
  const _authCheck = requireAdmin(request);
  if (_authCheck) return _authCheck;
  try {
    const body = await request.json();
    const { id, action, adminId, adminUsername } = body;

    if (!id || !action) {
      return NextResponse.json({ code: 400, message: '参数不完整' }, { status: 400 });
    }

    // 获取回收站记录
    const { data: record, error: fetchError } = await supabase
      .from('recycle_bin')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !record) {
      return NextResponse.json({ code: 404, message: '记录不存在' }, { status: 404 });
    }

    let message = '';

    if (action === 'restore') {
      // 恢复数据
      const originalData = typeof record.deleted_data === 'string' 
        ? JSON.parse(record.deleted_data) 
        : record.deleted_data;

      const { error: restoreError } = await supabase
        .from(record.original_table)
        .insert(originalData);

      if (restoreError) throw restoreError;

      // 从回收站删除
      await supabase.from('recycle_bin').delete().eq('id', id);
      message = '数据已恢复';
    } else if (action === 'delete') {
      // 永久删除
      const { error: deleteError } = await supabase
        .from('recycle_bin')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      message = '数据已永久删除';
    }

    // 记录操作日志
    await supabase.from('admin_operation_logs').insert({
      admin_id: adminId || 0,
      admin_username: adminUsername || 'unknown',
      operation_type: 'recycle_' + action,
      operation_content: `${message}: ${record.original_table} #${record.original_id}`
    });

    return NextResponse.json({ code: 200, message });
  } catch (error) {
    console.error('操作失败:', error);
    return NextResponse.json({ code: 500, message: '操作失败' }, { status: 500 });
  }
}

// 清空回收站
export async function DELETE(request: NextRequest) {
  const _authCheck = requireAdmin(request);
  if (_authCheck) return _authCheck;
  try {
    const searchParams = request.nextUrl.searchParams;
    const table = searchParams.get('table');

    let query = supabase.from('recycle_bin').delete();
    if (table) {
      query = query.eq('original_table', table);
    }

    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({ code: 200, message: '回收站已清空' });
  } catch (error) {
    console.error('清空回收站失败:', error);
    return NextResponse.json({ code: 500, message: '操作失败' }, { status: 500 });
  }
}
