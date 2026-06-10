import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/sb-access-token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;

    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: '认证失败: ' + (authError?.message || 'token无效') }, { status: 401 });
    }

    const userId = user.id;

    const { getSupabaseAdmin } = await import('@/lib/supabase');
    const supabase = getSupabaseAdmin();

    const [profileRes, reportsRes, favoritesRes, assessmentsRes, assessmentsList, reportsList, favoritesList] = await Promise.all([
      supabase.from('user_profiles').select('created_at').eq('user_id', userId).maybeSingle(),
      supabase.from('career_plans').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('favorites').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('assessment_results').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('assessment_results').select('created_at, id').eq('user_id', userId).order('created_at', { ascending: false }).limit(3),
      supabase.from('career_plans').select('created_at, id').eq('user_id', userId).order('created_at', { ascending: false }).limit(3),
      supabase.from('favorites').select('created_at, id').eq('user_id', userId).order('created_at', { ascending: false }).limit(2)
    ]);

    const companionDays = profileRes.data?.created_at
      ? Math.max(1, Math.ceil((Date.now() - new Date(profileRes.data.created_at).getTime()) / 86400000))
      : 0;

    const totalReports = (reportsRes.count as number) || 0;
    const totalFavorites = (favoritesRes.count as number) || 0;
    const totalAssessments = (assessmentsRes.count as number) || 0;

    const milestones: Array<{
      id: string;
      type: 'register' | 'assessment' | 'report' | 'resume' | 'favorite' | 'interview';
      title: string;
      description: string;
      date: string;
    }> = [];

    if (profileRes.data?.created_at) {
      milestones.push({
        id: 'register-' + userId,
        type: 'register',
        title: '加入职途星',
        description: '开启你的职业成长之旅',
        date: profileRes.data.created_at
      });
    }

    (assessmentsList.data || []).forEach(item => {
      milestones.push({
        id: 'assessment-' + item.id,
        type: 'assessment',
        title: '完成胜任力测评',
        description: '了解自己的职业竞争力',
        date: item.created_at
      });
    });

    (reportsList.data || []).forEach(item => {
      milestones.push({
        id: 'report-' + item.id,
        type: 'report',
        title: '生成职业规划报告',
        description: '获得专属职业发展建议',
        date: item.created_at
      });
    });

    (favoritesList.data || []).forEach(item => {
      milestones.push({
        id: 'favorite-' + item.id,
        type: 'favorite',
        title: '收藏了心仪岗位',
        description: '记录感兴趣的机会',
        date: item.created_at
      });
    });

    milestones.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      success: true,
      data: {
        companionDays,
        totalReports,
        totalFavorites,
        totalAssessments,
        milestones
      }
    });
  } catch (err) {
    console.error('获取成长数据失败:', err);
    return NextResponse.json({
      success: true,
      data: {
        companionDays: 0,
        totalReports: 0,
        totalFavorites: 0,
        totalAssessments: 0,
        milestones: []
      }
    });
  }
}