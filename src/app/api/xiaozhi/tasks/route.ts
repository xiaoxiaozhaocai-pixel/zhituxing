export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUserId } from '@/lib/auth';

const supabase = getSupabaseAdmin();

// GET /api/xiaozhi/tasks — 获取用户的任务记忆列表
// 参数: ?status=in_progress&type=interview&limit=20
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const status = request.nextUrl.searchParams.get('status');
    const taskType = request.nextUrl.searchParams.get('type');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20', 10);

    let query = supabase
      .from('mascot_task_memory')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(Math.min(limit, 50));

    if (status) {
      query = query.eq('task_status', status);
    }

    if (taskType) {
      query = query.eq('task_type', taskType);
    }

    const { data: tasks, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, data: tasks || [] });
  } catch (error) {
    console.error('获取小职任务记忆失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

// POST /api/xiaozhi/tasks — 创建一条任务记忆
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { taskType, taskTitle, relatedAgent, relatedArtifactId, metadata } = body;

    if (!taskType || !taskTitle) {
      return NextResponse.json({ error: '缺少必填参数 taskType / taskTitle' }, { status: 400 });
    }

    const validTaskTypes = ['application', 'interview', 'plan', 'skill', 'resume'];
    if (!validTaskTypes.includes(taskType)) {
      return NextResponse.json({ error: `无效 taskType，可选: ${validTaskTypes.join(', ')}` }, { status: 400 });
    }

    const { data: task, error } = await supabase
      .from('mascot_task_memory')
      .insert({
        user_id: userId,
        task_type: taskType,
        task_title: taskTitle,
        task_status: 'in_progress',
        related_agent: relatedAgent || null,
        related_artifact_id: relatedArtifactId || null,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: task });
  } catch (error) {
    console.error('创建小职任务记忆失败:', error);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}
