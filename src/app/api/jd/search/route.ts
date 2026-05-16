/**
 * JD搜索增强版API
 * GET /api/jd/search
 *
 * 支持关键词、城市、薪资、行业搜索，并估算薪资范围
 */

import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';
import { getUserInfoFromRequest } from '@/lib/coze-stream';
import {
  estimateSalaryRange,
  parseSalaryRange,
  parseJobSkills,
  type SalaryEstimationResult,
} from '@/lib/matching-algorithm';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const keyword = searchParams.get('keyword') || '';
    const city = searchParams.get('city') || '';
    const salaryRange = searchParams.get('salary_range') || '';
    const industry = searchParams.get('industry') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('page_size') || '20', 10)));

    // 获取用户信息（用于估算薪资时根据匹配度插值）
    const userInfo = await getUserInfoFromRequest(request);
    const userId = userInfo?.userId || null;

    // 获取用户匹配度（可选，用于薪资估算）
    let userMatchScore = 75; // 默认中间值
    if (userId) {
      try {
        const matchRows = await execSql(
          `SELECT match_data FROM skill_job_match WHERE user_id = '${userId}' ORDER BY created_at DESC LIMIT 1`
        );
        if (matchRows && matchRows.length > 0) {
          const data = matchRows[0] as Record<string, unknown>;
          const matchData = typeof data.match_data === 'string' ? JSON.parse(data.match_data) : data.match_data;
          if (Array.isArray(matchData) && matchData.length > 0 && matchData[0].matchScore) {
            userMatchScore = matchData[0].matchScore;
          }
        }
      } catch {
        // 无匹配数据，使用默认值
      }
    }

    // 构建 SQL 查询
    let whereClause = '1=1';
    if (keyword) {
      const escaped = keyword.replace(/'/g, "''");
      whereClause += ` AND (job_name ILIKE '%${escaped}%' OR skills ILIKE '%${escaped}%' OR description ILIKE '%${escaped}%')`;
    }
    if (city) {
      const escaped = city.replace(/'/g, "''");
      whereClause += ` AND city ILIKE '%${escaped}%'`;
    }
    if (industry) {
      const escaped = industry.replace(/'/g, "''");
      whereClause += ` AND industry ILIKE '%${escaped}%'`;
    }
    if (salaryRange) {
      const parsed = parseSalaryRange(salaryRange);
      if (parsed) {
        whereClause += ` AND salary_min <= ${parsed.max} AND salary_max >= ${parsed.min}`;
      }
    }

    const offset = (page - 1) * pageSize;

    // 查询总数
    const countRows = await execSql(
      `SELECT COUNT(*) as total FROM jobs WHERE ${whereClause}`
    );
    const total = (countRows[0] as Record<string, unknown>)?.total || 0;

    // 查询数据
    const rows = await execSql(
      `SELECT id, job_name, skills, salary_min, salary_max, salary_range, city, industry, description, requirements FROM jobs WHERE ${whereClause} ORDER BY id DESC LIMIT ${pageSize} OFFSET ${offset}`
    );

    // 处理结果
    const jobs = (rows as Array<Record<string, unknown>>).map((row) => {
      const salaryMin = row.salary_min as number | undefined;
      const salaryMax = row.salary_max as number | undefined;
      const salaryRangeStr = row.salary_range as string | undefined;

      // 估算薪资
      let salaryEstimation: SalaryEstimationResult | null = null;
      if (salaryMin && salaryMax) {
        salaryEstimation = estimateSalaryRange(userMatchScore, salaryMin, salaryMax);
      } else if (salaryRangeStr) {
        const parsed = parseSalaryRange(salaryRangeStr);
        if (parsed) {
          salaryEstimation = estimateSalaryRange(userMatchScore, parsed.min, parsed.max);
        }
      }

      return {
        id: row.id,
        jobName: row.job_name,
        skills: parseJobSkills((row.skills as string) || ''),
        skillNames: parseJobSkills((row.skills as string) || '').map((s) => s.name),
        salaryMin,
        salaryMax,
        salaryRange: salaryRangeStr,
        city: row.city,
        industry: row.industry,
        description: row.description,
        requirements: row.requirements,
        salaryEstimation: salaryEstimation
          ? {
              estimatedMin: salaryEstimation.estimatedSalaryMin,
              estimatedMax: salaryEstimation.estimatedSalaryMax,
              estimatedMedian: salaryEstimation.estimatedSalaryMedian,
              basedOnMatchScore: userMatchScore,
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      data: jobs,
      pagination: {
        page,
        pageSize,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / pageSize),
      },
    });
  } catch (error) {
    console.error('[jd/search] API Error:', error);
    return NextResponse.json(
      { error: '搜索JD失败', detail: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
