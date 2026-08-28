export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { interviewRadar, listIndustryRadars } from '@/lib/career-paths/engine/interview_radar';

/**
 * 面试行业雷达 · B1
 * - GET  /api/career-planning/interview-radar          → 返回可查询的行业列表
 * - POST /api/career-planning/interview-radar          → 根据行业+专业返回面试雷达
 *   输入：{ industry?, major? }  (industry 与 major 至少其一)
 *   输出：InterviewRadarReport（考察重点/高频问题+潜台词/雷区/建议）
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    return NextResponse.json({ success: true, data: listIndustryRadars() });
  } catch (error) {
    console.error('[career-planning/interview-radar] GET error:', error);
    return NextResponse.json({ error: '服务暂时不可用，请稍后重试' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: '请求体不是合法 JSON' }, { status: 400 });
    }

    const industry = typeof body.industry === 'string' ? body.industry.trim() : '';
    const major = typeof body.major === 'string' ? body.major.trim() : '';
    if (!industry && !major) {
      return NextResponse.json({ error: '请提供目标行业或你的专业' }, { status: 400 });
    }

    const report = interviewRadar(industry || undefined, major || undefined);
    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    console.error('[career-planning/interview-radar] POST error:', error);
    return NextResponse.json({ error: '面试雷达服务暂时不可用，请稍后重试' }, { status: 500 });
  }
}
