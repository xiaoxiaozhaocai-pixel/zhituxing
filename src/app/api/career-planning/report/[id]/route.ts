import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUserId } from '@/lib/auth';
export const dynamic = 'force-dynamic';

const supabase = getSupabaseAdmin();
// 管理员白名单（与 feedback/route.ts 同款机制）：可查看任意用户报告
const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(',') || [];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // IDOR 修复：匿名不可读，属主或管理员白名单方可访问（id 为自增整数，此前可被遍历）
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ code: 401, message: '请先登录' }, { status: 401 });
    }

    const { data: report, error } = await supabase
      .from('career_plans')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !report) {
      return NextResponse.json({ code: 404, message: '报告不存在' }, { status: 404 });
    }
    if (report.user_id !== userId && !ADMIN_USER_IDS.includes(userId)) {
      return NextResponse.json({ code: 403, message: '无权访问该报告' }, { status: 403 });
    }

    // Parse plan_data into ReportData structure
    const planData = report.plan_data as Record<string, unknown> | null;
    const data = planData ? {
      id: report.id,
      user_id: report.user_id,
      major: planData.major || '',
      grade: planData.grade || '',
      city: planData.city || '',
      is_latest: report.is_latest || 0,
      status: '已生成',
      create_time: report.created_at,
      core_jobs: planData.core_jobs || [],
      dimensions: planData.dimensions || {
        personality: 0, major: 0, ability: 0, interest: 0, values: 0, risk: 0
      },
      dimension_insight: (planData.dimension_insight as Record<string, unknown> | null) || null,
      career_path: planData.career_path || [],
      skills_gap: planData.skills_gap || [],
      action_plan: planData.action_plan || [],
    } : null;

    if (!data) {
      return NextResponse.json({ code: 404, message: '报告数据不完整' }, { status: 404 });
    }

    return NextResponse.json({ code: 200, data });
  } catch (error) {
    console.error('获取报告失败:', error);
    return NextResponse.json({ code: 500, message: '获取失败' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // IDOR 修复：仅属主可删除自己的报告
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ code: 401, message: '请先登录' }, { status: 401 });
    }

    const { error } = await supabase
      .from('career_plans')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    return NextResponse.json({ code: 200, message: '删除成功' });
  } catch (error) {
    console.error('删除报告失败:', error);
    return NextResponse.json({ code: 500, message: '删除失败' }, { status: 500 });
  }
}
