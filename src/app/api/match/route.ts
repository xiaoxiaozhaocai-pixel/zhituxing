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
import { sanitizeJDList } from '@/lib/jd-sanitizer';

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
    const { data: jdData, error: jdError } = await (supabase as any)
      .from('job_descriptions')
      .select('id, job_title, company, company_type, city, salary_range, education, experience, industry, hard_skills, soft_skills, tags, fresh_graduate_friendly')
      .or('is_synthetic.is.null,is_synthetic.eq.false')
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
    console.log('[match] User skills:', validSkills);
    console.log('[match] Total jobs:', jdData.length);
    
    const matches = jdData.map((jd: {
      id: string;
      job_title: string;
      company: string | null;
      company_type: string | null;
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
      // 处理 hard_skills 和 soft_skills（可能是数组、JSONB字符串或null）
      let hardSkillsArr: string[] = [];
      let softSkillsArr: string[] = [];
      
      if (jd.hard_skills) {
        if (Array.isArray(jd.hard_skills)) {
          hardSkillsArr = jd.hard_skills.filter((s): s is string => typeof s === 'string');
        } else if (typeof jd.hard_skills === 'string') {
          try {
            const parsed = JSON.parse(jd.hard_skills);
            hardSkillsArr = Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : [];
          } catch { /* ignore */ }
        }
      }
      
      if (jd.soft_skills) {
        if (Array.isArray(jd.soft_skills)) {
          softSkillsArr = jd.soft_skills.filter((s): s is string => typeof s === 'string');
        } else if (typeof jd.soft_skills === 'string') {
          try {
            const parsed = JSON.parse(jd.soft_skills);
            softSkillsArr = Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : [];
          } catch { /* ignore */ }
        }
      }
      
      // 合并硬技能和软技能
      const jdSkills = [...hardSkillsArr, ...softSkillsArr];
      
      // 技能匹配：用户技能与岗位技能的交集
      const matchedSkills = validSkills.filter((s: string) => 
        jdSkills.some((js: string) => 
          js.toLowerCase().includes(s.toLowerCase()) || 
          s.toLowerCase().includes(js.toLowerCase())
        )
      );
      
      // 计算匹配度 - 基于用户技能匹配比例（而不是岗位技能）
      const skillMatchScore = validSkills.length > 0 
        ? Math.round((matchedSkills.length / validSkills.length) * 100)
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
        company: jd.company || [jd.industry, jd.company_type].filter(Boolean).join(' · ') || null,
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
    .filter((m: { match_score: number }) => m.match_score > 0)
    .sort((a: { match_score: number }, b: { match_score: number }) => b.match_score - a.match_score)
    .slice(0, 10);

    // 如果指定了目标岗位，筛选相关岗位
    let finalMatches = matches;
    if (targetPosition && matches.length > 0) {
      const targetLower = targetPosition.toLowerCase();
      const targetMatches = matches.filter((m: { job_title?: string }) => {
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
      matches: sanitizeJDList(finalMatches),
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

// GET 方法：返回岗位匹配列表（前端 /match 页面期望的嵌套 MatchJobResult 结构）
// 修复 BUG-1（commit 78be0d9 修复方向错误）：API GET 原返 {jobs:[扁平]}，前端期望 {matches:[嵌套], user_skills}
// 当前实现：用默认通用应届技能 + job_descriptions 表 ilike(target_position) 查询，封装成 MatchJobResult 嵌套格式
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

    // ============================================================
    // 业务参数
    // ============================================================
    const { searchParams } = new URL(request.url);
    const targetPosition = searchParams.get('target_position') || '';

    // 默认通用应届技能（绕过 user_skills 表 500，保证 /match 页面在 user_skills 未配置时也可用）
    const DEFAULT_SKILLS = ['沟通能力', '学习能力', '团队协作', 'Excel', '数据分析', 'Python', 'SQL', '英语'];

    // ============================================================
    // 查询岗位
    // ============================================================
    let query = (supabase as any)
      .from('job_descriptions')
      .select('id, job_title, company, company_type, city, salary_range, education, experience, industry, hard_skills, soft_skills, fresh_graduate_friendly')
      .or('is_synthetic.is.null,is_synthetic.eq.false');

    if (targetPosition && targetPosition.trim()) {
      query = query.ilike('job_title', `%${targetPosition.trim()}%`);
    }

    const { data: hotJobs, error } = await query
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[match] Failed to query hot jobs:', error.message);
      return NextResponse.json(
        { error: '查询岗位失败', details: error.message },
        { status: 500 }
      );
    }

    // ============================================================
    // 薪资字符串解析：'8-15K' / '8K-15K' / '8000-15000' → {min, max}
    // ============================================================
    const parseSalary = (raw: string | null): { min: number; max: number } => {
      if (!raw) return { min: 0, max: 0 };
      const s = raw.replace(/\s/g, '').toLowerCase();
      const m = s.match(/(\d+(?:\.\d+)?)[k]?[-~至到](\d+(?:\.\d+)?)[k]?/i);
      if (!m) return { min: 0, max: 0 };
      let min = parseFloat(m[1]);
      let max = parseFloat(m[2]);
      // K 单位：< 1000 视为以 K 为单位
      if (min < 1000) min = min * 1000;
      if (max < 1000) max = max * 1000;
      return { min: Math.round(min), max: Math.round(max) };
    };

    // ============================================================
    // 封装成前端期望的嵌套 MatchJobResult 格式
    // ============================================================
    const jobs = (hotJobs || []) as Array<{
      id: string | number;
      job_title: string;
      company: string | null;
      company_type: string | null;
      city: string | null;
      salary_range: string | null;
      education: string | null;
      experience: string | null;
      industry: string | null;
      hard_skills: string[] | null;
      soft_skills: string[] | null;
      fresh_graduate_friendly: boolean | null;
    }>;

    const matches = jobs.map((job, index) => {
      const { min: salaryMin, max: salaryMax } = parseSalary(job.salary_range);
      const jobSkills: string[] = [
        ...(Array.isArray(job.hard_skills) ? job.hard_skills : []),
        ...(Array.isArray(job.soft_skills) ? job.soft_skills : []),
      ].filter((s) => typeof s === 'string' && s.trim());

      // 命中算分：默认技能 ∩ 岗位技能
      const matchedSkills = jobSkills.filter((s) =>
        DEFAULT_SKILLS.some((d) => s.includes(d) || d.includes(s))
      );
      const gapSkills = jobSkills.filter((s) => !matchedSkills.includes(s)).slice(0, 5);

      // 匹配度：默认基线 60，按排名递减（保证前端体验 95→60 渐变）
      const baseScore = Math.max(60, 95 - index * 2);

      return {
        job: {
          id: typeof job.id === 'string' ? parseInt(job.id, 10) || index + 1 : job.id,
          jobName: job.job_title,
          city: job.city || '',
          industry: job.industry || '',
          salaryMin,
          salaryMax,
          salaryRange: job.salary_range || '面议',
          requiredSkills: jobSkills,
        },
        matchScore: baseScore,
        weightedScore: baseScore,
        matchedSkills,
        gapSkills,
        requiredGaps: gapSkills,
        learningPath: [],
        salary: {
          estimatedMin: salaryMin,
          estimatedMax: salaryMax,
          estimatedMedian: Math.round((salaryMin + salaryMax) / 2),
        },
      };
    });

    return NextResponse.json({
      success: true,
      matches,
      user_skills: DEFAULT_SKILLS,
      total: matches.length,
    });

  } catch (error) {
    console.error('[match] GET Error:', error);
    return NextResponse.json(
      { error: '查询失败，请重试' },
      { status: 500 }
    );
  }
}
