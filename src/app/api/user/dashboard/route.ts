import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUserId } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    // 并行查询所有数据源
    const [profileResult, resumeScoresResult, interviewsResult, jobsResult] = await Promise.all([
      // 1. 用户基本信息
      supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(),

      // 2. 简历评分（最新 + 近5次历史）
      supabase
        .from('user_resume_scores')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5),

      // 3. 模拟面试记录（最近3次）
      supabase
        .from('interview_results')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3),

      // 4. 推荐岗位（从job_descriptions随机取5条已解析的）
      supabase
        .from('job_descriptions')
        .select('id, job_title, company, city, industry, salary_range, education, experience, responsibilities')
        .eq('status', 'parsed')
        .limit(50),
    ]);

    // 处理用户信息
    const profile = profileResult.data;
    const user = profile
      ? {
          name: profile.nickname || profile.real_name || '',
          school: profile.school || '',
          major: profile.major || '',
          graduation_year: profile.graduation_year || '',
          phone: profile.phone || '',
          email: profile.email || '',
          avatar_url: profile.avatar_url || '',
        }
      : {
          name: '',
          school: '',
          major: '',
          graduation_year: '',
          phone: '',
          email: '',
          avatar_url: '',
        };

    // 处理简历评分
    const scores = resumeScoresResult.data || [];
    const latestScore = scores.length > 0 ? scores[0] : null;
    const resumeScore = {
      latest: latestScore
        ? {
            overall_score: Number(latestScore.overall_score),
            dimensions: latestScore.dimensions || [],
            improvements: latestScore.improvements || [],
            radar_data: latestScore.radar_data || {},
            summary: latestScore.summary || '',
            target_job: latestScore.target_job || '',
            created_at: latestScore.created_at,
          }
        : null,
      history: scores.map((s: Record<string, unknown>) => ({
        id: s.id,
        overall_score: Number(s.overall_score),
        created_at: s.created_at,
        target_job: s.target_job || '',
      })),
    };

    // 处理面试记录
    const interviews = (interviewsResult.data || []).map((ir: Record<string, unknown>) => ({
      id: ir.id,
      created_at: ir.created_at,
      target_job: ir.target_job || '',
      overall_score: ir.overall_score ?? null,
      result_data: ir.result_data || {},
    }));

    // 处理推荐岗位（随机取5条）
    const allJobs = jobsResult.data || [];
    const shuffled = [...allJobs].sort(() => Math.random() - 0.5);
    const randomJobs = shuffled.slice(0, 5);
    const recommendedJobs = randomJobs.map((j: Record<string, unknown>) => ({
      id: j.id,
      title: j.job_title || '',
      company: j.company || '',
      city: j.city || '',
      industry: j.industry || '',
      salary_range: j.salary_range || '',
      education: j.education || '',
      experience: j.experience || '',
    }));

    // 构建活动时间线（合并各数据源的时间）
    const activities: Array<{ type: string; title: string; time: string }> = [];

    if (scores.length > 0) {
      scores.forEach((s: Record<string, unknown>) => {
        activities.push({
          type: 'resume_score',
          title: `简历评分更新 — ${s.target_job || '综合'} ${s.overall_score}分`,
          time: s.created_at as string,
        });
      });
    }

    if (interviews.length > 0) {
      interviews.forEach((ir: Record<string, unknown>) => {
        activities.push({
          type: 'interview',
          title: `模拟面试 — ${ir.target_job || '岗位'}`,
          time: ir.created_at as string,
        });
      });
    }

    // 按时间倒序排列
    activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    return NextResponse.json({
      success: true,
      data: {
        user,
        resume_score: resumeScore,
        interviews,
        recommended_jobs: recommendedJobs,
        recent_activity: activities.slice(0, 10),
      },
    });
  } catch (err) {
    console.error('[dashboard] Error:', err);
    return NextResponse.json(
      { success: false, error: '获取仪表盘数据失败' },
      { status: 500 }
    );
  }
}
