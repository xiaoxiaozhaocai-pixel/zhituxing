import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const supabase = getSupabaseAdmin();

// 获取操作日志
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const adminId = searchParams.get('adminId');
    const operationType = searchParams.get('operationType');
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('admin_operation_logs')
      .select('*', { count: 'exact' });

    if (adminId) {
      query = query.eq('admin_id', adminId);
    }
    if (operationType) {
      query = query.eq('operation_type', operationType);
    }

    const { data: list, count: total } = await query
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
    console.error('获取日志失败:', error);
    return NextResponse.json({ code: 500, message: '获取失败' }, { status: 500 });
  }
}
