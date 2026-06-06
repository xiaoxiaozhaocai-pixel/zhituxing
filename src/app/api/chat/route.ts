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
import { parseAccessTokenFromCookie } from '@/lib/auth-cookies';
import { detectInjection, createBlockedSSE } from '@/lib/injection-detect';
import { jsonError, parseRequestBody, ErrorCode } from '@/lib/api-contracts/_shared';
import { ChatRequestSchema } from '@/lib/api-contracts/chat';
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
import { getSupabaseAdmin } from '@/lib/supabase';
import {
  compressConversation,
  needsCompression,
} from '@/lib/context-compression';

import { DISPATCH_CARDS, DISPATCH_API_MAP, RAG_TABLE_CONFIG, ROLE_REINFORCEMENTS, RAG_DISPLAY_NAMES } from './config';
import { SYSTEM_PROMPTS, EMPTY_INPUT_MESSAGES } from './prompts';
import { prepareChatContext } from './chat-context';
import { saveChatHistory } from './chat-history';


export const runtime = 'nodejs';

const USE_DEEPSEEK = process.env.DEEPSEEK_ENABLED === 'true';

// 智能体路由选择（标准Bot API用 — V2版本）
function selectBotId(botType?: string): string {
  if (botType === 'jobs') return process.env.COZE_BOT_JD_ASSISTANT || '';
  if (botType === 'interview') return process.env.COZE_BOT_INTERVIEW || '';
  if (botType === 'decision') return process.env.COZE_BOT_DECISION || '';
  if (botType === 'career') return process.env.COZE_BOT_CAREER_PLANNING || '';
  if (botType === 'assessment') return process.env.COZE_BOT_ASSESSMENT || process.env.COZE_BOT_CAPABILITY || '';
  if (botType === 'xiaozhi') return process.env.COZE_BOT_XIAOZHI || '';
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

    if (botType === 'xiaozhi' || msgLower.includes('小职')) {
    return `嗨～我是小职，你的AI求职伙伴！✨

我可以陪你聊天、帮你改简历、模拟面试、做职业规划、做能力诊断……

💬 有什么想聊的？或者直接告诉我你需要什么帮助～`;
  }

  return `👋 你好呀！我是小职，你的AI求职伙伴～

🔍 **我可以帮您查询：**

• **岗位信息**：直接输入岗位名称，如「Java开发」「产品经理」「新媒体运营」
• **按地点推荐**：告诉我城市，如「深圳」「上海」「北京」
• **按薪资推荐**：告诉我薪资范围，如「10k-15k」「5k-8k」
• **按背景匹配**：告诉我您的专业和学历，如「计算机专业，本科」
• **智能组合**：多个条件组合，如「深圳Java开发15k-20k」

📚 覆盖互联网/金融/制造/教育/医疗等15+主流行业

请告诉我您的需求！`;
}

/**
 * 代理转发到专业智能体 API，注入 dispatch + conversation_id 事件
 * 同时收集 fullResponse 用于聊天历史存储
 */
async function proxySpecializedApiStream(
  apiPath: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: Record<string, any>,
  request: NextRequest,
  effectiveConversationId: string,
  resolvedBotType: string,
): Promise<{ stream: ReadableStream; fullResponse: string }> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  // 构建内部 API URL
  const url = new URL(apiPath, request.url);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const cookie = request.headers.get('cookie');
  if (cookie) headers['Cookie'] = cookie;
  
  console.log(`[chat] Forwarding to specialized API: ${url.toString()}`);
  
  const apiResponse = await fetch(url.toString(), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  
  if (!apiResponse.ok || !apiResponse.body) {
    throw new Error(`Specialized API ${apiPath} returned ${apiResponse.status}`);
  }
  
  let fullResponse = '';
  const reader = apiResponse.body.getReader();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            // 过滤专业 API 自己的结束标记 {type:'done'} 和 [DONE]
            if (line.includes('[DONE]') || line.includes('"type":"done"')) continue;
            
            // 收集 fullResponse
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                const content = data?.content || data?.choices?.[0]?.delta?.content;
                if (content) fullResponse += content;
              } catch { /* non-JSON SSE data */ }
            }
            
            if (line.trim()) {
              controller.enqueue(encoder.encode(line + '\n'));
            }
          }
        }
        
        // 流结束 — 注入 conversation_id
        const convEvent = `event: conversation_id\ndata: ${JSON.stringify({ conversation_id: effectiveConversationId })}\n\n`;
        controller.enqueue(encoder.encode(convEvent));
        
        // 注入 dispatch 事件
        const card = DISPATCH_CARDS[resolvedBotType];
        if (card) {
          const dispatchEvent = `event: dispatch\ndata: ${JSON.stringify({
            intent: resolvedBotType,
            ...card,
          })}\n\n`;
          controller.enqueue(encoder.encode(dispatchEvent));
          console.log(`[xiaozhi] Dispatch event sent (deep): intent=${resolvedBotType}`);
        }
        
        // [DONE]
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err) {
        console.error('[chat] Proxy stream error:', err);
        controller.error(err);
      }
    }
  });
  
  return { stream, fullResponse };
}

// SSE 流式响应头
const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
};


/**
 * 获取上游智能体产物并构建上下文
 * 实现跨智能体数据透传：下游自动消费上游结果
 */
async function getUpstreamArtifacts(userId: string, botType: string): Promise<string | null> {
  try {
    const supabase = getSupabaseAdmin();
    const parts: string[] = [];

    // ================================================================
    // 全智能体调用链：每条链 = 当前 botType ← 上游产物
    // ================================================================

    if (botType === 'interview') {
      // 模拟面试 ← 简历优化 + JD分析
      const { data: resumes } = await supabase
        .from('resume_optimizations')
        .select('result_data, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (resumes && resumes.length > 0 && resumes[0]!.result_data) {
        const resume = resumes[0]!.result_data;
        const resumeSummary = typeof resume === 'string' 
          ? resume 
          : JSON.stringify(resume).slice(0, 1500);
        parts.push(`【上游简历优化结果】\n${resumeSummary}`);
      }

      const { data: jdMatches } = await supabase
        .from('skill_job_match')
        .select('match_data, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (jdMatches && jdMatches.length > 0 && jdMatches[0]!.match_data) {
        const match = jdMatches[0]!.match_data;
        const matchSummary = typeof match === 'string'
          ? match
          : JSON.stringify(match).slice(0, 1000);
        parts.push(`【上游JD分析结果】\n${matchSummary}`);
      }

    } else if (botType === 'career') {
      // 职业规划 ← 能力测评 + 技能画像
      const { data: assessments } = await supabase
        .from('assessment_results')
        .select('result_data, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (assessments && assessments.length > 0 && assessments[0]!.result_data) {
        const ass = assessments[0]!.result_data;
        const assSummary = typeof ass === 'string'
          ? ass
          : JSON.stringify(ass).slice(0, 1000);
        parts.push(`【上游能力测评结果】\n${assSummary}`);
      }

      // 职业规划 ← 技能画像（已有技能清单）
      const { data: portraits } = await supabase
        .from('skill_portraits')
        .select('portrait_data, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (portraits && portraits.length > 0 && portraits[0]!.portrait_data) {
        const p = portraits[0]!.portrait_data;
        const pSummary = typeof p === 'string'
          ? p
          : JSON.stringify(p).slice(0, 1000);
        parts.push(`【上游技能画像结果】\n${pSummary}`);
      }

    } else if (botType === 'assessment') {
      // 能力测评 ← 技能画像（差距清单：知道缺什么才能精准出题）
      const { data: portraits } = await supabase
        .from('skill_portraits')
        .select('portrait_data, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (portraits && portraits.length > 0 && portraits[0]!.portrait_data) {
        const p = portraits[0]!.portrait_data;
        const pSummary = typeof p === 'string'
          ? p
          : JSON.stringify(p).slice(0, 1000);
        parts.push(`【上游技能画像结果（差距清单）】\n${pSummary}`);
      }

    } else if (botType === 'decision') {
      // 考研就业决策 ← 能力测评 + 能力诊断 + 职业规划
      const { data: assessments } = await supabase
        .from('assessment_results')
        .select('result_data, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (assessments && assessments.length > 0 && assessments[0]!.result_data) {
        const ass = assessments[0]!.result_data;
        const assSummary = typeof ass === 'string'
          ? ass
          : JSON.stringify(ass).slice(0, 1000);
        parts.push(`【上游能力测评结果】\n${assSummary}`);
      }

      const { data: competencies } = await supabase
        .from('competency_results')
        .select('result_data, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (competencies && competencies.length > 0 && competencies[0]!.result_data) {
        const comp = competencies[0]!.result_data;
        const compSummary = typeof comp === 'string'
          ? comp
          : JSON.stringify(comp).slice(0, 1000);
        parts.push(`【上游胜任力评估结果】\n${compSummary}`);
      }

      const { data: plans } = await supabase
        .from('career_plans')
        .select('plan_data, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (plans && plans.length > 0 && plans[0]!.plan_data) {
        const plan = plans[0]!.plan_data;
        const planSummary = typeof plan === 'string'
          ? plan
          : JSON.stringify(plan).slice(0, 1000);
        parts.push(`【上游职业规划结果】\n${planSummary}`);
      }

    } else if (botType === 'resume') {
      // 简历优化 ← JD分析结果 + 技能画像
      const { data: jdMatches } = await supabase
        .from('skill_job_match')
        .select('match_data, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (jdMatches && jdMatches.length > 0 && jdMatches[0]!.match_data) {
        const match = jdMatches[0]!.match_data;
        const matchSummary = typeof match === 'string'
          ? match
          : JSON.stringify(match).slice(0, 1000);
        parts.push(`【上游JD分析结果】\n${matchSummary}`);
      }

      const { data: portraits } = await supabase
        .from('skill_portraits')
        .select('portrait_data, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (portraits && portraits.length > 0 && portraits[0]!.portrait_data) {
        const p = portraits[0]!.portrait_data;
        const pSummary = typeof p === 'string'
          ? p
          : JSON.stringify(p).slice(0, 1000);
        parts.push(`【上游技能画像结果】\n${pSummary}`);
      }

    } else if (botType === 'skill_portrait') {
      // 技能画像 ← 无需上游产物，仅依赖个人信息（已在getUserProfileContext注入）
      // 但可以标注已有测评数据供参考
      const { data: assessments } = await supabase
        .from('assessment_results')
        .select('result_data, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (assessments && assessments.length > 0 && assessments[0]!.result_data) {
        const ass = assessments[0]!.result_data;
        const assSummary = typeof ass === 'string'
          ? ass
          : JSON.stringify(ass).slice(0, 800);
        parts.push(`【已有能力测评结果参考】\n${assSummary}`);
      }
    }

    if (parts.length === 0) return null;
    return `\n【上游智能体产物（自动注入）】\n${parts.join('\n\n')}\n---\n`;
  } catch (error) {
    console.error('获取上游智能体产物失败:', error);
    return null;
  }
}


export async function POST(request: NextRequest) {
  try {
    // ============================================================
    // 安全检查：必须登录
    // ============================================================
    // 使用统一的认证函数，不再信任 x-user-id header
    // 漏洞修复：之前允许 x-user-id 绕过登录检查是严重的安全漏洞
    const accessToken = parseAccessTokenFromCookie(request.headers) || request.cookies.get('sb-access-token')?.value || null;
    
    if (!accessToken) {
      return jsonError(ErrorCode.UNAUTHORIZED, '请先登录');
    }

    // 契约化：用 zod 校验请求体
    const parsed = await parseRequestBody(request, ChatRequestSchema);
    if (!parsed.ok) return parsed.response;
    const { message, botType } = parsed.data;
    // conversationId 允许 null（前端会显式传 null），统一收敛成 undefined
    const conversationId = parsed.data.conversationId ?? undefined;

    // botType 标准化（空输入校验需要用到）
    // xiaozhi的空输入使用xiaozhi_chat模式的提示
    const effectiveBotType = botType || 'career';

    // ============================================================
    // 安全检查：空消息校验 - 返回 SSE 格式友好提示（按 botType 定制）
    // ============================================================
    if (!message || !message.trim()) {
      const emptyContent = EMPTY_INPUT_MESSAGES[effectiveBotType] || '请输入您的问题，我会为您解答。';
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          const emptyMsg = JSON.stringify({
            id: 'empty-check',
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model: 'safety-filter',
            choices: [{ index: 0, delta: { content: emptyContent }, finish_reason: 'stop' }],
          });
          controller.enqueue(encoder.encode('data: ' + emptyMsg + '\n\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });
      return new Response(stream, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
      });
    }

    // ============================================================
    // 安全检查：消息长度限制 2000 字 - 返回 SSE 格式
    // ============================================================
    const MAX_MESSAGE_LENGTH = 2000;
    if (message.length > MAX_MESSAGE_LENGTH) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          const lengthMsg = JSON.stringify({
            id: 'length-check',
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model: 'safety-filter',
            choices: [{ index: 0, delta: { content: `消息长度不能超过${MAX_MESSAGE_LENGTH}字，当前${message.length}字。请精简后重试。` }, finish_reason: 'stop' }],
          });
          controller.enqueue(encoder.encode('data: ' + lengthMsg + '\n\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });
      return new Response(stream, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
      });
    }

    // ============================================================
    // 安全检查：Prompt注入检测
    // ============================================================
    const injectionCheck = detectInjection(message, botType);
    if (injectionCheck.blocked) {
      console.log('[chat] Injection detected, blocking message:', injectionCheck.reason);
      return new Response(createBlockedSSE(injectionCheck.reason || '消息被安全拦截'), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // 1. 用户验证，查 user_profiles 表获取 user_type
    const userInfo = await getUserInfoFromRequest(request);
    
    // userInfo 现在通过 getUserInfoFromRequest（已修复为验证 token）获取
    // 如果 userInfo 为 null 但有 accessToken，说明用户已登录但查不到信息，允许继续
    const userId = userInfo?.userId || null;
    const userType = userInfo?.userType || 'free';
    
    if (!userInfo && accessToken) {
      console.log('[chat] User info not found but token exists, treating as free user');
    }

    // 获取用户个人信息上下文
    let userContext = '';
    if (userId) {
      userContext = await getUserProfileContext(userId);
      
      // ============================================================
      // 智能体调用链：下游自动消费上游产物
      // 根据当前 botType，自动查询相关的上游智能体产物并注入上下文
      // ============================================================
      const upstreamArtifacts = await getUpstreamArtifacts(userId, effectiveBotType);
      if (upstreamArtifacts) {
        userContext += '\n\n' + upstreamArtifacts;
      }
    }

    // 检查配额（仅当 userId 存在时）
    if (userId) {
      const feature = botType === 'interview' ? 'interview' :
                      botType === 'assessment' ? 'assessment' : 'career_planning';
      const access = await checkFeatureAccess(userId, feature);
      if (!access.allowed) {
        return jsonError(ErrorCode.QUOTA_EXCEEDED, access.reason || '配额已用完');
      }
    }

    const fallbackText = getFallbackResponse(botType, message);

    // ===========================
    // DeepSeek + RAG 分支（当 DEEPSEEK_ENABLED=true 时优先使用）
    // ===========================
    console.log(`[chat] USE_DEEPSEEK=${USE_DEEPSEEK}, botType=${botType}, userId=${userId}`);

    // ============================================================
    // 小职智能体调度链（botType=xiaozhi 时启用）
    // ============================================================
    let resolvedBotType = effectiveBotType;
    let useVoiceWrapper = false;

    if (effectiveBotType === 'xiaozhi') {
      const lowerMsg = (message || '').toLowerCase();
      
      // 意图分类（关键词匹配，无额外API开销）
      const INTENT_KEYWORDS: [string, string[]][] = [
        ['interview', ['面试', '模拟面试', '面经', '面试官', '面试技巧', '自我介绍', 'hr面', '业务面', '群面', '无领导小组']],
        ['decision', ['考研', '考研vs就业', '纠结', '犹豫', '选择', '考研还是', '读研', '考公', '考编', '要不要']],
        ['career', ['规划', '职业规划', '方向', '前景', '迷茫', '适合', '发展', '路径', '成长', '晋升']],
        ['assessment', ['测评', '评估', '测试', '水平', '能力', '做题', '题目', '考核', '测一下', '水平测试']],
        ['career', ['胜任力', '差距', '匹配度', '雷达图', '胜任', '匹配', '适不适合', '够不够']],
        ['jobs', ['岗位', '招聘', '职位', '求职', '找工作', '薪资', '工资', 'JD', '人资', 'hr', '深圳', '北京', '上海', '广州', '杭州', '投递', '校招', '秋招', '春招']],
      ];
      
      // 统计每个意图的命中关键词数
      let intentScores: [string, number][] = INTENT_KEYWORDS.map(([intent, keywords]) => {
        const score = keywords.filter(kw => lowerMsg.includes(kw)).length;
        return [intent, score] as [string, number];
      });
      
      // 归一化：如果是简短消息（<10字），降低jobs的权重（避免"岗位""薪资"等短词误触发）
      if (message.length < 10) {
        intentScores = intentScores.map(([intent, score]) => 
          intent === 'jobs' ? [intent, Math.max(0, score - 1)] as [string, number] : [intent, score] as [string, number]
        );
      }
      
      // 按分数排序
      intentScores.sort((a, b) => b[1] - a[1]);
      
      const topIntent = intentScores[0];
      
      if (topIntent && topIntent[1] >= 1) {
        // 命中专业意图 → dispatch
        resolvedBotType = topIntent[0];
        useVoiceWrapper = true;
        console.log(`[xiaozhi] Dispatch detected: ${topIntent[0]} (score=${topIntent[1]})`);
      } else {
        // 没命中 → 小职聊天模式
        resolvedBotType = 'xiaozhi_chat';
        console.log(`[xiaozhi] No dispatch needed, using chat mode`);
      }
    }

    // ============================================================
    // 深度调度：命中专业意图且有独立SSE API时，转发到专业智能体
    // 被代理的 API 自己处理 RAG + Specialized Prompt，不再走下方 DeepSeek 通用路径
    // ============================================================
    if (effectiveBotType === 'xiaozhi' && useVoiceWrapper && DISPATCH_API_MAP[resolvedBotType]) {
      const deepConvId = conversationId || `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      const apiPath = DISPATCH_API_MAP[resolvedBotType];
      
      console.log(`[chat] Deep dispatch: intent=${resolvedBotType} → ${apiPath}`);
      
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const apiBody: Record<string, any> = { message, conversationId: deepConvId };
        const { stream: proxiedStream, fullResponse } = await proxySpecializedApiStream(
          apiPath!, apiBody, request, deepConvId, resolvedBotType,
        );
        
        // 异步保存聊天历史（不阻塞首字节）
        if (fullResponse && userId) {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          const esc = (s: string) => (s || '').replace(/'/g, "''");
          const insertSql = `
            INSERT INTO public.chat_history (conversation_id, user_id, role, content, bot_type) VALUES
            ('${esc(deepConvId)}', '${esc(userId)}', 'user', '${esc(message)}', '${esc(effectiveBotType)}'),
            ('${esc(deepConvId)}', '${esc(userId)}', 'assistant', '${esc(fullResponse)}', '${esc(effectiveBotType)}');
          `;
          fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
            method: 'POST',
            headers: { 'apikey': supabaseKey || '', 'Authorization': `Bearer ${supabaseKey || ''}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql: insertSql }),
          }).catch(e => console.error('[chat] Deep dispatch history save error:', e));
        }
        
        return new Response(proxiedStream, { headers: SSE_HEADERS });
      } catch (err) {
        console.error('[chat] Deep dispatch failed, falling back to prompt-based:', err);
        // 回退到下方通用 DeepSeek + RAG 路径
        useVoiceWrapper = false;
        resolvedBotType = 'xiaozhi_chat';
      }
    }

    if (USE_DEEPSEEK) {
      try {
        console.log(`[chat] Entering DeepSeek + RAG branch for botType=${effectiveBotType}, resolved=${resolvedBotType}`);
        
        // 提取关键词
        const keywords = extractKeywords(message);
        
        // 获取当前 botType 允许查询的表（xiaozhi使用resolvedBotType）
        const actualBotType = (effectiveBotType === 'xiaozhi') ? resolvedBotType : effectiveBotType;
        const allowedTables = RAG_TABLE_CONFIG[actualBotType] || RAG_TABLE_CONFIG.career;
        const displayNames = RAG_DISPLAY_NAMES[actualBotType] || RAG_DISPLAY_NAMES.career;
        
        // 按配置查询数据（只查询允许的表）
        const [jds, careerPaths, skills, resources, guetKnowledge = []] = await Promise.all([
          allowedTables!.includes('job_descriptions')
            ? querySupabase('job_descriptions', [
                keywords.industry ? { field: 'industry', operator: 'ilike', value: `%${keywords.industry}%` } : undefined,
                keywords.jobTitle ? { field: 'job_title', operator: 'ilike', value: `%${keywords.jobTitle}%` } : undefined,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ].filter(Boolean) as any, 10, 'job_title,industry,responsibilities,hard_skills,soft_skills,salary_range,city')
            : [],
          
          allowedTables!.includes('career_paths')
            ? querySupabase('career_paths', [
                keywords.industry ? { field: 'industry', operator: 'ilike', value: `%${keywords.industry}%` } : undefined,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ].filter(Boolean) as any, 5, '*')
            : [],
          
          allowedTables!.includes('skill_taxonomy')
            ? querySupabase('skill_taxonomy', [
                keywords.industry ? { field: 'domain', operator: 'ilike', value: `%${keywords.industry}%` } : undefined,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ].filter(Boolean) as any, 10, 'skill_name,category,domain')
            : [],
          
          allowedTables!.includes('learning_resources')
            ? querySupabase('learning_resources', [
                keywords.industry ? { field: 'industry', operator: 'ilike', value: `%${keywords.industry}%` } : undefined,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ].filter(Boolean) as any, 5, 'title,url,type')
            : [],
          
          allowedTables!.includes('guet_knowledge')
            ? querySupabase('guet_knowledge', [], 20, '*')
            : [],
        ]);
        
        // 构建 RAG 上下文（只包含有数据的表，使用 botType 定制的标签）
        const ragSources: { tableName: string; displayName: string; data: Record<string, unknown>[] }[] = [];
        if (allowedTables!.includes('job_descriptions') && jds.length > 0) {
          ragSources.push({ tableName: 'job_descriptions', displayName: displayNames!['job_descriptions'] || '岗位信息', data: jds });
        }
        if (allowedTables!.includes('career_paths') && careerPaths.length > 0) {
          ragSources.push({ tableName: 'career_paths', displayName: displayNames!['career_paths'] || '职业路径', data: careerPaths });
        }
        if (allowedTables!.includes('skill_taxonomy') && skills.length > 0) {
          ragSources.push({ tableName: 'skill_taxonomy', displayName: displayNames!['skill_taxonomy'] || '技能分类', data: skills });
        }
        if (allowedTables!.includes('learning_resources') && resources.length > 0) {
          ragSources.push({ tableName: 'learning_resources', displayName: displayNames!['learning_resources'] || '学习资源', data: resources });
        }
        if (allowedTables!.includes('guet_knowledge') && guetKnowledge.length > 0) {
          ragSources.push({ tableName: 'guet_knowledge', displayName: displayNames!['guet_knowledge'] || '桂电知识', data: guetKnowledge });
        }
        
        const ragContext = buildRAGContext(ragSources);

        // RAG 失败降级：无数据时告知 LLM 坦诚说明
        const ragDegradationNote = ragSources.length === 0
          ? '\n\n【RAG状态】本次未检索到相关数据。请坦诚告知用户你掌握的信息有限，基于通用知识回答，不要编造具体数据。'
          : '';

        // 三明治结构：systemPrompt = 顶部(SYSTEM_PROMPTS) + 中间(RAG数据) + 底部(角色重申)
        const roleReinforcement = ROLE_REINFORCEMENTS[actualBotType] || '';
        
        // 小职调度：如果命中专业意图，用voice wrapper包装专业prompt；否则直接用chat prompt
        let basePrompt: string;
        if (effectiveBotType === 'xiaozhi' && useVoiceWrapper) {
          basePrompt = SYSTEM_PROMPTS.xiaozhi_wrapper! + (SYSTEM_PROMPTS[actualBotType]! || SYSTEM_PROMPTS.career!);
        } else {
          basePrompt = SYSTEM_PROMPTS[actualBotType] || SYSTEM_PROMPTS.career!;
        }
        
        // ============================================================
        // 三层混合上下文压缩 + AI 缓存查询（提取至 chat-context.ts）
        // ============================================================
        const {
          systemPrompt,
          history,
          effectiveConversationId,
          cachedResponse: _cachedResponse,
          cacheKey,
          isCacheable,
        } = await prepareChatContext({
          basePrompt,
          ragContext,
          ragDegradationNote,
          roleReinforcement,
          conversationId,
          userId: userId || '',
          message,
        });
        const cachedResponse = _cachedResponse;
        
        const encoder = new TextEncoder();
        if (cachedResponse) {
          const segs = cachedResponse.match(/[^。！？\n]+[。！？\n]?/g) || [cachedResponse];
          const cachedStream = new ReadableStream({
            async start(controller) {
              for (const seg of segs) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: seg })}\n\n`));
              }
              controller.enqueue(encoder.encode(`event: conversation_id\ndata: ${JSON.stringify({ conversation_id: effectiveConversationId })}\n\n`));
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            }
          });
          if (userId) {
            saveChatHistory(
              { userId, conversationId: effectiveConversationId, userMessage: message, assistantResponse: cachedResponse, botType: effectiveBotType || '' },
            ).catch(e => console.error('[chat] Cache history save error:', e));
          }
          return new Response(cachedStream, { headers: SSE_HEADERS });
        }

        // 创建带超时保护的 DeepSeek RAG 流（45s 超时 + 客户端断开检测）
        const timeoutController = new AbortController();
        const timeoutId = setTimeout(() => {
          console.log('[chat] DeepSeek RAG stream timeout (45s)');
          timeoutController.abort();
        }, 45000);
        // 客户端断开时取消请求
        if (request.signal) {
          request.signal.addEventListener('abort', () => {
            console.log('[chat] Client disconnected, aborting DeepSeek stream');
            timeoutController.abort();
          }, { once: true });
        }
        const baseStream = createDeepSeekRAGStream(systemPrompt, message, history, timeoutController.signal);
        
        const wrappedStream = new ReadableStream({
          async start(controller) {
            const reader = baseStream.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';
            
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                
                // 过滤掉 DeepSeek 流中的 [DONE]，我们在最后统一发送
                const lines = chunk.split('\n');
                let filteredChunk = '';
                for (const line of lines) {
                  if (line.includes('[DONE]')) {
                    // 跳过 DeepSeek 的 [DONE]，我们会在流结束后统一发送
                    continue;
                  }
                  filteredChunk += line + '\n';
                  
                  // 收集助手响应内容（兼容两种格式：DeepSeek的type/content 和 OpenAI的choices/delta/content）
                  if (line.startsWith('data: ')) {
                    try {
                      const data = JSON.parse(line.slice(6));
                      // DeepSeek RAG格式: {"type":"text","content":"..."}
                      // OpenAI格式: {"choices":[{"delta":{"content":"..."}}]}
                      const content = data?.content || data?.choices?.[0]?.delta?.content;
                      if (content) fullResponse += content;
                    } catch { /* ignore */ }
                  }
                }
                
                if (filteredChunk.trim()) {
                  controller.enqueue(encoder.encode(filteredChunk));
                }
              }
              
              // 发送 conversationId 事件（在 [DONE] 之前）
              const convEvent = `event: conversation_id\ndata: ${JSON.stringify({ conversation_id: effectiveConversationId })}\n\n`;
              controller.enqueue(encoder.encode(convEvent));
              
              // ============================================================
              // 小职调度：推送 dispatch 事件给前端展示 action card
              // ============================================================
              if (effectiveBotType === 'xiaozhi' && useVoiceWrapper) {
                const card = DISPATCH_CARDS[resolvedBotType];
                if (card) {
                  const dispatchEvent = `event: dispatch\ndata: ${JSON.stringify({
                    intent: resolvedBotType,
                    ...card,
                  })}\n\n`;
                  controller.enqueue(encoder.encode(dispatchEvent));
                  console.log(`[xiaozhi] Dispatch event sent: intent=${resolvedBotType}`);
                }
              }
              
              // 发送 [DONE]
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              
              // 保存对话历史 + 写入缓存 + 触发压缩（提取至 chat-history.ts）
              const { saveResult } = await saveChatHistory(
                { userId: userId || '', conversationId: effectiveConversationId, userMessage: message, assistantResponse: fullResponse, botType: effectiveBotType || '' },
                isCacheable && fullResponse ? cacheKey : undefined,
                fullResponse && userId ? {
                  conversationId: effectiveConversationId,
                  userId,
                  needsCheck: () => needsCompression(effectiveConversationId),
                  runCompression: (convId, uid) => compressConversation(convId, uid),
                } : undefined,
              );

              // 发送保存结果事件
              const saveEvent = `event: save_result\ndata: ${JSON.stringify({ result: saveResult, convId: effectiveConversationId })}\n\n`;
              controller.enqueue(encoder.encode(saveEvent));
            } catch (err) {
              console.error('[chat] Stream wrapper error:', err);
              // 超时时发送友好降级消息
              if (err instanceof Error && err.name === 'AbortError') {
                try {
                  const degradeMsg = JSON.stringify({
                    id: 'timeout-fallback',
                    object: 'chat.completion.chunk',
                    created: Math.floor(Date.now() / 1000),
                    model: 'fallback',
                    choices: [{ index: 0, delta: { content: '\n\n抱歉，响应超时了。可能是当前访问量较大，请稍后重试或简化一下问题～' }, finish_reason: 'stop' }],
                  });
                  controller.enqueue(encoder.encode('data: ' + degradeMsg + '\n\n'));
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                } catch (__e) { /* best effort */ }
              }
            } finally {
              clearTimeout(timeoutId);
              controller.close();
              reader.releaseLock();
            }
          }
        });
        
        return new Response(wrappedStream, { headers: SSE_HEADERS });
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
