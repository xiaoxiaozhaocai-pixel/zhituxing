/**
 * 岗位匹配API
 * POST /api/match
 *
 * 根据用户技能匹配岗位，调用匹配算法计算匹配度、缺口分析、薪资估算
 */

import { NextRequest, NextResponse } from 'next/server';
// SECURITY-TODO: migrate to Supabase query builder to prevent SQL injection
import { execSql } from '@/lib/exec-sql';
import { getUserInfoFromRequest } from '@/lib/coze-stream';
import {
  calculateSkillMatch,
  analyzeSkillGaps,
  estimateSalaryRange,
  parseSalaryRange,
  parseJobSkills,
  extractUserSkillsFromAbilityBackground,
  parseUserSkillsFromText,
  type UserSkill,
  type SkillRelation,
  type JobDescription,
  type SkillMatchResult,
  type SkillGapAnalysisResult,
  type SalaryEstimationResult,
} from '@/lib/matching-algorithm';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { target_position, limit } = body;

    // 1. 用户验证
    const userInfo = await getUserInfoFromRequest(request);
    const userId = userInfo?.userId || null;

    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 2. 获取用户技能
    const userSkills = await fetchUserSkills(userId);

    if (userSkills.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: '请先在个人资料中填写技能信息',
      });
    }

    // 3. 查询岗位列表（可按目标岗位过滤）
    const maxResults = Math.min(limit || 20, 50);
    const jobs = await fetchJobs(target_position, maxResults);

    if (jobs.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: '暂无匹配岗位',
      });
    }

    // 4. 获取技能关系（用于缺口分析）
    const skillRelations = await fetchSkillRelations();

    // 5. 对每个岗位计算匹配度
    const results: Array<{
      job: JobDescription;
      match: SkillMatchResult;
      gapAnalysis: SkillGapAnalysisResult | null;
      salary: SalaryEstimationResult | null;
    }> = [];

    for (const job of jobs) {
      // 计算技能匹配度
      const match = calculateSkillMatch(userSkills, job.skills, {
        weighted: true,
        fuzzyThreshold: 0.8,
      });

      // 技能缺口分析
      let gapAnalysis: SkillGapAnalysisResult | null = null;
      if (match.gapSkills.length > 0) {
        const knownSkillNames = userSkills.map((s) => s.name);
        gapAnalysis = analyzeSkillGaps(match.gapSkills, skillRelations, knownSkillNames);
      }

      // 薪资估算
      let salary: SalaryEstimationResult | null = null;
      if (job.salaryMin && job.salaryMax) {
        salary = estimateSalaryRange(match.matchScore, job.salaryMin, job.salaryMax);
      } else if (job.salaryRange) {
        const parsed = parseSalaryRange(job.salaryRange);
        if (parsed) {
          salary = estimateSalaryRange(match.matchScore, parsed.min, parsed.max);
        }
      }

      results.push({ job, match, gapAnalysis, salary });
    }

    // 6. 按匹配度降序排列
    results.sort((a, b) => b.match.matchScore - a.match.matchScore);

    // 7. 保存匹配结果到 skill_job_match 表
    const topResult = results[0];
    if (topResult) {
      saveMatchResult(userId, results.slice(0, 5)).catch((err) =>
        console.error('[match] 保存匹配结果失败:', err)
      );
    }

    return NextResponse.json({
      success: true,
      data: results.map((r) => ({
        job: {
          id: r.job.id,
          jobName: r.job.jobName,
          city: r.job.city,
          industry: r.job.industry,
          salaryMin: r.job.salaryMin,
          salaryMax: r.job.salaryMax,
          salaryRange: r.job.salaryRange,
          requiredSkills: r.job.skills.map((s) => s.name),
        },
        matchScore: r.match.matchScore,
        weightedScore: r.match.weightedScore,
        matchedSkills: r.match.matchedSkills,
        gapSkills: r.match.gapSkills,
        requiredGaps: r.match.requiredGaps,
        learningPath: r.gapAnalysis?.learningPath || null,
        prerequisiteChains: r.gapAnalysis?.prerequisiteChains || null,
        salary: r.salary
          ? {
              estimatedMin: r.salary.estimatedSalaryMin,
              estimatedMax: r.salary.estimatedSalaryMax,
              estimatedMedian: r.salary.estimatedSalaryMedian,
            }
          : null,
      })),
      total: results.length,
      userSkills: userSkills.map((s) => s.name),
    });
  } catch (error) {
    console.error('[match] API Error:', error);
    return NextResponse.json(
      { error: '匹配计算失败', detail: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

// ============================================================
// 辅助函数
// ============================================================

/** 获取用户技能（从 user_skills 表 + user_profiles 表） */
async function fetchUserSkills(userId: string): Promise<UserSkill[]> {
  const skills: UserSkill[] = [];

  // 从 user_skills 表获取
  try {
    const rows = await execSql(
      `SELECT skill_name, level, proficiency FROM user_skills WHERE user_id = '${userId}'`
    );
    for (const row of rows as Array<{ skill_name: string; level: number; proficiency: string }>) {
      skills.push({ name: row.skill_name, level: row.level, proficiency: row.proficiency });
    }
  } catch {
    // user_skills 表可能无数据，继续
  }

  // 从 user_profiles 补充
  try {
    const rows = await execSql(
      `SELECT skills, ability_background FROM user_profiles WHERE user_id = '${userId}' LIMIT 1`
    );
    if (rows && rows.length > 0) {
      const profile = rows[0] as { skills: string | null; ability_background: string | null };

      // 从 skills 文本字段提取
      const textSkills = parseUserSkillsFromText(profile.skills);
      for (const s of textSkills) {
        if (!skills.some((es) => es.name.toLowerCase() === s.name.toLowerCase())) {
          skills.push(s);
        }
      }

      // 从 ability_background jsonb 提取
      if (profile.ability_background) {
        try {
          const bg = JSON.parse(profile.ability_background);
          const bgSkills = extractUserSkillsFromAbilityBackground(bg);
          for (const s of bgSkills) {
            if (!skills.some((es) => es.name.toLowerCase() === s.name.toLowerCase())) {
              skills.push(s);
            }
          }
        } catch {
          // JSON 解析失败，跳过
        }
      }
    }
  } catch {
    // 查询失败，跳过
  }

  return skills;
}

/** 查询岗位列表 */
async function fetchJobs(targetPosition?: string, limit: number = 20): Promise<JobDescription[]> {
  try {
    let sql = `SELECT id, job_name, skills, salary_min, salary_max, salary_range, city, industry FROM jobs`;
    if (targetPosition) {
      sql += ` WHERE job_name ILIKE '%${targetPosition.replace(/'/g, "''")}%'`;
    }
    sql += ` ORDER BY id DESC LIMIT ${limit}`;

    const rows = await execSql(sql);
    return (rows as Array<Record<string, unknown>>).map((row) => ({
      id: row.id as number,
      jobName: (row.job_name as string) || '',
      skills: parseJobSkills((row.skills as string) || ''),
      salaryMin: row.salary_min as number | undefined,
      salaryMax: row.salary_max as number | undefined,
      salaryRange: (row.salary_range as string) || undefined,
      city: (row.city as string) || undefined,
      industry: (row.industry as string) || undefined,
    }));
  } catch (error) {
    console.error('[match] 查询岗位失败:', error);
    return [];
  }
}

/** 获取技能关系 */
async function fetchSkillRelations(): Promise<SkillRelation[]> {
  try {
    const rows = await execSql(
      `SELECT source_skill, target_skill, relation_type, weight FROM skill_relations`
    );
    return (rows as Array<Record<string, unknown>>).map((row) => ({
      sourceSkill: row.source_skill as string,
      targetSkill: row.target_skill as string,
      relationType: row.relation_type as SkillRelation['relationType'],
      weight: Number(row.weight) || 0.5,
    }));
  } catch {
    return [];
  }
}

/** 保存匹配结果到 skill_job_match 表 */
async function saveMatchResult(
  userId: string,
  results: Array<{ job: JobDescription; match: SkillMatchResult; salary: SalaryEstimationResult | null }>
): Promise<void> {
  const matchData = results.map((r) => ({
    jobName: r.job.jobName,
    matchScore: r.match.matchScore,
    matchedSkills: r.match.matchedSkills,
    gapSkills: r.match.gapSkills,
    estimatedSalary: r.salary
      ? { min: r.salary.estimatedSalaryMin, max: r.salary.estimatedSalaryMax }
      : null,
  }));

  const jsonStr = JSON.stringify(matchData).replace(/'/g, "''");
  const now = new Date().toISOString();

  await execSql(
    `INSERT INTO skill_job_match (user_id, match_data, created_at) VALUES ('${userId}', '${jsonStr}', '${now}')`
  );
}
