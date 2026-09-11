/**
 * 方向四 · 工具执行器（小职直接动手）
 *
 * 链路：意图命中 → 决策模型确认+抽参（skip 则交还原分支）→ 配额校验 →
 *       执行底层能力 → SSE 输出（文本 + tool_result 卡片事件）
 *
 * 约束：
 * - 决策失败/模型返回 skip 一律交还原 chat 管线，零行为变更
 * - 执行失败返回人格化降级文本，不中断会话
 * - 工具白名单见 registry.ts，不做自动投递/网申代填
 */

import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { deepSeekChat, ChatMessage } from '@/lib/deepseek-chat';
import { checkFeatureAccess, deductQuota } from '@/lib/quota';
import { matchJobs } from '@/lib/matching-service';
import { buildOneJdStrategy } from '@/lib/career-paths/engine/one_jd_strategy';
import { translateExperience } from '@/lib/resume/translate-experience';
import { generateCareerPlan } from '@/lib/career-planning/generate-plan';
import { TOOL_REGISTRY, TOOL_TRIGGER_INTENTS, ToolName, ToolDefinition } from '@/lib/tools/registry';
import type { PersonaProfile } from '@/lib/career-paths/engine/persona';

// ============================================================
// 类型
// ============================================================

interface UserProfileLite {
  major: string | null;
  grade: string | null;
  preferred_city: string | null;
  skills: string | null;
  education: string | null;
}

export type ToolCardView = 'matches' | 'resume_suggestions' | 'plan_report' | 'one_jd' | 'translate';

export interface ToolResultPayload {
  tool: ToolName;
  title: string;
  view: ToolCardView;
  data: Record<string, unknown>;
  pageUrl: string;
  pageLabel: string;
}

interface ToolDecision {
  action: 'execute' | 'ask' | 'skip';
  args?: Record<string, string>;
  askText?: string;
}

export interface ToolInvocationContext {
  request: NextRequest;
  message: string;
  intent: string;
  userId: string;
  persona: PersonaProfile | null;
}

// ============================================================
// 工具执行开场白（用户可见）
// ============================================================

const TOOL_OPENERS: Record<ToolName, string> = {
  match_jobs: '好，基于你的能力画像跑一轮真实岗位匹配——',
  score_resume: '收到，我来评这份简历——',
  plan_career: '好，这就为你生成一份职业规划报告，大约需要十几秒——',
  analyze_one_jd: '收到，帮你把这份 JD 拆开看——',
  translate_experience: '好，把这段经历翻译成简历语言——',
  check_cognitive: '',
};

const DEFAULT_ASK: Record<ToolName, string> = {
  match_jobs: '想让我帮你匹配岗位的话，可以直接说"帮我匹配岗位"，也可以补充目标行业或城市，我会更准。',
  score_resume: '把简历原文贴给我，再告诉我目标岗位，我来帮你逐条评。',
  plan_career: '告诉我你的专业和年级，我就能生成一份完整的职业规划报告。',
  analyze_one_jd: '把 JD 原文贴给我（职位描述那段），我来帮你拆解潜台词和投递策略。',
  translate_experience: '把你想改写的经历原文发给我，我来翻译成简历语言。',
  check_cognitive: '',
};

// ============================================================
// 用户画像与简历来源
// ============================================================

async function getUserProfileLite(userId: string): Promise<UserProfileLite> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('user_profiles')
      .select('education, major, preferred_city, grade, skills')
      .eq('user_id', userId)
      .maybeSingle();
    return {
      major: data?.major ?? null,
      grade: data?.grade ?? null,
      preferred_city: data?.preferred_city ?? null,
      skills: data?.skills ?? null,
      education: data?.education ?? null,
    };
  } catch {
    return { major: null, grade: null, preferred_city: null, skills: null, education: null };
  }
}

/** 读取用户最近一份简历文本（用于 score_resume / analyze_one_jd 兜底） */
async function getLatestResumeText(userId: string): Promise<string | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('resumes')
      .select('data, title, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1);
    if (!data || data.length === 0) return null;
    const raw: unknown = data[0]?.data;
    if (typeof raw === 'string' && raw.trim().length >= 100) return raw.trim();
    if (raw && typeof raw === 'object') {
      const obj = raw as Record<string, unknown>;
      for (const key of ['content', 'text', 'body', 'resume_text']) {
        const v = obj[key];
        if (typeof v === 'string' && v.trim().length >= 100) return v.trim();
      }
    }
    return null;
  } catch {
    return null;
  }
}

function profileSummary(p: UserProfileLite): string {
  const parts: string[] = [];
  if (p.education) parts.push(`学历:${p.education}`);
  if (p.major) parts.push(`专业:${p.major}`);
  if (p.grade) parts.push(`年级:${p.grade}`);
  if (p.preferred_city) parts.push(`意向城市:${p.preferred_city}`);
  if (p.skills) parts.push(`技能:${p.skills}`);
  return parts.length > 0 ? parts.join('；') : '（暂无画像信息）';
}

// ============================================================
// 决策层：LLM 确认意图 + 抽取参数
// ============================================================

function buildDecisionPrompt(tool: ToolDefinition): string {
  const toolLines = Object.values(TOOL_REGISTRY)
    .filter((t) => !t.chatNative)
    .map((t) => `- ${t.name}：${t.description}（必填: ${t.requiredArgs.join(', ') || '无'}；可选: ${t.optionalArgs.join(', ') || '无'}）`)
    .join('\n');

  return `你是"小职"的内部工具调度器。本次候选工具是「${tool.name}」（${tool.title}）。判断用户消息是否真的需要执行该工具，并抽取参数。

全部可用工具（仅供判断是否更适合别的工具，执行时只执行候选工具）：
${toolLines}

输出严格 JSON（只输出 JSON，不要其他文字）：
{"action":"execute","args":{...}}
{"action":"ask","askText":"一句自然的中文追问"}
{"action":"skip"}

规则：
1. args 的 key 必须严格使用工具定义中的参数名；抽取文本参数（简历原文/JD原文/经历原文）时保留用户原文，不要改写、不要截断、不要总结。
2. 用户消息里没有的参数不要编造；缺必填参数时输出 ask，askText 里明确要用户提供什么。
3. 用户只是在咨询、闲聊、问方法论（而非要求直接执行）→ skip。
4. 消息诉求与候选工具明显不符（如"内推"、纯查岗位列表）→ skip。
5. 用户画像中已有的信息可以作为 args 的来源（如 major/grade/city）。`;
}

async function decideToolAction(
  ctx: ToolInvocationContext,
  tool: ToolDefinition,
  profile: UserProfileLite
): Promise<ToolDecision | null> {
  try {
    const messages: ChatMessage[] = [
      { role: 'system', content: buildDecisionPrompt(tool) },
      {
        role: 'user',
        content: `【命中意图】${ctx.intent}\n【用户画像】${profileSummary(profile)}\n【用户消息】\n${ctx.message}`,
      },
    ];

    const result = await deepSeekChat({
      messages,
      temperature: 0.1,
      maxTokens: 1200,
      returnUsage: true,
    });

    let raw = (result.content || '').trim();
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1) return null;

    const parsed = JSON.parse(raw.slice(start, end + 1)) as {
      action?: string;
      args?: Record<string, string>;
      askText?: string;
    };

    if (parsed.action === 'execute') {
      // 校验必填参数是否齐备（模型漏抽时降级为 ask）
      const args = parsed.args || {};
      const missing = tool.requiredArgs.filter((k) => !args[k] || !String(args[k]).trim());
      if (missing.length > 0) {
        return { action: 'ask', askText: parsed.askText || DEFAULT_ASK[tool.name] };
      }
      return { action: 'execute', args };
    }
    if (parsed.action === 'ask') {
      return { action: 'ask', askText: parsed.askText || DEFAULT_ASK[tool.name] };
    }
    return { action: 'skip' };
  } catch {
    // 决策失败 → 交还原管线，零影响
    return null;
  }
}

// ============================================================
// 执行层
// ============================================================

interface Suggestion {
  type: 'highlight' | 'improvement' | 'suggestion';
  title: string;
  suggestion: string;
}

function buildScoreResumePrompt(targetPosition: string): string {
  return `你是资深HR简历优化专家。用户上传了一份简历，目标是「${targetPosition}」岗位。

请按以下结构输出优化建议（严格JSON数组格式，不要markdown代码块）：

[
  {"type":"highlight","title":"简短标题","suggestion":"详细说明"},
  {"type":"improvement","title":"简短标题","suggestion":"详细说明"},
  {"type":"suggestion","title":"简短标题","suggestion":"详细说明"}
]

规则：
- highlight：简历中写得好的亮点，值得保留和强化（1-2条）
- improvement：必须修改的硬伤——用词空洞、缺乏数据、STAR不完整、格式问题等（3-5条）
- suggestion：针对性提升建议——根据目标岗位补充技能、调整侧重点（2-4条）
- 每条建议要具体，指出原文哪里有问题、怎么改，不能泛泛而谈
- 总共输出6-10条
- 只输出JSON数组，不要其他文字`;
}

function parseSuggestions(raw: string): Suggestion[] {
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const tryParse = (text: string): Suggestion[] | null => {
    try {
      const parsed: unknown = JSON.parse(text);
      if (Array.isArray(parsed)) {
        const validTypes = new Set(['highlight', 'improvement', 'suggestion']);
        const items = parsed
          .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
          .map((item) => ({
            type: (validTypes.has(String(item.type)) ? String(item.type) : 'suggestion') as Suggestion['type'],
            title: String(item.title || item.suggestion || '').slice(0, 60),
            suggestion: String(item.suggestion || item.title || ''),
          }))
          .filter((s) => s.suggestion.length > 0);
        if (items.length > 0) return items;
      }
    } catch {
      /* fallthrough */
    }
    return null;
  };

  return tryParse(cleaned) ?? (cleaned.match(/\[[\s\S]*\]/) ? tryParse(cleaned.match(/\[[\s\S]*\]/)![0]) : null) ?? [];
}

/** 执行工具，返回卡片数据。参数已由决策层保证必填齐备。 */
async function executeTool(
  tool: ToolName,
  args: Record<string, string>,
  ctx: ToolInvocationContext,
  profile: UserProfileLite,
  resumeText: string | null
): Promise<ToolResultPayload> {
  const def = TOOL_REGISTRY[tool];

  switch (tool) {
    case 'match_jobs': {
      const results = await matchJobs({
        userId: ctx.userId,
        skills: args.skills || profile.skills || undefined,
        targetPosition: args.target_position || undefined,
        limit: 5,
      });
      const matches = results.map((r) => ({
        job_title: r.jobTitle,
        city: r.jobMeta.city || null,
        industry: r.jobMeta.industry || null,
        salary_range: r.jobMeta.salaryRange || '',
        match_score: r.totalScore,
        matched_skills: r.matchedSkills,
        gap_skills: r.skillGaps,
        overall_advice: r.weighting.advice,
        role: r.weighting.role.label,
      }));
      return {
        tool,
        title: def.title,
        view: 'matches',
        data: { matches, total: matches.length, user_skills: args.skills || profile.skills || '' },
        pageUrl: def.pageUrl,
        pageLabel: def.pageLabel,
      };
    }

    case 'score_resume': {
      const content = args.resume_text || resumeText || '';
      if (!content || content.length < 100) {
        throw new Error('简历原文不足，无法评分');
      }
      const targetPosition = args.target_position || '目标岗位';
      const aiResponse = await deepSeekChat({
        messages: [
          { role: 'system', content: buildScoreResumePrompt(targetPosition) },
          { role: 'user', content: `目标岗位：${targetPosition}\n\n简历内容：\n${content}` },
        ],
        temperature: 0.5,
        maxTokens: 3000,
      });
      const suggestions = parseSuggestions(aiResponse);
      if (suggestions.length === 0) {
        throw new Error('评分结果解析失败');
      }
      return {
        tool,
        title: def.title,
        view: 'resume_suggestions',
        data: { suggestions, target_position: targetPosition },
        pageUrl: def.pageUrl,
        pageLabel: def.pageLabel,
      };
    }

    case 'plan_career': {
      const major = args.major || profile.major || '';
      const grade = args.grade || profile.grade || '';
      if (!major || !grade) {
        throw new Error('缺少专业或年级信息');
      }
      const plan = await generateCareerPlan({
        userId: ctx.userId,
        major,
        grade,
        city: args.city || profile.preferred_city || undefined,
        targetIndustry: args.target_industry || undefined,
        targetJob: args.target_job || undefined,
      });
      return {
        tool,
        title: def.title,
        view: 'plan_report',
        data: {
          report_id: plan.id,
          major,
          grade,
          core_jobs: plan.coreJobs.slice(0, 3),
          dimensions: plan.dimensions,
        },
        pageUrl: def.pageUrl,
        pageLabel: def.pageLabel,
      };
    }

    case 'analyze_one_jd': {
      const jdText = args.jd_text || '';
      if (jdText.length < 40) {
        throw new Error('JD 原文不足（至少 40 字）');
      }
      const report = buildOneJdStrategy({
        jdText,
        resumeText: args.resume_text || resumeText || undefined,
      });
      return {
        tool,
        title: def.title,
        view: 'one_jd',
        data: {
          jd_title: report.jdTitle,
          verdict: report.applyStrategy.verdict,
          match_score: report.applyStrategy.matchScore ?? null,
          match_assessment: report.applyStrategy.matchAssessment,
          differentiators: report.applyStrategy.differentiators,
          timing: report.applyStrategy.timing,
          risk_warnings: report.applyStrategy.riskWarnings,
          hidden_requirements: report.decoded.hiddenRequirements,
          rewrite_points: (report.rewrite?.rewritePoints || []).slice(0, 4),
          has_resume_based_rewrite: Boolean(report.rewrite),
        },
        pageUrl: def.pageUrl,
        pageLabel: def.pageLabel,
      };
    }

    case 'translate_experience': {
      const experience = args.experience || '';
      if (!experience.trim()) {
        throw new Error('缺少经历原文');
      }
      const result = await translateExperience(experience, args.target_industry || undefined);
      return {
        tool,
        title: def.title,
        view: 'translate',
        data: {
          original: result.original,
          translated: result.translated,
          gaps: result.gaps,
          target_industry: args.target_industry || null,
        },
        pageUrl: def.pageUrl,
        pageLabel: def.pageLabel,
      };
    }

    case 'check_cognitive':
    default:
      throw new Error('该能力已在对话中内置执行');
  }
}

// ============================================================
// SSE 输出
// ============================================================

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
} as const;

function splitSentences(text: string): string[] {
  return text.match(/[^。！？\n]+[。！？\n]?/g) || [text];
}

function textOnlyStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const segs = splitSentences(text);
  return new ReadableStream({
    start(controller) {
      for (const seg of segs) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: seg })}\n\n`));
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });
}

// ============================================================
// 入口：意图命中后的工具拦截
// ============================================================

export async function tryToolExecution(ctx: ToolInvocationContext): Promise<ReadableStream<Uint8Array> | null> {
  const toolName = TOOL_TRIGGER_INTENTS[ctx.intent];
  if (!toolName) return null;

  const def = TOOL_REGISTRY[toolName];
  if (!def || def.chatNative) return null;

  // 认知校正等已内置的能力不拦截；其余走决策
  const profile = await getUserProfileLite(ctx.userId);
  const decision = await decideToolAction(ctx, def, profile);

  // 决策失败或模型判断 skip → 交还原 chat 管线，零行为变更
  if (!decision) return null;
  if (decision.action === 'skip') return null;

  // 追问流：缺参数，不跳页、不降级，小职直接问
  if (decision.action === 'ask') {
    return textOnlyStream(decision.askText || DEFAULT_ASK[toolName]);
  }

  // 配额校验（会员无限；免费按功能独立日计数）
  if (def.quotaFeature) {
    const access = await checkFeatureAccess(ctx.userId, def.quotaFeature);
    if (!access.allowed) {
      const { PAYMENT_GUIDES } = await import('@/lib/payment-prompt');
      const guide = PAYMENT_GUIDES[def.quotaFeature];
      const guideText = guide?.paywall || access.reason || '免费试用次数已用完，开通会员即可无限使用';
      return textOnlyStream(`${guideText}\n\n（你也可以直接去「${def.pageLabel}」页面了解详情）`);
    }
  }

  const encoder = new TextEncoder();
  const opener = TOOL_OPENERS[toolName] || `好，我来帮你${def.title}——`;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const emitText = (text: string) => {
        for (const seg of splitSentences(text)) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: seg })}\n\n`));
        }
      };

      emitText(opener);

      try {
        const resumeText = await getLatestResumeText(ctx.userId);
        const payload = await executeTool(toolName, decision.args || {}, ctx, profile, resumeText);

        // 配额扣减：执行成功才计费（fire-and-forget，失败不阻塞）
        if (def.quotaFeature) {
          deductQuota(ctx.userId, def.quotaFeature).then(undefined, () => undefined);
        }

        controller.enqueue(
          encoder.encode(`event: tool_result\ndata: ${JSON.stringify(payload)}\n\n`)
        );

        emitText(
          toolName === 'plan_career'
            ? '报告已生成完毕，核心结论在下面的卡片里，完整版含六维解读和 6 个月行动计划。'
            : '结果在下面的卡片里，需要看完整版点卡片底部入口。'
        );
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err) {
        const reason = err instanceof Error ? err.message : '执行异常';
        console.error('[tool-executor] 执行失败:', toolName, reason);
        emitText(
          `这次「${def.title}」没跑成（${reason.slice(0, 60)}）。你可以稍后再试一次，或者直接去「${def.pageLabel}」页面手动操作。`
        );
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });
}
