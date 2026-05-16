/**
 * 通用聊天API — 路由到不同Coze智能体
 * 
 * 改造要点：
 * - 用户验证改查 user_profiles 表，查出 user_type
 * - Coze API 传入 custom_variables: { user_type }
 * - 真正的边读边转发流式传输
 * - SSE 解析器提取结构化数据，存入对应 Supabase 表
 */

import { NextRequest } from 'next/server';
import { checkFeatureAccess } from '@/lib/quota';
import {
  getUserInfoFromRequest,
  getUserProfileContext,
  callCozeStreamApi,
  createCozeSSEStream,
  createTextStream,
  saveStructuredData,
} from '@/lib/coze-stream';

export const runtime = 'edge';

// 智能体路由选择
function selectBotId(botType?: string): string {
  const jobsBotId = process.env.COZE_BOT_ID_JOBS;
  const interviewBotId = process.env.COZE_BOT_ID_INTERVIEW;
  const decisionBotId = process.env.COZE_BOT_ID_DECISION;

  if (botType === 'jobs') return jobsBotId || '';
  if (botType === 'interview') return interviewBotId || '';
  if (botType === 'decision') return decisionBotId || '';
  if (botType === 'career') return decisionBotId || '';

  // 默认返回岗位百科ID
  return jobsBotId || '';
}

// 预设回复（Coze未配置时的fallback）
function getFallbackResponse(botType?: string, message?: string): string {
  const msgLower = (message || '').toLowerCase();

  if (botType === 'interview' || msgLower.includes('面试')) {
    return `您好！我是您的AI模拟面试官。

要开始模拟面试，请先告诉我以下信息：

1️⃣ **您应聘的岗位**（如：互联网产品经理）
2️⃣ **您的简历**（可以粘贴文字版简历）
3️⃣ **目标公司**（可选）

准备好后，我会按照标准面试流程与您互动：

📋 **面试流程：**
• 简历初筛
• HR初面（电话）
• 业务二面
• 高管终面
• 复盘反馈

请提供信息开始吧！`;
  }

  if (botType === 'decision' || msgLower.includes('考研') || msgLower.includes('就业')) {
    return `您好！我是考研就业决策助手，专注于帮助大学生做出最佳选择。

请告诉我以下信息，我来为您分析：

📊 **基本信息：**
• 您的专业：
• 当前年级：
• 成绩排名（如：前20%）：

🔍 **我可以帮您分析：**
• 考研vs就业的优劣势对比
• 适合您的考研院校推荐
• 匹配的就业岗位分析
• 详细的备考/求职时间线

请提供您的信息，开始个性化分析！`;
  }

  if (botType === 'career' || msgLower.includes('职业规划')) {
    return `您好！我是AI职业生涯规划助手。

请告诉我您的：

🎯 **基本信息：**
• 所学专业：
• 所在年级：
• 职业兴趣方向：

📈 **我能帮您规划：**
• 根据目标岗位的成长路径
• 大一到大四的分阶段计划
• 所需技能和证书
• 实习和项目建议

请提供信息，我来为您定制专属规划！`;
  }

  // 默认岗位百科回复
  return `👋 您好！我是「职途星——职搭子」，您的专属岗位百科助手。

🔍 **我可以帮您查询：**

• **岗位信息**：直接输入岗位名称，如「Java开发」「产品经理」「新媒体运营」

• **按地点推荐**：告诉我城市，如「深圳」「上海」「北京」

• **按薪资推荐**：告诉我薪资范围，如「10k-15k」「5k-8k」

• **按背景匹配**：告诉我您的专业和学历，如「计算机专业，本科」

• **智能组合**：多个条件组合，如「深圳Java开发15k-20k」

📚 覆盖互联网/金融/制造/教育/医疗等15+主流行业

请告诉我您的需求！`;
}

// SSE 流式响应头
const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
};

export async function POST(request: NextRequest) {
  try {
    const { message, botType, conversationId } = await request.json();

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: '消息内容不能为空' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. 用户验证，查 user_profiles 表获取 user_type
    const userInfo = await getUserInfoFromRequest(request);
    const userId = userInfo?.userId || null;
    const userType = userInfo?.userType || 'free';
    const botId = selectBotId(botType);
    const apiKey = process.env.COZE_API_KEY;

    // 获取用户个人信息上下文
    let userContext = '';
    if (userId) {
      userContext = await getUserProfileContext(userId);
    }

    // 检查配额（非会员需要扣减）
    if (userId && !apiKey) {
      const feature = botType === 'interview' ? 'interview' :
                      botType === 'assessment' ? 'assessment' : 'career_planning';
      const access = await checkFeatureAccess(userId, feature);
      if (!access.allowed) {
        return new Response(
          JSON.stringify({ error: 'quota_exceeded', message: access.reason }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // 如果没有配置 Coze API，使用 fallback
    if (!apiKey || !botId) {
      console.log('Coze API not configured, using fallback response');
      const fallback = getFallbackResponse(botType, message);
      return new Response(createTextStream(fallback), { headers: SSE_HEADERS });
    }

    // 2. 调用 Coze API，传入 custom_variables
    const cozeResponse = await callCozeStreamApi({
      botId,
      message,
      userType,
      conversationId,
      userContext,
    });

    // 3. 先检查 HTTP 状态码
    if (!cozeResponse.ok) {
      console.log('Coze API HTTP error:', cozeResponse.status);
      const fallback = getFallbackResponse(botType, message);
      return new Response(createTextStream(fallback), { headers: SSE_HEADERS });
    }

    // 检查 Content-Type，如果不是 SSE 流，说明返回了 JSON 错误
    const contentType = cozeResponse.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const errorText = await cozeResponse.text();
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.code && errorData.code !== 0) {
          console.log('Coze API error:', errorData.code, errorData.msg);
          const fallback = getFallbackResponse(botType, message);
          return new Response(createTextStream(fallback), { headers: SSE_HEADERS });
        }
      } catch {
        // JSON 解析失败，继续
      }
    }

    // 获取配额信息
    let quotaInfo = { remaining: -1, isMember: false };
    if (userId) {
      const access = await checkFeatureAccess(userId, 'career_planning');
      quotaInfo = {
        remaining: access.remaining ?? 0,
        isMember: access.allowed && (access.remaining === -1 || access.remaining === undefined),
      };
    }

    // 4. 流式转发 + SSE 解析器
    const fallbackForStream = getFallbackResponse(botType, message);
    const stream = createCozeSSEStream({
      cozeResponse,
      userId,
      botType,
      fallbackText: fallbackForStream,
    });

    return new Response(stream, {
      headers: {
        ...SSE_HEADERS,
        'X-Quota-Remaining': String(quotaInfo.remaining),
        'X-Is-Member': String(quotaInfo.isMember),
      },
    });
  } catch (error) {
    console.error('Chat API Error:', error);

    const fallback = getFallbackResponse();
    return new Response(createTextStream(fallback), { headers: SSE_HEADERS });
  }
}
