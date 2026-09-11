import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { generateCareerPlan } from '@/lib/career-planning/generate-plan';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ code: 401, message: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { major, grade, city, targetIndustry, targetJob } = body;

    if (!major || !grade) {
      return NextResponse.json({ code: 400, message: '请填写专业和年级' }, { status: 400 });
    }

    // 方向四重构：核心逻辑抽离至 lib（route 与 chat 工具执行器共用），行为保持一致
    const plan = await generateCareerPlan({
      userId: user.id,
      major,
      grade,
      city,
      targetIndustry,
      targetJob,
    });

    return NextResponse.json({
      code: 200,
      data: { id: plan.id },
      message: '报告生成成功',
    });
  } catch (error) {
    console.error('生成规划失败:', error);
    const msg = error instanceof Error ? error.message : '生成失败';
    return NextResponse.json({ code: 500, message: msg }, { status: 500 });
  }
}
