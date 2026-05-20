export const dynamic = 'force-dynamic';
/**
 * 岗位匹配API - 根据用户技能匹配推荐岗位
 * 
 * 认证方式：与 /api/chat 完全相同
 * - 从 cookie 读取 sb-access-token
 * - 使用 Supabase Auth 验证 token
 * 
 * 技能来源：从请求 body 的 skills 字段获取，不查表
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

    // ============================================================
    // 业务逻辑
    // ============================================================
    const body = await request.json();
    const { skills, targetPosition } = body;

    // 验证技能参数
    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      return NextResponse.json({
        success: false,
        error: '请提供技能列表',
        message: '请在请求 body 中提供 skills 数组，例如: { "skills": ["Python", "数据分析"] }'
      }, { status: 400 });
    }

    // 过滤有效技能
    const validSkills = skills.filter((s: unknown) => typeof s === 'string' && s.trim()).map((s: string) => s.trim());
    
    if (validSkills.length === 0) {
      return NextResponse.json({
        success: false,
        error: '请提供有效的技能名称'
      }, { status: 400 });
    }

    // 查询匹配的岗位
    let matches: unknown[] = [];
    
    // 从 jd_library 查询岗位
    const { data: jdData, error: jdError } = await supabase
      .from('jd_library')
      .select('id, job_title, city, salary_min, salary_max, hard_skills, soft_skills, industry, company')
      .limit(50);

    if (jdError) {
      console.error('[match] Failed to query jd_library:', jdError.message);
      return NextResponse.json(
        { error: '查询岗位数据失败' },
        { status: 500 }
      );
    }

    if (jdData && jdData.length > 0) {
      // 匹配逻辑：根据技能交集计算匹配度
      matches = jdData.map((jd: {
        id: string;
        job_title: string;
        city: string;
        salary_min: number | null;
        salary_max: number | null;
        hard_skills: string[] | null;
        soft_skills: string[] | null;
        industry: string | null;
        company: string | null;
      }) => {
        const jdSkills = [...(jd.hard_skills || []), ...(jd.soft_skills || [])];
        const matchedSkills = validSkills.filter((s: string) => 
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
          company: jd.company,
          city: jd.city,
          salary_range: jd.salary_min && jd.salary_max 
            ? `${jd.salary_min}K-${jd.salary_max}K`
            : '面议',
          industry: jd.industry,
          match_score: matchScore,
          matched_skills: matchedSkills,
          gap_skills: jdSkills.filter((js: string) => 
            !validSkills.some((s: string) => 
              js.toLowerCase().includes(s.toLowerCase()) || 
              s.toLowerCase().includes(js.toLowerCase())
            )
          )
        };
      })
      .filter((m: { match_score: number }) => m.match_score > 0)
      .sort((a: { match_score: number }, b: { match_score: number }) => b.match_score - a.match_score)
      .slice(0, 10);
    }

    // 如果指定了目标岗位，筛选相关岗位
    if (targetPosition && matches.length > 0) {
      const targetLower = targetPosition.toLowerCase();
      matches = matches.filter((m) => {
        const jobTitle = (m as { job_title?: string }).job_title?.toLowerCase() || '';
        return jobTitle.includes(targetLower) || targetLower.includes(jobTitle);
      });
    }

    return NextResponse.json({
      success: true,
      matches,
      user_skills: validSkills,
      total: matches.length
    });

  } catch (error) {
    console.error('[match] Error:', error);
    return NextResponse.json(
      { error: '匹配失败，请重试' },
      { status: 500 }
    );
  }
}

// GET 方法：获取热门岗位（无需技能匹配）
export async function GET(request: NextRequest) {
  try {
    // ============================================================
    // 认证检查
    // ============================================================
    const accessToken = request.cookies.get('sb-access-token');
    if (!accessToken) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken.value);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '登录已过期，请重新登录' },
        { status: 401 }
      );
    }

    // 获取热门岗位
    const { data: hotJobs, error } = await supabase
      .from('jd_library')
      .select('id, job_title, city, salary_min, salary_max, industry, company')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[match] Failed to query hot jobs:', error.message);
      return NextResponse.json(
        { error: '查询岗位失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      jobs: (hotJobs || []).map((job: {
        id: string;
        job_title: string;
        city: string;
        salary_min: number | null;
        salary_max: number | null;
        industry: string | null;
        company: string | null;
      }) => ({
        id: job.id,
        job_title: job.job_title,
        company: job.company,
        city: job.city,
        salary_range: job.salary_min && job.salary_max 
          ? `${job.salary_min}K-${job.salary_max}K`
          : '面议',
        industry: job.industry
      }))
    });

  } catch (error) {
    console.error('[match] GET Error:', error);
    return NextResponse.json(
      { error: '查询失败，请重试' },
      { status: 500 }
    );
  }
}
