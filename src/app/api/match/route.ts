export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getUserInfoFromRequest } from '@/lib/coze-stream';
import { calculateSkillMatch, estimateSalaryRange } from '@/lib/matching-algorithm';

const supabase = getSupabaseAdmin();

export async function POST(request: NextRequest) {
  try {
    // ============================================================
    // 安全检查：必须登录（从 cookie 读取 sb-access-token）
    // ============================================================
    const accessToken = request.cookies.get('sb-access-token');
    if (!accessToken) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 获取用户信息
    const userInfo = await getUserInfoFromRequest(request);
    const userId = userInfo?.userId;
    
    if (!userId) {
      return NextResponse.json({ error: '用户信息获取失败，请重新登录' }, { status: 401 });
    }

    const body = await request.json();
    const { targetPosition } = body;

    // 获取用户技能
    const { data: userSkills, error: skillsError } = await supabase
      .from('user_skills')
      .select('*')
      .eq('user_id', userId);

    if (skillsError) throw skillsError;

    const skillList = (userSkills || []).map(s => ({
      name: s.skill_name,
      level: s.level || 1
    }));

    // 获取JD
    let query = supabase
      .from('jd_library')
      .select('*')
      .eq('status', 'active');

    if (targetPosition) {
      query = query.ilike('job_title', `%${targetPosition}%`);
    }

    const { data: jds, error: jdError } = await query.limit(50);

    if (jdError) throw jdError;

    // 计算匹配度
    const results = (jds || []).map(jd => {
      const jdSkills = (jd.skills_required || []).map((s: string) => ({ name: s, required: true }));
      const matchResult = calculateSkillMatch(skillList, jdSkills);
      const salary = estimateSalaryRange(matchResult.matchScore, jd.salary_min, jd.salary_max);

      return {
        ...jd,
        match_score: matchResult.matchScore,
        matched_skills: matchResult.matchedSkills,
        gap_skills: matchResult.gapSkills,
        estimated_salary: salary
      };
    });

    // 按匹配度排序
    results.sort((a, b) => b.match_score - a.match_score);

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error('匹配失败:', error);
    return NextResponse.json({ error: '匹配失败' }, { status: 500 });
  }
}
