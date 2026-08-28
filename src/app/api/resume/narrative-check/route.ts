export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { analyzeNarrative } from '@/lib/career-paths/engine/narrative';

/**
 * POST /api/resume/narrative-check
 * 能力翻译 + 叙事权重引擎（A3）——本地 Heuristic 引擎，不调模型
 * 输入：experience(必填) + targetJob(选填)
 * 输出：叙事价值 + 三层能力得分 + 翻译建议 + 侧重点
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
    const report = analyzeNarrative(experience, targetJob);

    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    console.error('[resume/narrative-check] Unexpected error:', error);
    return NextResponse.json({ error: '能力翻译服务暂时不可用，请稍后重试' }, { status: 500 });
  }
}
