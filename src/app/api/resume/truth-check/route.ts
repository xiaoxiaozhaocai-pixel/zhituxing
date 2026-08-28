export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { walkTruthfulness } from '@/lib/career-paths/engine/truthfulness';

/**
 * POST /api/resume/truth-check
 * 真实性红线四真质检（A4）——本地 Heuristic 引擎，不调模型
 * 输入：experience(必填) + targetJob(选填)
 * 输出：四真维度状态 + 风险点列表 + 收敛建议 + verdict
 */
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

    const experience = typeof body.experience === 'string' ? body.experience.trim() : '';
    if (!experience) {
      return NextResponse.json({ error: '经历描述是必填项' }, { status: 400 });
    }

    const targetJob = typeof body.targetJob === 'string' ? body.targetJob.trim() : undefined;
    const report = walkTruthfulness(experience, targetJob);

    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    console.error('[resume/truth-check] Unexpected error:', error);
    return NextResponse.json({ error: '真实性质检服务暂时不可用，请稍后重试' }, { status: 500 });
  }
}
