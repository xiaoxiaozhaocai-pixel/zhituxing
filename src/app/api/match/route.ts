export const dynamic = 'force-dynamic';
/**
 * 岗位匹配 API - 根据用户技能匹配推荐岗位
 *
 * 契约化版本（2026-05-29）：
 *   - 响应统一走 jsonOk(schema, data) / jsonError(code, msg)
 *   - schema 定义见 @/lib/api-contracts/match
 *
 * 认证方式：与 /api/chat 完全相同（从 cookie 读取 sb-access-token + Supabase Auth 验证）
 *
 * 历史遗留：POST 用 snake_case (job_title)、GET 用 camelCase (jobName)，本次仅契约化，
 *           不重写命名风格。后续可统一为 camelCase。
 */

import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sanitizeJDList } from '@/lib/jd-sanitizer';
import { jsonOk, jsonError, parseRequestBody } from '@/lib/api-contracts/_shared';
import { generateXiaozhiNote } from '@/lib/xiaozhi-recommend';
import {
  MatchPostRequestSchema,
  MatchPostDataSchema,
  MatchGetDataSchema,
  type MatchPostItem,
} from '@/lib/api-contracts/match';

export async function POST(request: NextRequest) {
  try {
    // ============================================================
    // 认证检查
    // ============================================================
    const accessToken = request.cookies.get('sb-access-token');
    if (!accessToken) {
      return jsonError('UNAUTHORIZED', '请先登录');
    }

    const supabase = getSupabaseAdmin();
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken.value);

    if (authError || !user) {
      console.error('[match] Token verification failed:', authError?.message);
      return jsonError('TOKEN_EXPIRED', '登录已过期，请重新登录');
    }

    // ============================================================
    // 请求体校验（zod）
    // ============================================================
    const parsed = await parseRequestBody(request, MatchPostRequestSchema);
    if (!parsed.ok) return parsed.response;
    const { skills, targetPosition, industry } = parsed.data;

    const validSkills = skills.filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim());
    if (validSkills.length === 0) {
      return jsonError('MISSING_FIELD', '请提供有效的技能名称');
    }

    // ============================================================
    // 查询匹配岗位
    // ============================================================
    const { data: jdData, error: jdError } = await (supabase as any)
      .from('job_descriptions')
      .select('id, job_title, company, company_type, city, salary_range, education, experience, industry, hard_skills, soft_skills, tags, fresh_graduate_friendly')
      .or('is_synthetic.is.null,is_synthetic.eq.false')
      .limit(100);

    if (jdError) {
      console.error('[match] Failed to query job_descriptions:', jdError.message);
      return jsonError('INTERNAL_ERROR', '查询岗位数据失败', { details: jdError.message });
    }

    if (!jdData || jdData.length === 0) {
      return jsonOk(MatchPostDataSchema, {
        matches: [],
        user_skills: validSkills,
        total: 0,
        message: '暂无岗位数据',
      });
    }

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

      const jdSkills = [...hardSkillsArr, ...softSkillsArr];

      const matchedSkills = validSkills.filter((s: string) =>
        jdSkills.some((js: string) =>
          js.toLowerCase().includes(s.toLowerCase()) ||
          s.toLowerCase().includes(js.toLowerCase())
        )
      );

      const skillMatchScore = validSkills.length > 0
        ? Math.round((matchedSkills.length / validSkills.length) * 100)
        : 0;

      let industryMatch = 0;
      if (industry && jd.industry) {
        if (jd.industry.toLowerCase().includes(industry.toLowerCase()) ||
            industry.toLowerCase().includes(jd.industry.toLowerCase())) {
          industryMatch = 10;
        }
      }

      const totalMatchScore = Math.min(100, skillMatchScore + industryMatch);

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
        gap_skills: gapSkills.slice(0, 5),
        fresh_graduate_friendly: jd.fresh_graduate_friendly,
      };
    })
    .filter((m: { match_score: number }) => m.match_score > 0)
    .sort((a: { match_score: number }, b: { match_score: number }) => b.match_score - a.match_score)
    .slice(0, 10);

    let finalMatches = matches;
    if (targetPosition && matches.length > 0) {
      const targetLower = targetPosition.toLowerCase();
      const targetMatches = matches.filter((m: { job_title?: string }) => {
        const jobTitle = m.job_title?.toLowerCase() || '';
        return jobTitle.includes(targetLower) || targetLower.includes(jobTitle);
      });
      if (targetMatches.length > 0) {
        finalMatches = targetMatches;
      }
    }

    // 为每个匹配结果生成小职推荐语
    const matchesWithNotes = (finalMatches as any[]).map((m) => ({
      ...m,
      xiaozhi_note: generateXiaozhiNote({
        matchScore: m.match_score || 0,
        jobTitle: m.job_title || '',
        company: m.company || '',
        matchedSkills: m.matched_skills || [],
        gapSkills: m.gap_skills || [],
        freshGraduateFriendly: m.fresh_graduate_friendly,
        targetPosition: targetPosition || undefined,
        industry: industry || undefined,
      }),
    }));

    return jsonOk(MatchPostDataSchema, {
      matches: sanitizeJDList(matchesWithNotes) as MatchPostItem[],
      user_skills: validSkills,
      total: matchesWithNotes.length,
    });

  } catch (error) {
    console.error('[match] Error:', error);
    return jsonError('INTERNAL_ERROR', '匹配失败，请重试');
  }
}

// ============================================================
// GET：默认通用应届技能 + ilike(target_position) 查询
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('sb-access-token');
    if (!accessToken) {
      return jsonError('UNAUTHORIZED', '请先登录');
    }

    const supabase = getSupabaseAdmin();
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken.value);
    if (authError || !user) {
      return jsonError('TOKEN_EXPIRED', '登录已过期，请重新登录');
    }

    const { searchParams } = new URL(request.url);
    const targetPosition = searchParams.get('target_position') || '';

    const DEFAULT_SKILLS = ['沟通能力', '学习能力', '团队协作', 'Excel', '数据分析', 'Python', 'SQL', '英语'];

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
      return jsonError('INTERNAL_ERROR', '查询岗位失败', { details: error.message });
    }

    const parseSalary = (raw: string | null): { min: number; max: number } => {
      if (!raw) return { min: 0, max: 0 };
      const s = raw.replace(/\s/g, '').toLowerCase();
      const m = s.match(/(\d+(?:\.\d+)?)[k]?[-~至到](\d+(?:\.\d+)?)[k]?/i);
      if (!m) return { min: 0, max: 0 };
      let min = parseFloat(m[1]);
      let max = parseFloat(m[2]);
      if (min < 1000) min = min * 1000;
      if (max < 1000) max = max * 1000;
      return { min: Math.round(min), max: Math.round(max) };
    };

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

      const matchedSkills = jobSkills.filter((s) =>
        DEFAULT_SKILLS.some((d) => s.includes(d) || d.includes(s))
      );
      const gapSkills = jobSkills.filter((s) => !matchedSkills.includes(s)).slice(0, 5);

      const baseScore = Math.max(60, 95 - index * 2);

      // 生成小职推荐语
      const xiaozhiNote = generateXiaozhiNote({
        matchScore: baseScore,
        jobTitle: job.job_title,
        company: job.company || '',
        matchedSkills,
        gapSkills,
        freshGraduateFriendly: job.fresh_graduate_friendly,
        targetPosition: targetPosition || undefined,
        industry: job.industry || undefined,
      });

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
        xiaozhi_note: xiaozhiNote,
      };
    });

    return jsonOk(MatchGetDataSchema, {
      matches,
      user_skills: DEFAULT_SKILLS,
      total: matches.length,
    });

  } catch (error) {
    console.error('[match] GET Error:', error);
    return jsonError('INTERNAL_ERROR', '查询失败，请重试');
  }
}
