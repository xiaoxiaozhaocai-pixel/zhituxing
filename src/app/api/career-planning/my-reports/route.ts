import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth';
export const dynamic = 'force-dynamic';

const supabase = getSupabaseAdmin();

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ code: 401, message: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '10')));
    const offset = (page - 1) * pageSize;

    const { count: total } = await supabase
      .from('career_plans')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { data: reports, error } = await supabase
      .from('career_plans')
      .select('id, user_id, target_job, target_industry, career_paths, current_match_score, created_at, plan_data')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const list = (reports || []).map((r: any) => ({
      id: r.id,
      user_id: r.user_id,
      major: '',
      grade: '',
      city: '',
      is_latest: 0,
      status: '已生成',
      core_job: r.target_job || '未设定',
      create_time: r.created_at,
      match_score: r.current_match_score || 0,
    }));

    return NextResponse.json({
      code: 200,
      data: {
        list,
        total: total || 0,
        totalPages: Math.ceil((total || 0) / pageSize),
        currentPage: page,
      }
    });
  } catch (error) {
    console.error('获取报告列表失败:', error);
    return NextResponse.json({ code: 500, message: '获取失败' }, { status: 500 });
  }
}
