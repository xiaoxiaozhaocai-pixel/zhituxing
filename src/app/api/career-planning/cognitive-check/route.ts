import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { cognitiveCorrection } from '@/lib/career-paths/engine/cognitive_correction';

export const dynamic = 'force-dynamic';

/**
 * 认知校正引擎 API · L1 专业→岗位认知校正
 * 输入：major(必填) + grade(选填)
 * 输出：反推能力画像 + 可投岗位方向 + 为什么 + 行动建议
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ code: 401, message: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { major, grade } = body;

    if (!major || !String(major).trim()) {
      return NextResponse.json({ code: 400, message: '请填写专业' }, { status: 400 });
    }

    const result = cognitiveCorrection(String(major).trim(), grade || undefined);

    return NextResponse.json({
      code: 200,
      data: result,
      message: '认知校正完成',
    });
  } catch (error) {
    console.error('认知校正失败:', error);
    return NextResponse.json({ code: 500, message: '认知校正失败，请重试' }, { status: 500 });
  }
}
