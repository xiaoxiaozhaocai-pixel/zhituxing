/**
 * 技能画像智能体 API
 * POST: 调用技能画像智能体，根据专业+意向行业+意向城市推荐技能
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getUserInfoFromRequest,
  getUserProfileContext,
  callCozeStreamApi,
  createCozeSSEStream,
  createTextStream,
} from '@/lib/coze-stream';

export const runtime = 'edge';

function getSkillPortraitFallback(major?: string, targetCity?: string): string {
  return `您好！我是职途星技能画像助手。

基于您的专业「${major || '未填写'}」和意向城市「${targetCity || '未填写'}」，我来为您推荐合适的技能组合。

请稍后，正在为您生成专业能力画像...`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { major, target_industry, target_city, job_intention, message } = body;

    // 1. 用户验证
    const userInfo = await getUserInfoFromRequest(request);
    const userId = userInfo?.userId || null;
    const userType = userInfo?.userType || 'free';

    // 2. 构建用户上下文
    let userContext = '';
    if (userId) {
      userContext = await getUserProfileContext(userId);
    }

    // 3. 构建技能画像请求消息
    const queryContent = message || `请根据以下用户信息，为用户生成一份详细的技能画像推荐：

【基本信息】
- 专业：${major || '未填写'}
- 意向行业：${target_industry || '未填写'}
- 意向城市：${target_city || '未填写'}
- 求职意向：${job_intention || '未填写'}

请按照以下格式输出：

PROFESSIONAL_SKILLS_START
技能名称|热门程度(hot/normal/optional)|重要性说明
（每行一个技能）
PROFESSIONAL_SKILLS_END

OFFICE_SKILLS_START
技能名称|热门程度(hot/normal/optional)|重要性说明
（每行一个技能）
OFFICE_SKILLS_END

SOFT_SKILLS_START
技能名称|热门程度(hot/normal/optional)|重要性说明
（每行一个技能）
SOFT_SKILLS_END

SKILL_SUMMARY_START
（对用户技能画像的综合分析和建议）
SKILL_SUMMARY_END

请注意：
1. 专业核心技能推荐5-10个，与专业高度相关
2. 办公软件技能推荐3-5个，包含必备和进阶
3. 软技能推荐3-5个，与求职方向匹配
4. 每个技能标注热门程度：hot(市场急需)、normal(常见需求)、optional(加分项)
5. 给出每个技能的重要性说明`;

    const finalMessage = userContext + queryContent;

    // 4. 获取 Bot ID（标准 Bot 模式）
    const botId = process.env.COZE_BOT_SKILL_PORTRAIT;
    if (!botId) {
      console.error('COZE_BOT_SKILL_PORTRAIT not configured');
      const fallback = getSkillPortraitFallback(major, target_city);
      return new Response(createTextStream(fallback), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // 5. 调用标准 Bot stream API
    const cozeResponse = await callCozeStreamApi({
      botId,
      message: finalMessage,
      userType: userType,
    });

    // 检查响应状态
    if (!cozeResponse.ok) {
      console.error('Skill Portrait Bot API error:', cozeResponse.status);
      const fallback = getSkillPortraitFallback(major, target_city);
      return new Response(createTextStream(fallback), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // 如果响应不是流式的（返回 JSON 错误）
    const contentType = cozeResponse.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const errorData = await cozeResponse.json();
      console.error('Skill Portrait Bot API JSON error:', errorData);
      const fallback = getSkillPortraitFallback(major, target_city);
      return new Response(createTextStream(fallback), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // 6. 创建 SSE 流
    const stream = createCozeSSEStream({
      cozeResponse,
      userId,
      botType: 'skill_portrait',
      fallbackText: getSkillPortraitFallback(major, target_city),
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('技能画像生成失败:', error);
    return NextResponse.json(
      { code: 500, message: '技能画像生成失败', error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
