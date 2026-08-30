export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { planCareerPath, listTracks } from '@/lib/career-paths/engine/career_path_planner';

/**
 * 职业路径规划建模 · B3
 * - GET  /api/career-planning/career-path   → 返回可选方向列表（供前端下拉/学习）
 * - POST /api/career-planning/career-path   → 根据专业/年级/方向 返回成长路线
 *   输入：{ major?, grade?, direction?, skills? }
 *   输出：PathPlanReport（当前阶段 + 从当前到毕业的成长路线：focus/actions/milestone/nextHint）
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    return NextResponse.json({ success: true, data: listTracks() });
  } catch (error) {
    console.error('[career-planning/career-path] GET error:', error);
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

    const report = planCareerPath({
      major: typeof body.major === 'string' ? body.major.trim() : '',
      grade: typeof body.grade === 'string' ? body.grade.trim() : '',
      direction: typeof body.direction === 'string' ? body.direction.trim() : '',
      skills: typeof body.skills === 'string' ? body.skills.trim() : '',
    });
    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    console.error('[career-planning/career-path] POST error:', error);
    return NextResponse.json({ error: '职业路径规划服务暂时不可用，请稍后重试' }, { status: 500 });
  }
}
