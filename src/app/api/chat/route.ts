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
import { MEMBERSHIP_MONTHLY_PRICE } from '@/lib/config';
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

import { DISPATCH_CARDS, RAG_TABLE_CONFIG, ROLE_REINFORCEMENTS, RAG_DISPLAY_NAMES } from './config';
import { SYSTEM_PROMPTS, EMPTY_INPUT_MESSAGES, SAFETY_RULES } from './prompts';
import { prepareChatContext } from './chat-context';
import { saveChatHistory } from './chat-history';
import { runGuetFlywheel } from './guet-flywheel';
import { runProfileFlywheel } from './profile-flywheel';
import { matchJobs, type MatchResult } from '@/lib/matching-service';
import { handleCareerPathsQuery, handleNarrativeChatQuery, handleTruthChatQuery, handleInterviewRadarChatQuery, handleSubtextChatQuery, handleCapabilityChatQuery, handleCognitiveChatQuery } from '@/lib/career-paths/chat-adapter';
import { analyzeNarrative } from '@/lib/career-paths/engine/narrative';
import { walkTruthfulness } from '@/lib/career-paths/engine/truthfulness';
import { resolvePersona, personaFallbackReply, personaPromptFragment, type PersonaProfile } from '@/lib/career-paths/engine/persona';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ============================================================
// 表达链判断力 · chat 格式化（A3 能力翻译 / A4 真实性红线）
// 与简历编辑器共用引擎，把结构化 report 转成小职对话式文本。
// ============================================================
function formatNarrativeForChat(report: ReturnType<typeof analyzeNarrative>): string {
  const lines: string[] = [];
  if (report.summary) lines.push(report.summary);
  if (report.emphasis && report.emphasis.value >= 0) {
    lines.push(`\n🎯 叙事价值：${report.emphasis.value}/100 · ${report.emphasis.placement}`);
    if (report.emphasis.focus) lines.push(report.emphasis.focus);
  }
  const layers = report.layers || [];
  if (layers.length > 0) {
    lines.push('\n📊 能力分层（权重 = 岗位看重度）：');
    for (const l of layers) {
      let line = `  • ${l.label}（权重 ${l.weight}%）：${l.score}/100`;
      if (l.signals && l.signals.length > 0) line += ` · 命中 ${l.signals.join('、')}`;
      lines.push(line);
      if (l.gap) lines.push(`    ⚠️ ${l.gap}`);
    }
  }
  for (const t of report.translations || []) {
    lines.push('\n✍️ 翻译建议：');
    lines.push(`「${t.translated}」`);
    if (t.rationale) lines.push(`  · ${t.rationale}`);
  }
  return lines.join('\n');
}

function formatTruthForChat(report: ReturnType<typeof walkTruthfulness>): string {
  const lines: string[] = [];
  if (report.summary) lines.push(report.summary);
  if (report.verdict !== 'verifiable') {
    lines.push('\n🔍 逐条检查：');
    for (const r of report.risks || []) {
      const icon = r.level === 'high' ? '🔴' : r.level === 'medium' ? '🟡' : '🟢';
      lines.push(`${icon} ${r.why}（原文：「${r.snippet}」）`);
      if (r.fix) lines.push(`   ➜ 建议：${r.fix}`);
    }
  }
  return lines.join('\n');
}



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
    return `嗨～我是小职，你的AI朋友！✨

我可以陪你聊天、帮你改简历、模拟面试、做职业规划、做能力诊断……

💬 有什么想聊的？或者直接告诉我你需要什么帮助～`;
  }

  return `👋 你好呀！我是小职，你的AI朋友～

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
    const authBearer = request.headers.get('authorization')?.startsWith('Bearer ')
      ? request.headers.get('authorization')!.slice(7)
      : null;
    const accessToken = authBearer
      || parseAccessTokenFromCookie(request.headers)
      || request.cookies.get('sb-access-token')?.value
      || null;
    
    if (!accessToken) {
      return jsonError(ErrorCode.UNAUTHORIZED, '请先登录');
    }

    // 契约化：用 zod 校验请求体
    const parsed = await parseRequestBody(request, ChatRequestSchema);
    if (!parsed.ok) return parsed.response;
    const { message, botType } = parsed.data;
    // C 人格兜底层：解析前端携带的人格配置
    const persona: PersonaProfile | null = parsed.data.persona
      ? resolvePersona(parsed.data.persona)
      : null;
    // conversationId 允许 null（前端会显式传 null），统一收敛成 undefined
    const conversationId = parsed.data.conversationId ?? undefined;

    // botType 标准化（空输入校验需要用到）
    // xiaozhi的空输入使用xiaozhi_chat模式的提示
    const effectiveBotType = botType || 'xiaozhi';

    // ============================================================
    // 安全检查：空消息校验 - 返回 SSE 格式友好提示（按 botType 定制）
    // ============================================================
    if (!message || !message.trim()) {
      // 空输入：优先用小职人格有温度地接住，避免冷冰冰模板；非 xiaozhi 仍用原语义提示
      const emptyContent = (persona && effectiveBotType === 'xiaozhi')
        ? personaFallbackReply(persona, 'empty')
        : (EMPTY_INPUT_MESSAGES[effectiveBotType] || '请输入您的问题，我会为您解答。');
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

    // ============================================================
    // 获取用户个人信息上下文 + 上游智能体产物（仅首次消息注入，避免重复）
    // 首次消息判断：无 conversationId 即新会话
    // ============================================================
    let userContext = '';
    if (userId && !conversationId) {
      const profileCtx = await getUserProfileContext(userId);
      
      // 上游智能体调用链
      const upstreamArtifacts = await getUpstreamArtifacts(userId, effectiveBotType);
      
      const contextParts: string[] = [];
      if (profileCtx) contextParts.push(profileCtx);
      if (upstreamArtifacts) contextParts.push(upstreamArtifacts);
      

      if (contextParts.length > 0) {
        userContext = `【系统指令：以下是你需要了解的背景信息，请务必基于这些信息回答用户问题，不要重复询问用户已知的个人信息和前置分析结论】\n\n${contextParts.join('\n')}\n\n---\n`;
      }
    } else if (userId && conversationId) {
      // 后续消息：不重复注入用户画像和上游产物，减少 token 消耗和干扰
      console.log('[chat] 已有 conversationId，跳过上下文注入');
    }

    // 检查配额（仅当 userId 存在时）—— 会员v2：不足时展示付费引导，不直接拒绝
    if (userId) {
      const feature = botType === 'interview' ? 'interview' :
                      botType === 'assessment' ? 'assessment' : 'career_planning';
      const access = await checkFeatureAccess(userId, feature);
      if (!access.allowed) {
        const { PAYMENT_GUIDES } = await import('@/lib/payment-prompt');
        const guide = PAYMENT_GUIDES[feature];
        const quotaText = access.remaining !== undefined && access.remaining >= 0
          ? `（剩余 ${access.remaining} 次）`
          : '';
        const guideText = guide?.paywall
          ? guide.paywall + '\n\n' + quotaText
          : (access.reason || `此功能需开通会员使用，¥${MEMBERSHIP_MONTHLY_PRICE}/月`);
        return new Response(createTextStream(guideText), { headers: SSE_HEADERS });
      }
    }

    const baseFallbackText = getFallbackResponse(botType, message);
    // C 人格兜底层：链路失败/无数据时，用人格化小职兜底话术替代冷模板，保证有温度
    const fallbackText = persona
      ? personaFallbackReply(persona, 'fail', message)
      : baseFallbackText;

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
        ['career', ['规划', '职业规划', '前景', '前途', '有没有前途', '入行', '还能入行', '迷茫', '发展', '成长', '晋升']],
        ['career_paths', ['求职方向', '适合什么', '适合哪条路', '职业匹配', '路径匹配', '推荐方向', '帮我看看适合', '看我适合', '能做什么工作', '找什么工作', '什么方向', '什么岗位适合我', '专业匹配', 'HR专业', '人力专业', '计算机专业', '电子信息专业', '适合做什么', '职业方向']],
        ['assessment', ['测评', '评估', '测试', '水平', '能力', '做题', '题目', '考核', '测一下', '水平测试', '职业倾向', '测测']],
        ['job_match', ['匹配岗位', '推荐岗位', '帮我匹配', '岗位推荐', '内推', '适合我的岗位', '找适合的岗位', '匹配一下岗位', '适合我的工作']],
        ['competency', ['胜任力', '差距', '匹配度', '雷达图', '胜任', '匹配', '适不适合', '够不够']],
        ['jobs', ['岗位', '职位', '求职', '找工作', '薪资', '工资', 'JD', '深圳', '北京', '上海', '广州', '杭州', '投递', '校招', '秋招', '春招', '内推']],
        ['narrative_check', ['翻译这段经历', '把经历写成', '能力翻译', '这段经历怎么说', '帮我包装', '包装这段经历', '表述这段经历', '体现什么能力', '这段经历价值', '翻译经历', '怎么把这段经历', '写成企业', '这段经历能体现', '怎么描述经历', '经历怎么写', '写成简历', '这段经历怎么描述', '怎么描述这段经历', '翻译一下这段经历', '润色', '润色简历', '润色经历', '润色这段', '帮我润色']],
        ['truth_check', ['真实吗', '会翻车', '背调', '吹牛', '夸大', '虚构', '编造', '真实发生', '这样写行不行', '会不会被问', '经得起', '能背调', '不真实', '有没有夸大', '真实吗这段', '这段真实', '编的', '一看就是编']],
        ['interview_radar', ['面试会问什么', '会被问什么', '会问什么', '面试重点', '考场什么', '会考什么', '考察什么', '考察重点', '重点考察', '面试雷达', '行业面试', '行业会考', '面试怎么准备', '面试方向', '面试问题', '面试会重点', '岗位面试', '岗的面试', '岗位的面试', '岗位会问', '面试会考', '岗位考察', '职位面试', '会怎么考', '怎么考', '怎么面', '岗位怎么考', '怎么考察', '考察重点是什么', '面试考察', '考察内容', '面试考什么', '面试会怎么考', '考察方向', '会重点面', '岗位会考什么', '面试会重点考什么']],
        ['subtext_detect', ['潜台词', '黑话', '话里有话', '言外之意', '话外音', '背后意思', '翻译成人话', '真实意思', '意思是什么', '什么意思', '啥意思', '抗压能力强', '弹性工作', '薪资面议', '词条库']],
        ['capability_dictionary', ['对标岗位', '岗位对标', '对标的岗位', '值多少', '还差什么', '差什么', '能力差距', '岗位差距', '能力对标', '能力词典', '岗位能力', '补课', '经历值多少', '岗位要求', '符不符合这个岗位', '适不适合这个岗位', '够不够这个岗位', '够格']],
        ['cognitive_check', ['学什么专业', '学这专业', '什么专业能', '专业能干什么', '专业能干嘛', '专业能做什么', '专业学出来', '这个专业能', '我的专业能', '学这个专业', '学计算机能', '学电子能', '学会计能', '学人力能', '学什么能', '专业往哪走', '专业方向', '专业出路', '专业对什么岗位', '专业对口', '专业前景', '专业能投', '读这专业', '我这个专业', '我学的专业', '专业能往', '能干嘛', '能干啥', '毕业后', '毕业能', '以后能', '以后干啥', '以后干什么']],
      ];
      
      // 统计每个意图的命中关键词数
      let intentScores: [string, number][] = INTENT_KEYWORDS.map(([intent, keywords]) => {
        const score = keywords.filter(kw => lowerMsg.includes(kw)).length;
        return [intent, score] as [string, number];
      });
      
      // 归一化：简短消息（<10字）降低 jobs / truth_check 权重，避免「岗位/薪资」「真实吗/真的吗」等短词误触发
      if (message.length < 10) {
        intentScores = intentScores.map(([intent, score]) => {
          if (intent === 'jobs') return [intent, Math.max(0, score - 1)] as [string, number];
          // truth_check 命中「真实吗/真的吗/会吗」等超短词且无上下文词（经历/简历/写得）→ 降权，防止随口一词误触发 A4
          if (intent === 'truth_check' && /(真实吗|真的吗|会吗|背调吗|吹牛吗|真实么)/.test(message) && !/(这段经历|我的经历|简历|写得|这段|上面|这样写|上面这段)/.test(message)) {
            return [intent, Math.max(0, score - 1)] as [string, number];
          }
          return [intent, score] as [string, number];
        });
      }
      
      // 语境加权：B1 面试雷达（岗+面试 / 面试+考察 → 问会怎么面、考什么），B3 能力词典（岗+能力/差距/适不适合 → 对标岗位）
      const hasRole = /岗位|职位|岗|JD|校招|社招|春招|秋招/.test(lowerMsg);
      const hasInterview = lowerMsg.includes('面试');
      const hasRadarAsk = /会问什么|会考什么|怎么考|怎么面|怎么考察|怎么准备|考察|会重点考|面试重点|面试方向|会考察|考察内容|面试考察|考什么|会重点面|会怎么考|会重点考什么|考察重点/.test(lowerMsg);
      const hasAbilityAsk = /能力要求|能力|要求|补什么|需要补什么|差距|匹配度|对标|适不适合|够不够|够格|还差|值多少|岗位要求|岗位技能|技能|岗位需要/.test(lowerMsg);
      const radarCond = (hasInterview ? 1 : 0) + (hasRole ? 1 : 0) + (hasRadarAsk ? 1 : 0);
      if (radarCond >= 2) {
        intentScores = intentScores.map(([intent, score]) => intent === 'interview_radar' ? [intent, score + 2] as [string, number] : [intent, score] as [string, number]);
      }
      if (hasRole && hasAbilityAsk) {
        intentScores = intentScores.map(([intent, score]) => intent === 'capability_dictionary' ? [intent, score + 2] as [string, number] : [intent, score] as [string, number]);
      }
      
      // 按分数排序，同分时按优先级：career_paths > (job_match/narrative_check/truth_check) > assessment > interview > decision > career > competency > jobs
      const INTENT_PRIORITY: Record<string, number> = {
        'career_paths': 8, 'job_match': 7, 'narrative_check': 7, 'truth_check': 7, 'interview_radar': 7, 'subtext_detect': 7, 'capability_dictionary': 7, 'cognitive_check': 7,
        'assessment': 6,
        'interview': 5, 'decision': 4, 'career': 3,
        'competency': 2, 'jobs': 1,
      };
      intentScores.sort((a, b) => {
        const scoreDiff = b[1] - a[1];
        if (scoreDiff !== 0) return scoreDiff;
        return (INTENT_PRIORITY[b[0]] || 0) - (INTENT_PRIORITY[a[0]] || 0);
      });
      
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

      // ============================================================
      // 口语化/隐晦表达兜底识别（2026-09-01 意图识别升级）
      // 目标：听懂学生口语的"迷茫/方向不明"表达（"我不知道干嘛""没方向""怕找不到工作"
      // "好焦虑""不知道该投什么"），避免落空到普通聊天，路由到方向/决策引擎。
      // 仅在无强意图命中（topIntent 分数 === 0，即完全落空到聊天）时介入，不抢"面试/测评/岗位查询"等明确意图。
      // ============================================================
      const DIRECTION_WORDS = ['不知道干嘛','不知道该干嘛','不知道怎么办','没方向','没头绪','没有方向','能做什么','做什么好','能做啥','干啥好','啥都不会','什么都不会','不知道做什么','不知道能做什么','不知道该做什么','该做什么','出路在哪','不知道投什么','不知道该投','投什么好','找什么工作','找不到工作','找不到方向','不知道找什么','该干什么','不知道学什么','不知道选什么','选择困难','摇摆不定','不知道往哪','不知道下一步','瞎投','乱投','没啥目标','没有目标','不知道目标','可以做什么','不确定','不知所措','适合啥','不知道做啥','不清楚','不知道干啥'];
      const EMOTION_WORDS = ['慌','心慌','焦虑','迷茫','害怕','怕','担心','没底','压力','emo','崩溃','好乱','心乱','很乱','烦躁','烦死','没信心','不行了','好难','无措'];
      const dirHit = DIRECTION_WORDS.filter(w => lowerMsg.includes(w)).length;
      const emoHit = EMOTION_WORDS.filter(w => lowerMsg.includes(w)).length;
      const hasJobCtx = /工作|岗位|投|就业|求职|offer|简历|招聘|面试/.test(lowerMsg);
      const hasPlanningWord = /规划|前途|未来|路径|发展|怎么走|往哪走|方向/.test(lowerMsg);
      const DECISION_TRIGGER = /考研|考公|考编|读研|要不要读|要不要考|继续读|深造|选哪条|升学|复读|二战|读书还是|上班还是/;
      // 有方向迷失问句（direction>0），或情绪词+求职语境（emo>0 且带工作/岗位）时介入
      const confusionTrigger = dirHit >= 1 || (emoHit >= 1 && hasJobCtx);
      if (confusionTrigger && topIntent[1] === 0) {
        if (DECISION_TRIGGER.test(lowerMsg)) {
          resolvedBotType = 'decision';
        } else if (hasPlanningWord) {
          resolvedBotType = 'career';
        } else {
          resolvedBotType = 'career_paths';
        }
        useVoiceWrapper = true;
        console.log(`[xiaozhi] Confusion fallback -> ${resolvedBotType} (dir=${dirHit},emo=${emoHit})`);
      }

      // 职业意向兜底：学生说「我想做/适合当 + 岗位」（如「我适合做产品经理吗」）时，
      // 这类口语不以「迷茫/没方向」为特征，不落入上方方向迷失判断，会滑到普通聊天。
      // 这里在完全落空（topIntent===0）时，用「意向动词 + 岗位/行业」规则兜到求职方向引擎。
      // 仅当同时命中意向动词与岗位词、且非闲聊口语时介入；「我适不适合做X」命中 competency、
      // 「适合做什么」命中 career_paths 等已有强意图时不在此兜底，避免误伤。
      const CAREER_INTENT_VERB = /想做|想当|想从事|想做一名|想当一名|适合做|适合当|适合干|适合从事|能当|能做|可以做|可以当|打算做|考虑做|准备做|去当|去做|转行做|跨行做|想进|想进入|想干|从事|以后做|毕业后做|当一名|做一名|合适吗/;
      const CAREER_INTENT_ROLE = /产品经理|产品|项目经理|运营|程序员|开发|前端|后端|工程师|数据分析|数据|hr|人力资源|人事|人力|hrbp|会计|财务|设计|ui|ux|视觉|销售|市场|营销|行政|客服|老师|教师|助教|律师|医生|护士|公务员|策划|编辑|翻译|主播|导游|厨师|司机|摄影|剪辑|编剧|投资|风控|审计|采购|供应链|物流|外贸|电商|培训|咨询|顾问|技术|测试|运维|架构|算法|研究员|教授|法务|经纪人|经理|主管|专员|岗位|职业|行业|方向|创业|开公司|老板|这行|干这行|互联网|建筑|金融|教育|医疗|传媒|游戏/;
      const CASUAL_HINT = /吃饭|睡觉|玩游戏|打游戏|看电影|听歌|出去玩|休息|洗澡|吃啥|饿|困|天气|感冒|叫什么|几点|吃了|上厕所|冲浪|看剧|刷视频|聊天吧|今天吃什么|旅游|看海|逛街/;
      if (topIntent[1] === 0 && CAREER_INTENT_VERB.test(lowerMsg) && CAREER_INTENT_ROLE.test(lowerMsg) && !CASUAL_HINT.test(lowerMsg)) {
        resolvedBotType = 'career_paths';
        useVoiceWrapper = true;
        console.log(`[xiaozhi] Career-intent fallback -> career_paths`);
      }
    }

    // ============================================================
    // 求职方向匹配引擎（career_paths）— 优先于 DeepSeek
    // 用户一次给齐信息 → 直接跑引擎返回结果
    // 信息不全 → 降级到 DeepSeek 问用户补充
    // ============================================================
    if (resolvedBotType === 'career_paths') {
      const engineResult = handleCareerPathsQuery(message || '');
      
      // [DIAGNOSTIC] 忽略以确认实际值
      const _diag = `DEEPSEEK=${USE_DEEPSEEK}, resolvedBotType=${resolvedBotType}, needsMoreInfo=${engineResult.needsMoreInfo}`;
      console.log(`[career_paths] ${_diag}`);
      
      if (!engineResult.needsMoreInfo && engineResult.report) {
        // 直接返回引擎结果
        const report = engineResult.report;
        const responseText = engineResult.reply;

        // 包装成 SSE 流返回
        const encoder = new TextEncoder();
        const segs = responseText.match(/[^。！？\n]+[。！？\n]?/g) || [responseText];
        const stream = new ReadableStream({
          async start(controller) {
            for (const seg of segs) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: seg })}\n\n`));
            }
            // 推送 dispatch 事件给前端展示 action card
            const dispatchEvent = `event: dispatch\ndata: ${JSON.stringify({
              intent: 'career_paths',
              title: '🎯 你的求职方向匹配结果',
              description: `最佳路径：${report.summary.best_route}，共 ${report.summary.strong_match} 条强匹配`,
              actionLabel: '查看详细路径',
              tabId: 'career-paths',
            })}\n\n`;
            controller.enqueue(encoder.encode(dispatchEvent));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        });
        return new Response(stream, { headers: SSE_HEADERS });
      }
      // 信息不全 → 直接返回追问，不降级到 DeepSeek
      // 原因：用户缺学校等关键信息，不需要 AI 介入，引擎自己就能生成追问
      // 降级到 DeepSeek 可能导致 DeepSeek 失败 → 回退 Coze Bot → 默认打招呼消息
      const missingReply = engineResult.reply;
      console.log(`[career_paths] Incomplete profile: "${missingReply.slice(0, 60)}..."`);
      const encoder = new TextEncoder();
      const segs = missingReply.match(/[^。！？\n]+[。！？\n]?/g) || [missingReply];
      const stream = new ReadableStream({
        async start(controller) {
          for (const seg of segs) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: seg })}\n\n`));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      });
      return new Response(stream, { headers: SSE_HEADERS });
    }

    // ============================================================
    // 面试行业雷达 / 潜台词词条库 · chat 接入（B1 / B2）
    // 本地启发式引擎，先于 DeepSeek，零模型成本；命中即返回，不降级。
    // ============================================================
    if (resolvedBotType === 'interview_radar' || resolvedBotType === 'subtext_detect') {
      const isRadar = resolvedBotType === 'interview_radar';
      const ctx = isRadar
        ? handleInterviewRadarChatQuery(message || '')
        : handleSubtextChatQuery(message || '');
      const encoder = new TextEncoder();

      // 信息不全 → 只返文本追问，不降级到 DeepSeek
      if (ctx.needsMoreInfo) {
        const segs = ctx.reply.match(/[^。！？\n]+[。！？\n]?/g) || [ctx.reply];
        const stream = new ReadableStream({
          async start(controller) {
            for (const seg of segs) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: seg })}\n\n`));
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        });
        return new Response(stream, { headers: SSE_HEADERS });
      }

      // 有结果 → SSE 文本流 + dispatch 卡片事件（引导到功能页）
      const responseText = ctx.reply;
      const segs = responseText.match(/[^。！？\n]+[。！？\n]?/g) || [responseText];
      const dispatchCard = DISPATCH_CARDS[resolvedBotType];
      const stream = new ReadableStream({
        async start(controller) {
          for (const seg of segs) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: seg })}\n\n`));
          }
          if (dispatchCard) {
            const dispatchEvent = `event: dispatch\ndata: ${JSON.stringify({
              intent: resolvedBotType,
              title: dispatchCard.title,
              description: dispatchCard.description,
              actionLabel: dispatchCard.actionLabel,
              tabId: dispatchCard.tabId,
              url: dispatchCard.url,
            })}\n\n`;
            controller.enqueue(encoder.encode(dispatchEvent));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      });
      return new Response(stream, { headers: SSE_HEADERS });
    }

    // ============================================================
    // 能力翻译词典 · chat 接入（横向岗位对标 + 差距诊断）
    // 本地启发式引擎，先于 DeepSeek，零模型成本；命中即返回，不降级。
    // ============================================================
    if (resolvedBotType === 'capability_dictionary') {
      const ctx = handleCapabilityChatQuery(message || '');
      const encoder = new TextEncoder();

      if (ctx.needsMoreInfo) {
        const segs = ctx.reply.match(/[^。！？\n]+[。！？\n]?/g) || [ctx.reply];
        const stream = new ReadableStream({
          async start(controller) {
            for (const seg of segs) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: seg })}\n\n`));
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        });
        return new Response(stream, { headers: SSE_HEADERS });
      }

      const responseText = ctx.reply;
      const segs = responseText.match(/[^。！？\n]+[。！？\n]?/g) || [responseText];
      const dispatchCard = DISPATCH_CARDS[resolvedBotType];
      const stream = new ReadableStream({
        async start(controller) {
          for (const seg of segs) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: seg })}\n\n`));
          }
          if (dispatchCard) {
            const dispatchEvent = `event: dispatch\ndata: ${JSON.stringify({
              intent: resolvedBotType,
              title: dispatchCard.title,
              description: dispatchCard.description,
              actionLabel: dispatchCard.actionLabel,
              tabId: dispatchCard.tabId,
              url: dispatchCard.url,
            })}\n\n`;
            controller.enqueue(encoder.encode(dispatchEvent));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      });
      return new Response(stream, { headers: SSE_HEADERS });
    }

    // ============================================================
    // 表达链判断力 · chat 接入（A3 能力翻译 / A4 真实性红线）
    // 本地启发式引擎，先于 DeepSeek，零模型成本；并按四真红线联动（先 A4 后 A3）。
    // ============================================================
    if (resolvedBotType === 'narrative_check' || resolvedBotType === 'truth_check') {
      const isTruth = resolvedBotType === 'truth_check';
      const ctx = isTruth
        ? handleTruthChatQuery(message || '')
        : handleNarrativeChatQuery(message || '');
      const encoder = new TextEncoder();

      // 信息不全 → 只返文本追问，不降级到 DeepSeek
      if (ctx.needsMoreInfo) {
        const segs = ctx.reply.match(/[^。！？\n]+[。！？\n]?/g) || [ctx.reply];
        const stream = new ReadableStream({
          async start(controller) {
            for (const seg of segs) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: seg })}\n\n`));
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        });
        return new Response(stream, { headers: SSE_HEADERS });
      }

      const exp = ctx.experience || '';
      const targetJob = ctx.targetJob;
      const truth = walkTruthfulness(exp, targetJob);

      let reportText = '';
      let dispatchTitle = '';
      let dispatchDescription = '';

      if (isTruth) {
        // A4 真实性红线：直接输出四真扫描
        dispatchTitle = '⚠️ 这段经历的真实性风险';
        dispatchDescription = `真实性风险：${truth.highCount} 处高险 / ${truth.riskCount} 处风险`;
        reportText = formatTruthForChat(truth);
      } else {
        // A3 能力翻译：先 A4 质检；high_risk 则以 A4 为主，禁止美化
        dispatchTitle = '💡 这段经历可以这样翻译';
        if (truth.verdict === 'high_risk') {
          dispatchDescription = `先收敛真实性风险：${truth.highCount} 处高险`;
          reportText = `⚠️ 先别急着润色——这段经历有真实性风险。\n\n${formatTruthForChat(truth)}\n\n建议先按上面收敛成真实可背调的写法，小职再帮你翻译。`;
        } else {
          const narr = analyzeNarrative(exp, targetJob);
          dispatchDescription = `叙事价值：${narr.emphasis?.value ?? '—'}/100`;
          reportText = formatNarrativeForChat(narr);
          if (truth.riskCount > 0) {
            reportText += `\n\n---\n✅ 真实性红线检查：${truth.summary}`;
          }
        }
      }

      const segs = reportText.match(/[^。！？\n]+[。！？\n]?/g) || [reportText];
      const stream = new ReadableStream({
        async start(controller) {
          for (const seg of segs) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: seg })}\n\n`));
          }
          const dispatchEvent = `event: dispatch\ndata: ${JSON.stringify({
            intent: resolvedBotType,
            title: dispatchTitle,
            description: dispatchDescription,
            actionLabel: '查看详情',
            tabId: 'resume-editor',
          })}\n\n`;
          controller.enqueue(encoder.encode(dispatchEvent));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      });
      return new Response(stream, { headers: SSE_HEADERS });
    }

    // ============================================================
    // 认知校正 · chat 接入（A1 专业→岗位方向反推）
    // 本地启发式引擎，先于 DeepSeek，零模型成本；守四真，不编造。
    // ============================================================
    if (resolvedBotType === 'cognitive_check') {
      const ctx = handleCognitiveChatQuery(message || '');
      const encoder = new TextEncoder();

      // 缺专业 → 只返文本追问，不降级到 DeepSeek
      if (ctx.needsMoreInfo) {
        const segs = ctx.reply.match(/[^。！？\n]+[。！？\n]?/g) || [ctx.reply];
        const stream = new ReadableStream({
          async start(controller) {
            for (const seg of segs) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: seg })}\n\n`));
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        });
        return new Response(stream, { headers: SSE_HEADERS });
      }

      const responseText = ctx.reply;
      const segs = responseText.match(/[^。！？\n]+[。！？\n]?/g) || [responseText];
      const dispatchCard = DISPATCH_CARDS[resolvedBotType];
      const stream = new ReadableStream({
        async start(controller) {
          for (const seg of segs) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: seg })}\n\n`));
          }
          if (dispatchCard) {
            const dispatchEvent = `event: dispatch\ndata: ${JSON.stringify({
              intent: resolvedBotType,
              title: dispatchCard.title,
              description: dispatchCard.description,
              actionLabel: dispatchCard.actionLabel,
              tabId: dispatchCard.tabId,
              url: dispatchCard.url,
            })}\n\n`;
            controller.enqueue(encoder.encode(dispatchEvent));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      });
      return new Response(stream, { headers: SSE_HEADERS });
    }

    // ============================================================
    // 统一 DeepSeek + RAG 路径 — 所有智能体走这一条链路
    // userContext 已在上面统一注入，不再需要独立 API 转发
    // ============================================================

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
        // 单岗位深度分析模式：完全跳过 RAG 召回，所有结果用空数组占位
        const [jds, careerPaths, skills, skillAssessments, resources, guetKnowledge = []] = await Promise.all([
          allowedTables!.includes('job_descriptions')
            ? querySupabase('job_descriptions', [
                keywords.industry ? { field: 'industry', operator: 'ilike', value: `%${keywords.industry}%` } : undefined,
                keywords.jobTitle ? { field: 'job_title', operator: 'ilike', value: `%${keywords.jobTitle}%` } : undefined,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ].filter(Boolean) as any, 40, 'job_title,industry,responsibilities,hard_skills,soft_skills,salary_range,city')
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
          
          allowedTables!.includes('skill_assessments')
            ? querySupabase('skill_assessments', [
                keywords.industry ? { field: 'industry', operator: 'ilike', value: `%${keywords.industry}%` } : undefined,
                keywords.jobTitle ? { field: 'skill_name', operator: 'ilike', value: `%${keywords.jobTitle}%` } : undefined,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ].filter(Boolean) as any, 10, 'skill_name,dimension,question,options,correct_answer,explanation,difficulty')
            : [],
          
          allowedTables!.includes('learning_resources')
            ? querySupabase('learning_resources', [
                keywords.industry ? { field: 'industry', operator: 'ilike', value: `%${keywords.industry}%` } : undefined,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ].filter(Boolean) as any, 5, 'title,url,type')
            : [],
          
          allowedTables!.includes('guet_knowledge')
            ? querySupabase('guet_knowledge',
                keywords.keywords?.length ? keywords.keywords.slice(0, 3).map(kw => ({ field: 'content', operator: 'ilike' as const, value: kw })) : [],
                keywords.keywords?.length ? 10 : 20, '*')
            : [],
        ]);
        
        // ============================================================
        // 岗位匹配智能体专属：pgvector 语义搜索 + 多维打分（仅 jobs/job_match）
        // 在关键词 RAG 基础上叠加真实语义匹配结果
        // ============================================================
        let tierMatchContext = '';
        if ((actualBotType === 'jobs' || actualBotType === 'job_match' || actualBotType === 'career') && userId) {
          try {
            const matchResults: MatchResult[] = await matchJobs({
              userId,
              skills: message,
              limit: 15,
            });

            if (matchResults.length > 0) {
              // 按匹配度分三档
              const precise = matchResults.filter(r => r.totalScore >= 75);
              const reach = matchResults.filter(r => r.totalScore >= 60 && r.totalScore < 75);
              const safety = matchResults.filter(r => r.totalScore >= 45 && r.totalScore < 60);

              const formatJob = (r: MatchResult) =>
                `  - ${r.jobTitle} | ${r.jobMeta.company || '未知公司'} | 匹配度${r.totalScore}% | ${r.jobMeta.industry || ''} | ${r.jobMeta.city || ''} | 已匹配:${r.matchedSkills.join('/') || '无'} | 缺口:${r.skillGaps.join('/') || '无'}`;

              const parts: string[] = [];
              if (precise.length > 0) {
                parts.push(`【精准匹配岗 ≥75%】\n${precise.slice(0, 3).map(formatJob).join('\n')}`);
              }
              if (reach.length > 0) {
                parts.push(`【冲刺岗 60-74%】\n${reach.slice(0, 3).map(formatJob).join('\n')}`);
              }
              if (safety.length > 0) {
                parts.push(`【稳妥保底岗 45-59%】\n${safety.slice(0, 3).map(formatJob).join('\n')}`);
              }

              if (parts.length > 0) {
                tierMatchContext = `\n\n【pgvector 语义匹配结果 — 基于 24753 条真实 JD 库召回，请基于以下数据生成三档推荐卡片】\n${parts.join('\n\n')}\n`;
                console.log(`[chat] pgvector tier match: precise=${precise.length}, reach=${reach.length}, safety=${safety.length}`);
              }
            }
          } catch (matchErr) {
            console.error('[chat] matchJobs error:', matchErr);
            // 降级：不阻断流程，继续用关键词 RAG
          }
        }

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
        if (allowedTables!.includes('skill_assessments') && skillAssessments.length > 0) {
          ragSources.push({ tableName: 'skill_assessments', displayName: displayNames!['skill_assessments'] || '技能测评题库', data: skillAssessments });
        }
        if (allowedTables!.includes('learning_resources') && resources.length > 0) {
          ragSources.push({ tableName: 'learning_resources', displayName: displayNames!['learning_resources'] || '学习资源', data: resources });
        }
        if (allowedTables!.includes('guet_knowledge') && guetKnowledge.length > 0) {
          ragSources.push({ tableName: 'guet_knowledge', displayName: displayNames!['guet_knowledge'] || '桂电知识', data: guetKnowledge });
        }
        
        const ragContext = buildRAGContext(ragSources) + tierMatchContext;

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

        // C 人格兜底层：小职闲聊时注入用户选的人格约束，让整段对话保持温度（不为空不覆盖专业内核）
        if (persona && effectiveBotType === 'xiaozhi') {
          basePrompt = personaPromptFragment(persona) + '\n\n' + basePrompt;
        }
        
        // 注入用户上下文到 system prompt（所有智能体共享）
        if (userContext) {
          basePrompt = `【用户背景信息 — 平台自动注入，请直接使用，不要重新询问】\n${userContext}\n\n---\n\n${basePrompt}`;
        }

        // 统一追加安全规则（从prompts.ts移出，避免7份重复）
        const safetyRule = SAFETY_RULES[actualBotType] || SAFETY_RULES.career;
        basePrompt += '\n\n【安全规则】' + safetyRule;

        
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
              
              // 发送 [DONE] 后立即关闭流，不让客户端等待
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();

              // 保存对话历史：fire-and-forget（不阻塞流关闭）
              saveChatHistory(
                { userId: userId || '', conversationId: effectiveConversationId, userMessage: message, assistantResponse: fullResponse, botType: effectiveBotType || '' },
                isCacheable && fullResponse ? cacheKey : undefined,
                fullResponse && userId ? {
                  conversationId: effectiveConversationId,
                  userId,
                  needsCheck: () => needsCompression(effectiveConversationId),
                  runCompression: (convId, uid) => compressConversation(convId, uid),
                } : undefined,
              ).catch(e => console.error('[chat] History save error:', e));

                            // 测评类智能体：提取并保存结构化测评数据（fire-and-forget）
              if (effectiveBotType === 'assessment' && fullResponse && userId) {
                const dataMatch = fullResponse.match(/<<DATA:type=skill_assessment>>([\s\S]*?)<<END>>/);
                if (dataMatch) {
                  try {
                    const jsonData = JSON.parse(dataMatch[1].trim());
                    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/assessment_results`, {
                      method: 'POST',
                      headers: {
                        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
                        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal',
                      },
                      body: JSON.stringify({
                        user_id: userId,
                        result_data: jsonData,
                        assessment_type: 'competency',
                        created_at: new Date().toISOString(),
                      }),
                    }).catch(e => console.error('[chat] Assessment data save error:', e));
                  } catch (e) {
                    console.error('[chat] Assessment data parse error:', e);
                  }
                }
              }

              // 桂电知识飞轮：fire-and-forget（不阻塞响应）
              runGuetFlywheel({
                userMessage: message,
                assistantResponse: fullResponse,
                botType: effectiveBotType || '',
              }).catch(e => console.error('[chat] Guet Flywheel error:', e));

              // 用户画像飞轮：fire-and-forget（不阻塞响应）
              if (userId) {
                runProfileFlywheel({
                  userMessage: message,
                  assistantResponse: fullResponse,
                  botType: effectiveBotType || '',
                  userId,
                }).catch(e => console.error('[chat] Profile Flywheel error:', e));
              }
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
                } catch { /* best effort */ }
              }
            } finally {
              clearTimeout(timeoutId);
              try { controller.close(); } catch {}
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
