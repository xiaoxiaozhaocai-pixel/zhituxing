import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const supabase = getSupabaseAdmin();

// 获取同步任务状态
export async function GET(request: NextRequest) {
  try {
    const { data: tasks } = await supabase
      .from('sync_tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      code: 200,
      data: tasks || []
    });
  } catch (error) {
    console.error('获取同步任务失败:', error);
    return NextResponse.json({ code: 500, message: '获取失败' }, { status: 500 });
  }
}

// 触发同步
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, adminId, adminUsername } = body;

    if (!type) {
      return NextResponse.json({ code: 400, message: '缺少同步类型' }, { status: 400 });
    }

    // 创建同步任务记录
    const { data: task } = await supabase
      .from('sync_tasks')
      .insert({
        type,
        status: 'pending',
        created_by: adminUsername || 'system',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    // 记录操作日志
    await supabase.from('admin_operation_logs').insert({
      admin_id: adminId || 0,
      admin_username: adminUsername || 'unknown',
      operation_type: 'sync_trigger',
      operation_content: `触发同步: ${type}`
    });

    return NextResponse.json({ 
      code: 200, 
      message: '同步任务已创建',
      data: task 
    });
  } catch (error) {
    console.error('触发同步失败:', error);
    return NextResponse.json({ code: 500, message: '操作失败' }, { status: 500 });
  }
}
