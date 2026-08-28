/**
 * C 人格兜底层 API
 *
 * 端点：/api/career-planning/persona
 *  - GET  ：返回预设人格卡列表 + 可调维度说明（供前端人格设置）
 *  - POST ：传入 { presetId?, dims?, description? }，归一化人格配置，
 *           返回 PersonaProfile + 示例兜底话术（零模型成本）
 *
 * 鉴权：同 career-planning 其他端点（401 未登录）。
 * 语义：人格 = 温度/包装，内核是判断力 + 四真。不因人格而软化真实性红线。
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { listPersonas, resolvePersona, personaFallbackReply } from '@/lib/career-paths/engine/persona';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SCENARIOS = ['chat', 'empty', 'fail', 'no_data', 'unknown'] as const;

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    return NextResponse.json({
      success: true,
      data: {
        presets: listPersonas(),
        scenarios: SCENARIOS,
        dims: [
          { key: 'warmth', label: '温度', low: '冷', high: '暖' },
          { key: 'directness', label: '直接度', low: '委婉', high: '犀利' },
          { key: 'encouragement', label: '鼓励度', low: '少', high: '多' },
          { key: 'humor', label: '幽默感', low: '正经', high: '爱闹' },
        ],
      },
    });
  } catch (error) {
    console.error('[persona] GET error:', error);
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

    const dims = body.dims && typeof body.dims === 'object' ? body.dims : undefined;
    const persona = resolvePersona({
      presetId: typeof body.presetId === 'string' ? body.presetId : undefined,
      dims,
      description: typeof body.description === 'string' ? body.description.trim() : '',
    });

    return NextResponse.json({
      success: true,
      data: {
        persona,
        sampleReply: personaFallbackReply(persona, 'chat'),
      },
    });
  } catch (error) {
    console.error('[persona] POST error:', error);
    return NextResponse.json({ error: '服务暂时不可用，请稍后重试' }, { status: 500 });
  }
}
