export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { analyzeCapabilityGap, listCapabilityJobs } from '@/lib/career-paths/engine/capability_dictionary';

/**
 * 能力翻译词典 · 横向岗位对标 + 差距诊断
 * - GET  /api/career-planning/capability-dictionary      → 返回已支持对标的内置岗位列表（供前端下拉/展示）
 * - POST /api/career-planning/capability-dictionary      → 翻译经历 + 诊断与目标岗位的能力差距
 *   输入：{ targetJob?, experience? }  (targetJob 可选；experience 可选，传了才做差距诊断)
 *   输出：CapabilityReport（已覆盖要求 / 关键差距+补课路径 / 推荐投递）
 * 说明：判断力 ≠ 打分——输出「解释 + 路径 + 建议」，不输出单一分数，守四真。
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    return NextResponse.json({ success: true, data: listCapabilityJobs() });
  } catch (error) {
    console.error('[career-planning/capability-dictionary] GET error:', error);
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

    const targetJob = typeof body.targetJob === 'string' ? body.targetJob.trim() : '';
    const experience = typeof body.experience === 'string' ? body.experience.trim() : '';

    const report = analyzeCapabilityGap({ targetJob: targetJob || undefined, experience: experience || undefined });
    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    console.error('[career-planning/capability-dictionary] POST error:', error);
    return NextResponse.json({ error: '能力翻译词典服务暂时不可用，请稍后重试' }, { status: 500 });
  }
}
