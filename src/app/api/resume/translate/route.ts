export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { translateExperience } from '@/lib/resume/translate-experience';

interface TranslateRequest {
  experience: string;
  target_industry?: string;
}

/**
 * POST /api/resume/translate
 * 将口语化的经历描述翻译为专业简历用语（JD语言）
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body: TranslateRequest = await request.json();
    const { experience, target_industry } = body;

    if (!experience || experience.trim().length === 0) {
      return NextResponse.json(
        { error: '经历描述是必填项' },
        { status: 400 }
      );
    }

    const result = await translateExperience(experience, target_industry || undefined);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[resume-translate] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : '翻译异常';

    if (errorMessage.includes('DeepSeek API')) {
      return NextResponse.json(
        { error: 'AI翻译服务暂时不可用，请稍后重试' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: '能力翻译异常' },
      { status: 500 }
    );
  }
}
