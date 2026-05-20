export const dynamic = 'force-dynamic';
/**
 * 岗位匹配API - 根据用户技能匹配推荐岗位
 * 
 * 认证方式：与 /api/chat 完全相同
 * - 从 cookie 读取 sb-access-token
 * - 使用 Supabase Auth 验证 token
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // ============================================================
    // 认证检查（与 /api/chat 完全相同）
    // ============================================================
    const accessToken = request.cookies.get('sb-access-token');
    if (!accessToken) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    // 使用 Supabase Auth 验证 token
    const supabase = getSupabaseAdmin();
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken.value);
    
    if (authError || !user) {
      console.error('[match] Token verification failed:', authError?.message);
      return NextResponse.json(
        { error: '登录已过期，请重新登录' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // ============================================================
    // 业务逻辑
    // ============================================================
    const body = await request.json();
    const { targetPosition } = body;

    // 查询用户技能
    const { data: userSkills, error: skillsError } = await supabase
      .from('user_skills')
      .select('skill_name, skill_level')
      .eq('user_id', userId);

    if (skillsError) {
      console.error('[match] Failed to query user skills:', skillsError.message);
      return NextResponse.json(
        { error: '查询用户技能失败' },
        { status: 500 }
      );
    }

    // 如果用户没有技能数据，返回空结果
    if (!userSkills || userSkills.length === 0) {
      return NextResponse.json({
        success: true,
        message: '请先完善您的技能信息',
        matches: [],
        hasProfile: false
      });
    }

    // 构建技能数组
    const skills = userSkills.map((s: { skill_name: string; skill_level: number }) => s.skill_name);

    // 查询匹配的岗位（从 skill_job_match 或 jd_library）
    // 先尝试从 skill_job_match 查询
    let matches: unknown[] = [];
    
    // 使用 skill_job_match 表查询匹配结果
    const { data: jobMatches, error: matchError } = await supabase
      .from('skill_job_match')
      .select('*')
      .order('match_score', { ascending: false })
      .limit(10);

    if (!matchError && jobMatches && jobMatches.length > 0) {
      matches = jobMatches;
    } else {
      // 回退：从 jd_library 查询
      const { data: jdData, error: jdError } = await supabase
        .from('jd_library')
        .select('id, job_title, city, salary_min, salary_max, hard_skills, soft_skills, industry')
        .limit(20);

      if (!jdError && jdData) {
        // 简单匹配逻辑：根据技能交集计算匹配度
        matches = jdData.map((jd: {
          id: string;
          job_title: string;
          city: string;
          salary_min: number;
          salary_max: number;
          hard_skills: string[];
          soft_skills: string[];
          industry: string;
        }) => {
          const jdSkills = [...(jd.hard_skills || []), ...(jd.soft_skills || [])];
          const matchedSkills = skills.filter((s: string) => 
            jdSkills.some((js: string) => 
              js.toLowerCase().includes(s.toLowerCase()) || 
              s.toLowerCase().includes(js.toLowerCase())
            )
          );
          const matchScore = jdSkills.length > 0 
            ? Math.round((matchedSkills.length / jdSkills.length) * 100)
            : 0;

          return {
            id: jd.id,
            job_title: jd.job_title,
            city: jd.city,
            salary_range: jd.salary_min && jd.salary_max 
              ? `${jd.salary_min}K-${jd.salary_max}K`
              : '面议',
            industry: jd.industry,
            match_score: matchScore,
            matched_skills: matchedSkills,
            gap_skills: jdSkills.filter((js: string) => 
              !skills.some((s: string) => 
                js.toLowerCase().includes(s.toLowerCase()) || 
                s.toLowerCase().includes(js.toLowerCase())
              )
            )
          };
        }).filter((m: { match_score: number }) => m.match_score > 0)
          .sort((a: { match_score: number }, b: { match_score: number }) => b.match_score - a.match_score)
          .slice(0, 10);
      }
    }

    // 如果指定了目标岗位，筛选相关岗位
    if (targetPosition && matches.length > 0) {
      matches = matches.filter((m) => {
        const jobTitle = (m as { job_title?: string }).job_title;
        return jobTitle?.toLowerCase().includes(targetPosition.toLowerCase()) ||
          targetPosition.toLowerCase().includes(jobTitle?.toLowerCase() || '');
      });
    }

    return NextResponse.json({
      success: true,
      matches,
      hasProfile: true,
      user_skills: skills
    });

  } catch (error) {
    console.error('[match] Error:', error);
    return NextResponse.json(
      { error: '匹配失败，请重试' },
      { status: 500 }
    );
  }
}

// GET 方法：获取用户的匹配历史
export async function GET(request: NextRequest) {
  try {
    // ============================================================
    // 认证检查（与 /api/chat 完全相同）
    // ============================================================
    const accessToken = request.cookies.get('sb-access-token');
    if (!accessToken) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    // 使用 Supabase Auth 验证 token
    const supabase = getSupabaseAdmin();
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken.value);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '登录已过期，请重新登录' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // 查询用户的匹配历史
    const { data: history, error } = await supabase
      .from('skill_job_match')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[match] Failed to query history:', error.message);
      return NextResponse.json(
        { error: '查询历史失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      history: history || []
    });

  } catch (error) {
    console.error('[match] Error:', error);
    return NextResponse.json(
      { error: '查询失败' },
      { status: 500 }
    );
  }
}
