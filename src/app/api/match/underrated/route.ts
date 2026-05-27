export const dynamic = 'force-dynamic';
/**
 * 反向匹配 API — 找出用户被低估的岗位
 * 
 * 逻辑：找出那些用户匹配度较高但竞争较小的岗位
 * 这些岗位用户可能因为不熟悉而忽略
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

interface UnderratedJob {
  jobName: string;
  matchScore: number;
  reason: string;
  city?: string;
  industry?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { skills } = body;

    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      return NextResponse.json({
        success: false,
        error: '请提供技能列表',
      }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 获取岗位数据
    const { data: jobs, error } = await (supabase as any)
      .from('job_descriptions')
      .or('is_synthetic.is.null,is_synthetic.eq.false')
      .select('id, job_title, city, industry, hard_skills, soft_skills, salary_min, salary_max')
      .limit(100);

    if (error) {
      console.error('查询岗位失败:', error);
      return NextResponse.json({
        success: false,
        error: '查询岗位失败',
      }, { status: 500 });
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // 计算每个岗位的匹配度
    const matchResults = (jobs as any[]).map((job: { hard_skills?: string[]; soft_skills?: string[]; job_title: string; city?: string; industry?: string; salary_min?: number; salary_max?: number }) => {
      const requiredSkills = [
        ...(job.hard_skills || []),
        ...(job.soft_skills || []),
      ].map((s: string) => s.toLowerCase().trim());

      const userSkillsLower = skills.map((s: string) => s.toLowerCase().trim());

      // 计算匹配的技能数
      const matchedSkills = requiredSkills.filter((req: string) =>
        userSkillsLower.some((user: string) =>
          req.includes(user) || user.includes(req)
        )
      );

      // 匹配度 = 匹配技能数 / 要求技能数
      const matchScore = requiredSkills.length > 0
        ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
        : 0;

      return {
        job,
        matchScore,
        matchedCount: matchedSkills.length,
        requiredCount: requiredSkills.length,
      };
    });

    // 反向匹配策略：找出匹配度在 40-70% 区间的岗位
    // 这些岗位用户有能力胜任，但可能因为不了解而忽略
    const underratedCandidates = matchResults
      .filter((r) => r.matchScore >= 40 && r.matchScore <= 70)
      .sort((a, b) => {
        // 优先选择：匹配度接近 60%（有挑战但能胜任）
        const aDiff = Math.abs(a.matchScore - 60);
        const bDiff = Math.abs(b.matchScore - 60);
        return aDiff - bDiff;
      })
      .slice(0, 10);

    // 生成推荐理由
    const underratedJobs: UnderratedJob[] = underratedCandidates.map((item) => {
      const reasons = [];
      
      if (item.matchScore >= 50 && item.matchedCount >= 3) {
        reasons.push(`你已具备${item.matchedCount}项核心技能`);
      }
      
      if (item.job.salary_min && item.job.salary_max) {
        const avgSalary = (item.job.salary_min + item.job.salary_max) / 2;
        if (avgSalary >= 10000) {
          reasons.push('薪资待遇不错');
        }
      }

      if (item.requiredCount > item.matchedCount && item.requiredCount - item.matchedCount <= 3) {
        reasons.push(`只需补强${item.requiredCount - item.matchedCount}项技能即可达标`);
      }

      if (reasons.length === 0) {
        reasons.push('值得考虑的发展方向');
      }

      return {
        jobName: item.job.job_title,
        matchScore: item.matchScore,
        reason: reasons.join('，'),
        city: item.job.city,
        industry: item.job.industry,
      };
    });

    // 如果候选不够，从匹配度 30-40% 中补充（潜力岗位）
    if (underratedJobs.length < 3) {
      const potentialCandidates = matchResults
        .filter((r) => r.matchScore >= 30 && r.matchScore < 40)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 3 - underratedJobs.length);

      potentialCandidates.forEach((item) => {
        underratedJobs.push({
          jobName: item.job.job_title,
          matchScore: item.matchScore,
          reason: `有发展潜力，建议先了解岗位要求`,
          city: item.job.city,
          industry: item.job.industry,
        });
      });
    }

    return NextResponse.json({
      success: true,
      data: underratedJobs.slice(0, 3),
    });
  } catch (error) {
    console.error('反向匹配失败:', error);
    return NextResponse.json({
      success: false,
      error: '反向匹配失败',
    }, { status: 500 });
  }
}
