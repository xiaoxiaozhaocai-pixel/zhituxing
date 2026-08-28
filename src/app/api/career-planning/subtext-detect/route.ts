export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { decodeSubtext, listSubtextGlossary } from '@/lib/career-paths/engine/subtext_dictionary';

/**
 * 潜台词词条库 · B2
 * - GET  /api/career-planning/subtext-detect          → 返回全部词条（供学习/展示）
 * - POST /api/career-planning/subtext-detect          → 拆解输入文本的潜台词
 *   输入：{ text }  (JD 片段 / 简历句 / 面试问题 / 公司文化描述)
 *   输出：SubtextReport（命中词条+潜台词+风险+应对）
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    return NextResponse.json({ success: true, data: listSubtextGlossary() });
  } catch (error) {
    console.error('[career-planning/subtext-detect] GET error:', error);
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

    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text) {
      return NextResponse.json({ error: '请提供要拆解的文本' }, { status: 400 });
    }

    const report = decodeSubtext(text);
    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    console.error('[career-planning/subtext-detect] POST error:', error);
    return NextResponse.json({ error: '潜台词拆解服务暂时不可用，请稍后重试' }, { status: 500 });
  }
}
