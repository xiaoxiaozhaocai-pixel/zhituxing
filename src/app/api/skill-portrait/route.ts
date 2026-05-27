export const dynamic = 'force-dynamic';
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

export const runtime = 'nodejs';

function getSkillPortraitFallback(major?: string, targetCity?: string): string {
  const majorName = major || '您的专业';
  const cityName = targetCity || '意向城市';
  
  return `您好！我是职途星技能画像助手。

基于您的专业「${majorName}」和意向城市「${cityName}」，我来为您推荐合适的技能组合。

PROFESSIONAL_SKILLS_START
Python编程|hot|数据分析和自动化脚本的核心语言
数据分析|hot|互联网和金融行业必备能力
SQL数据库|hot|数据处理和查询的基础技能
Excel高级应用|normal|数据处理和报表制作必备
项目管理|normal|跨部门协作和进度把控
统计学基础|normal|数据分析的理论基础
PROFESSIONAL_SKILLS_END

OFFICE_SKILLS_START
Excel数据处理|hot|数据透视表、函数公式必备
PPT演示制作|normal|方案汇报和成果展示
Word文档排版|normal|报告撰写和文档整理
思维导图|optional|思路整理和方案规划
OFFICE_SKILLS_END

SOFT_SKILLS_START
沟通表达|hot|团队协作和项目推进的关键
问题分析|hot|发现问题和提出解决方案
时间管理|normal|多任务并行和优先级把控
主动学习|normal|快速适应新领域和新技术
SOFT_SKILLS_END

SKILL_SUMMARY_START
根据您的${majorName}背景，建议优先掌握Python编程和数据分析技能，这是当前市场需求最旺盛的方向。同时培养沟通表达和问题分析能力，帮助您在职场中脱颖而出。

建议学习路径：
1. 先掌握Python基础语法（2-4周）
2. 学习Pandas/NumPy数据分析库（4-6周）
3. 完成实际数据分析项目练手
4. 持续提升软技能，多参与团队协作
SKILL_SUMMARY_END`;
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
