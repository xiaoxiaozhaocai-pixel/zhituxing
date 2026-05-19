import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const supabase = getSupabaseAdmin();

export async function GET(request: NextRequest) {
  try {
    // 用户统计
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: memberCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .not('member_type', 'is', null);

    // JD统计
    const { count: totalJds } = await supabase
      .from('jd_submissions')
      .select('*', { count: 'exact', head: true });

    const { count: pendingJds } = await supabase
      .from('jd_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // 面试统计
    const { count: totalInterviews } = await supabase
      .from('interview_results')
      .select('*', { count: 'exact', head: true });

    // 问卷统计
    const { count: totalAssessments } = await supabase
      .from('assessment_results')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      code: 200,
      data: {
        users: { total: totalUsers || 0, members: memberCount || 0 },
        jds: { total: totalJds || 0, pending: pendingJds || 0 },
        interviews: totalInterviews || 0,
        assessments: totalAssessments || 0
      }
    });
  } catch (error) {
    console.error('获取统计失败:', error);
    return NextResponse.json({ code: 500, message: '获取统计失败' }, { status: 500 });
  }
}
