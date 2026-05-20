export const dynamic = 'force-dynamic';
/**
 * 通用聊天API — 路由到不同Coze智能体
 * 
 * 优先使用扣子编程 stream_run API（Workflow部署方式）
 * 如果 stream_run 未配置，回退到标准 Coze Bot API
 * - 用户验证改查 user_profiles 表，查出 user_type
 * - 传入 custom_variables: { user_type }
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
  callWorkflowStreamApi,
  createWorkflowSSEStream,
  createTextStream,
  getWorkflowConfig,
} from '@/lib/coze-stream';
import {
  extractKeywords,
  querySupabase,
  buildRAGContext,
  createDeepSeekRAGStream,
} from '@/lib/rag-utils';

export const runtime = 'edge';

const USE_DEEPSEEK = process.env.DEEPSEEK_ENABLED === 'true';

// 智能体路由选择（标准Bot API用 — V2版本）
function selectBotId(botType?: string): string {
  if (botType === 'jobs') return process.env.COZE_BOT_JD_ASSISTANT || '';
  if (botType === 'interview') return process.env.COZE_BOT_INTERVIEW || '';
  if (botType === 'decision') return process.env.COZE_BOT_DECISION || '';
  if (botType === 'career') return process.env.COZE_BOT_CAREER_PLANNING || '';
  if (botType === 'assessment') return process.env.COZE_BOT_ASSESSMENT || process.env.COZE_BOT_CAPABILITY || '';
  if (botType === 'competency') return process.env.COZE_BOT_COMPETENCY || '';
  return process.env.COZE_BOT_JD_ASSISTANT || '';
}

// 预设回复（fallback）
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

  if (botType === 'assessment' || msgLower.includes('测评')) {
    return `您好！我是专业能力测评助手。

请告诉我您的：

🎯 **基本信息：**
• 所学专业：
• 当前年级：
• 感兴趣的方向：

📊 **我能帮您测评：**
• 专业核心能力评估
• 职业技能匹配度分析
• 能力短板与提升建议
• 个性化发展路径推荐

请提供信息，开始您的专业能力测评！`;
  }

  if (botType === 'competency' || msgLower.includes('胜任力')) {
    return `您好！我是胜任力评估助手（会员专属）。

请告诉我：

🎯 **目标岗位**和**个人背景**

📊 **我能帮您评估：**
• 岗位胜任力模型匹配
• 核心能力差距分析
• 可视化胜任力雷达图
• 针对性提升建议

请提供信息，开始胜任力评估！`;
  }

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
    // ============================================================
    // 安全检查：必须登录
    // ============================================================
    const accessToken = request.cookies.get('sb-access-token');
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: '请先登录' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { message, botType, conversationId } = await request.json();

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: '消息内容不能为空' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ============================================================
    // 安全检查：消息长度限制 2000 字
    // ============================================================
    const MAX_MESSAGE_LENGTH = 2000;
    if (message.length > MAX_MESSAGE_LENGTH) {
      return new Response(
        JSON.stringify({ error: `消息长度不能超过${MAX_MESSAGE_LENGTH}字` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. 用户验证，查 user_profiles 表获取 user_type
    const userInfo = await getUserInfoFromRequest(request);
    const userId = userInfo?.userId || null;
    const userType = userInfo?.userType || 'free';

    // 获取用户个人信息上下文
    let userContext = '';
    if (userId) {
      userContext = await getUserProfileContext(userId);
    }

    // 检查配额（非会员需要扣减）
    if (userId) {
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

    const fallbackText = getFallbackResponse(botType, message);

    // ===========================
    // DeepSeek + RAG 分支（当 DEEPSEEK_ENABLED=true 时优先使用）
    // ===========================
    if (USE_DEEPSEEK) {
      try {
        console.log(`[chat] Using DeepSeek + RAG for botType=${botType}`);
        
        // 提取关键词
        const keywords = extractKeywords(message);
        
        // 并行查询多个数据源
        const [jds, careerPaths, skills, resources] = await Promise.all([
          // 查询 JD
          querySupabase('job_descriptions', [
            keywords.industry ? { field: 'industry', operator: 'ilike', value: `%${keywords.industry}%` } : undefined,
            keywords.jobTitle ? { field: 'job_title', operator: 'ilike', value: `%${keywords.jobTitle}%` } : undefined,
          ].filter(Boolean) as any, 10, 'job_title,industry,responsibilities,hard_skills,soft_skills,salary_range,city'),
          
          // 查询职业路径
          querySupabase('career_paths', [
            keywords.industry ? { field: 'industry', operator: 'ilike', value: `%${keywords.industry}%` } : undefined,
          ].filter(Boolean) as any, 5, '*'),
          
          // 查询技能分类
          querySupabase('skill_taxonomy', [
            keywords.industry ? { field: 'domain', operator: 'ilike', value: `%${keywords.industry}%` } : undefined,
          ].filter(Boolean) as any, 10, 'skill_name,category,domain'),
          
          // 查询学习资源
          querySupabase('learning_resources', [
            keywords.industry ? { field: 'industry', operator: 'ilike', value: `%${keywords.industry}%` } : undefined,
          ].filter(Boolean) as any, 5, 'title,url,type'),
        ]);
        
        // 构建 RAG 上下文
        const ragContext = buildRAGContext([
          { tableName: 'job_descriptions', displayName: '岗位信息', data: jds },
          { tableName: 'career_paths', displayName: '职业路径', data: careerPaths },
          { tableName: 'skill_taxonomy', displayName: '技能分类', data: skills },
          { tableName: 'learning_resources', displayName: '学习资源', data: resources },
        ]);
        
        // 构建系统提示词（AI职业规划师"职伴"）
        const systemPrompt = `你是"职伴"——职途星平台的AI职业规划师。你精通27个行业的职业发展路径，能帮大学生制定清晰的4年职业规划。

你的能力：
1. 根据用户的兴趣、专业、年级，推荐适合的职业方向
2. 制定大一到大四的分阶段成长计划（每年核心目标、技能提升、证书考取）
3. 推荐相关的实习岗位和项目经验
4. 预估各阶段的薪资范围

回答规范：
- 基于检索到的真实岗位和职业路径数据回答
- 给出具体、可执行的建议，不要泛泛而谈
- 规划要符合大学四年的时间节奏
- 适当引用数据支撑你的建议

${ragContext}`;

        const history: { role: 'user' | 'assistant'; content: string }[] = [];
        const stream = createDeepSeekRAGStream(systemPrompt, message, history);
        return new Response(stream, { headers: SSE_HEADERS });
      } catch (error) {
        console.error('[chat] DeepSeek RAG error, falling back to Coze:', error);
        // 出错时回退到 Coze
      }
    }

    // ===========================
    // 优先尝试 stream_run API（扣子编程 Workflow 部署方式）
    // ===========================
    const workflowConfig = getWorkflowConfig(botType);

    if (workflowConfig) {
      console.log(`[chat] Using stream_run API for botType=${botType}`);
      try {
        const workflowResponse = await callWorkflowStreamApi({
          botType: botType || 'jobs',
          message,
          userContext,
        });

        if (workflowResponse.ok) {
          const stream = createWorkflowSSEStream({
            workflowResponse,
            userId,
            botType,
            fallbackText,
          });
          return new Response(stream, { headers: SSE_HEADERS });
        } else {
          console.log(`[chat] stream_run API returned ${workflowResponse.status}, falling back`);
          const errorBody = await workflowResponse.text();
          console.log(`[chat] stream_run error: ${errorBody.slice(0, 200)}`);
        }
      } catch (err) {
        console.error('[chat] stream_run API error:', err);
      }
    }

    // ===========================
    // 回退到标准 Coze Bot API
    // ===========================
    const botId = selectBotId(botType);
    const apiKey = process.env.COZE_API_TOKEN;

    if (!apiKey || !botId) {
      console.log('[chat] No standard Bot API configured, using fallback');
      return new Response(createTextStream(fallbackText), { headers: SSE_HEADERS });
    }

    console.log(`[chat] Using standard Bot API for botType=${botType}, botId=${botId}`);
    const cozeResponse = await callCozeStreamApi({
      botId,
      message,
      userType,
      conversationId,
      userContext,
    });

    if (!cozeResponse.ok) {
      console.log('[chat] Coze Bot API HTTP error:', cozeResponse.status);
      return new Response(createTextStream(fallbackText), { headers: SSE_HEADERS });
    }

    const contentType = cozeResponse.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const errorText = await cozeResponse.text();
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.code && errorData.code !== 0) {
          console.log('[chat] Coze Bot API error:', errorData.code, errorData.msg);
          return new Response(createTextStream(fallbackText), { headers: SSE_HEADERS });
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

    // 流式转发 + SSE 解析器
    const stream = createCozeSSEStream({
      cozeResponse,
      userId,
      botType,
      fallbackText,
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
