export const dynamic = 'force-dynamic';
/**
 * 岗位匹配API - 根据用户技能匹配推荐岗位
 * 
 * 认证方式：与 /api/chat 完全相同
 * - 从 cookie 读取 sb-access-token
 * - 使用 Supabase Auth 验证 token
 * 
 * 技能来源：从请求 body 的 skills 字段获取，不查表
 * 数据来源：job_descriptions 表
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
    const { skills, targetPosition, industry } = body;

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

    // 查询匹配的岗位 - 使用 job_descriptions 表
    const { data: jdData, error: jdError } = await supabase
      .from('job_descriptions')
      .select('id, job_title, company, city, salary_range, education, experience, industry, hard_skills, soft_skills, tags, fresh_graduate_friendly')
      .limit(100);

    if (jdError) {
      console.error('[match] Failed to query job_descriptions:', jdError.message);
      return NextResponse.json(
        { error: '查询岗位数据失败', details: jdError.message },
        { status: 500 }
      );
    }

    if (!jdData || jdData.length === 0) {
      return NextResponse.json({
        success: true,
        matches: [],
        user_skills: validSkills,
        total: 0,
        message: '暂无岗位数据'
      });
    }

    // 匹配逻辑：根据技能交集计算匹配度
    const matches = jdData.map((jd: {
      id: string;
      job_title: string;
      company: string | null;
      city: string | null;
      salary_range: string | null;
      education: string | null;
      experience: string | null;
      industry: string | null;
      hard_skills: string[] | null;
      soft_skills: string[] | null;
      tags: string[] | null;
      fresh_graduate_friendly: boolean | null;
    }) => {
      // 合并硬技能和软技能
      const jdSkills = [...(jd.hard_skills || []), ...(jd.soft_skills || [])];
      
      // 技能匹配：用户技能与岗位技能的交集
      const matchedSkills = validSkills.filter((s: string) => 
        jdSkills.some((js: string) => 
          js.toLowerCase().includes(s.toLowerCase()) || 
          s.toLowerCase().includes(js.toLowerCase())
        )
      );
      
      // 计算匹配度
      const skillMatchScore = jdSkills.length > 0 
        ? Math.round((matchedSkills.length / jdSkills.length) * 100)
        : 0;

      // 行业匹配加分
      let industryMatch = 0;
      if (industry && jd.industry) {
        if (jd.industry.toLowerCase().includes(industry.toLowerCase()) ||
            industry.toLowerCase().includes(jd.industry.toLowerCase())) {
          industryMatch = 10;
        }
      }

      // 总匹配度
      const totalMatchScore = Math.min(100, skillMatchScore + industryMatch);

      // 缺口技能（岗位要求但用户不具备的）
      const gapSkills = jdSkills.filter((js: string) => 
        !validSkills.some((s: string) => 
          js.toLowerCase().includes(s.toLowerCase()) || 
          s.toLowerCase().includes(js.toLowerCase())
        )
      );

      return {
        id: jd.id,
        job_title: jd.job_title,
        company: jd.company,
        city: jd.city,
        salary_range: jd.salary_range || '面议',
        education: jd.education,
        experience: jd.experience,
        industry: jd.industry,
        match_score: totalMatchScore,
        skill_match_score: skillMatchScore,
        matched_skills: matchedSkills,
        gap_skills: gapSkills.slice(0, 5), // 最多显示5个缺口技能
        fresh_graduate_friendly: jd.fresh_graduate_friendly
      };
    })
    .filter((m) => m.match_score > 0)
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, 10);

    // 如果指定了目标岗位，筛选相关岗位
    let finalMatches = matches;
    if (targetPosition && matches.length > 0) {
      const targetLower = targetPosition.toLowerCase();
      const targetMatches = matches.filter((m) => {
        const jobTitle = m.job_title?.toLowerCase() || '';
        return jobTitle.includes(targetLower) || targetLower.includes(jobTitle);
      });
      
      // 如果有匹配目标岗位的，优先返回
      if (targetMatches.length > 0) {
        finalMatches = targetMatches;
      }
    }

    return NextResponse.json({
      success: true,
      matches: finalMatches,
      user_skills: validSkills,
      total: finalMatches.length
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

    // 获取热门岗位 - 使用 job_descriptions 表
    const { data: hotJobs, error } = await supabase
      .from('job_descriptions')
      .select('id, job_title, company, city, salary_range, education, experience, industry, fresh_graduate_friendly')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[match] Failed to query hot jobs:', error.message);
      return NextResponse.json(
        { error: '查询岗位失败', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      jobs: (hotJobs || []).map((job: {
        id: string;
        job_title: string;
        company: string | null;
        city: string | null;
        salary_range: string | null;
        education: string | null;
        experience: string | null;
        industry: string | null;
        fresh_graduate_friendly: boolean | null;
      }) => ({
        id: job.id,
        job_title: job.job_title,
        company: job.company,
        city: job.city,
        salary_range: job.salary_range || '面议',
        education: job.education,
        experience: job.experience,
        industry: job.industry,
        fresh_graduate_friendly: job.fresh_graduate_friendly
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
