export const dynamic = 'force-dynamic';
/**
 * 模拟面试AI智能体流式API
 * 
 * 优先使用扣子编程 stream_run API
 * 回退到标准 Coze Bot API
 * - 用户验证改查 user_profiles 表，查出 user_type
 * - 传入 custom_variables: { user_type }
 * - 真正的边读边转发流式传输
 * - SSE 解析器提取结构化数据，存入 interview_results 表
 */

import { NextRequest, NextResponse } from 'next/server';
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
  PUBLIC_JD_FIELDS,
} from '@/lib/rag-utils';
import {
  type InterviewStyle,
  INTERVIEW_STYLES,
  buildStylePrompt,
  buildDebriefPrompt,
  detectDebriefIntent,
  detectStyleSwitch,
} from '@/lib/interview-styles';

export const runtime = 'nodejs';

// DeepSeek 开关
const USE_DEEPSEEK = process.env.DEEPSEEK_ENABLED === 'true';

// 面试官开场白（多风格）
const DEMO_INTERVIEW_INTRO = `👋 嘿，我是小职～

模拟面试已就绪，我准备了三种风格陪你练：

🤝 **温和模式** — 像朋友一样聊天，给足鼓励和引导
🎯 **严格模式** — 专业严谨，追问细节和数据
⚡ **压力模式** — 高压追问，提前适应最难面试

回复「温和」「严格」或「压力」选择风格，或者直接告诉我你想面试的岗位，我默认用温和模式开始～
`;

// fallback 预设回复
function getInterviewFallback(message?: string): string {
  const msgLower = (message || '').toLowerCase();

  if (msgLower.includes('前端') || msgLower.includes('react') || msgLower.includes('vue')) {
    return `很好的选择！前端开发是一个非常热门的岗位。

让我追问几个问题：

1. 您平时主要使用哪个前端框架？（React/Vue/Angular）
2. 您有没有做过性能优化方面的项目？
3. 如果让你优化一个首屏加载很慢的页面，你会从哪些方面入手？

请依次回答这些问题。`;
  }

  if (msgLower.includes('后端') || msgLower.includes('java') || msgLower.includes('python')) {
    return `后端开发是技术栈中非常重要的一环。

让我追问几个问题：

1. 您熟悉哪些后端语言？（Java/Go/Python/Node.js）
2. 您有没有接触过微服务架构？
3. 如何保证接口的高并发和高可用？

请依次回答这些问题。`;
  }

  if (msgLower.includes('产品') || msgLower.includes('pm')) {
    return `产品经理需要很强的综合能力。

让我追问几个问题：

1. 您有没有独立负责过产品从0到1的经验？
2. 如何处理需求优先级和开发资源的矛盾？
3. 您是通过什么方式了解用户需求的？

请依次回答这些问题。`;
  }

  return `感谢您的回答！

作为面试官，我还想了解一下：

1. 您对这个岗位最大的优势和劣势是什么？
2. 您为什么选择我们公司？
3. 您未来3-5年的职业规划是什么？

请认真思考后回答。`;
}

// SSE 流式响应头
const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
  'X-Accel-Buffering': 'no',
};

// POST：面试对话
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversationId, style: reqStyle, mode: reqMode } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: '消息内容不能为空' },
        { status: 400 }
      );
    }

    // 多风格支持：默认温和模式
    const style: InterviewStyle = (['warm', 'strict', 'pressure'].includes(reqStyle) ? reqStyle : 'warm') as InterviewStyle;

    // 检测是否切换风格
    const styleSwitch = detectStyleSwitch(message);
    const effectiveStyle = styleSwitch || style;

    // 检测是否触发本尊点评
    const isDebrief = reqMode === 'debrief' || detectDebriefIntent(message);

    // 1. 用户验证
    const userInfo = await getUserInfoFromRequest(request);
    const userId = userInfo?.userId || null;
    const userType = userInfo?.userType || 'free';

    // 获取用户个人信息上下文
    let userContext = '';
    if (userId) {
      userContext = await getUserProfileContext(userId);
    }

    const fallbackText = getInterviewFallback(message);

    // ===========================
    // DeepSeek + RAG 分支
    // ===========================
    if (USE_DEEPSEEK) {
      console.log('[interview] Using DeepSeek + RAG');
      try {
        // 提取关键词
        const keywords = extractKeywords(message);
        
        // 并行查询面试题库和JD数据
        const [questions, jds] = await Promise.all([
          querySupabase('interview_questions', [
            ...(keywords.industry ? [{ field: 'industry', operator: 'ilike' as const, value: `%${keywords.industry}%` }] : []),
            ...(keywords.jobTitle ? [{ field: 'job_title', operator: 'ilike' as const, value: `%${keywords.jobTitle}%` }] : []),
          ], 10),
          querySupabase('job_descriptions', [
            { field: 'status', operator: 'eq' as const, value: 'parsed' },
            ...(keywords.industry ? [{ field: 'industry', operator: 'ilike' as const, value: `%${keywords.industry}%` }] : []),
            ...(keywords.jobTitle ? [{ field: 'job_title', operator: 'ilike' as const, value: `%${keywords.jobTitle}%` }] : []),
          ], 3, PUBLIC_JD_FIELDS),
        ]);
        
        // 构建 RAG 上下文
        const ragContext = buildRAGContext([
          { tableName: 'interview_questions', displayName: '面试题库', data: questions },
          { tableName: 'job_descriptions', displayName: '岗位JD', data: jds },
        ]);
        
        // 风格切换提示（检测到切换时在回答前提示）
        const styleSwitchNotice = styleSwitch && styleSwitch !== style
          ? `好的，切换到【${INTERVIEW_STYLES[styleSwitch].name}】～\n\n`
          : '';
        
        // 构建系统提示词：面试模式 vs 本尊点评
        let systemPrompt: string;
        if (isDebrief) {
          systemPrompt = buildDebriefPrompt(effectiveStyle, ragContext);
        } else {
          systemPrompt = buildStylePrompt(effectiveStyle, ragContext);
        }
        
        // 构建 DeepSeek 消息
        const history = (body.history || []).filter((m: any) => m.role !== 'system');
        
        // 风格切换或本尊点评时，在前面加提示
        const effectiveMessage = styleSwitchNotice ? styleSwitchNotice + message : message;
        
        // 返回 DeepSeek SSE 流
        const stream = createDeepSeekRAGStream(systemPrompt, effectiveMessage, history);
        return new Response(stream, { headers: SSE_HEADERS });
      } catch (error) {
        console.error('[interview] DeepSeek error, falling back to Coze:', error);
        // 出错时回退到 Coze
      }
    }

    // ===========================
    // 优先尝试 stream_run API
    // ===========================
    const workflowConfig = getWorkflowConfig('interview');

    if (workflowConfig) {
      console.log('[interview] Using stream_run API');
      try {
        const workflowResponse = await callWorkflowStreamApi({
          botType: 'interview',
          message,
          userContext,
        });

        if (workflowResponse.ok) {
          const stream = createWorkflowSSEStream({
            workflowResponse,
            userId,
            botType: 'interview',
            fallbackText,
          });
          return new Response(stream, { headers: SSE_HEADERS });
        } else {
          console.log(`[interview] stream_run returned ${workflowResponse.status}, falling back`);
        }
      } catch (err) {
        console.error('[interview] stream_run error:', err);
      }
    }

    // ===========================
    // 回退到标准 Coze Bot API
    // ===========================
    const botId = process.env.COZE_BOT_INTERVIEW || '';
    const apiKey = process.env.COZE_API_TOKEN;

    if (!apiKey || !botId) {
      console.log('[interview] No Bot API configured, using fallback');
      return new Response(createTextStream(fallbackText), { headers: SSE_HEADERS });
    }

    const cozeResponse = await callCozeStreamApi({
      botId,
      message,
      userType,
      conversationId,
      userContext,
    });

    if (!cozeResponse.ok) {
      console.log('[interview] Coze API error:', cozeResponse.status);
      return new Response(createTextStream(fallbackText), { headers: SSE_HEADERS });
    }

    const contentType = cozeResponse.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const errorText = await cozeResponse.text();
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.code && errorData.code !== 0) {
          console.log('[interview] Coze API error:', errorData.code, errorData.msg);
          return new Response(createTextStream(fallbackText), { headers: SSE_HEADERS });
        }
      } catch { /* continue */ }
    }

    // 流式转发 + SSE 解析器
    const stream = createCozeSSEStream({
      cozeResponse,
      userId,
      botType: 'interview',
      fallbackText,
    });

    return new Response(stream, { headers: SSE_HEADERS });
  } catch (error) {
    console.error('模拟面试生成失败:', error);
    const fallback = getInterviewFallback();
    return new Response(createTextStream(fallback), { headers: SSE_HEADERS });
  }
}

// GET：获取面试开场白
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  const userInfo = await getUserInfoFromRequest(request);
  const userId = userInfo?.userId || null;
  const userType = userInfo?.userType || 'free';

  if (action === 'intro') {
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const chars = DEMO_INTERVIEW_INTRO.split('');
        let index = 0;

        const sendChar = () => {
          if (index < chars.length) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chars[index] })}\n\n`));
            index++;
            const delay = chars[index - 1] === '\n' ? 30 : 3;
            setTimeout(sendChar, delay);
          } else {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
            controller.close();
          }
        };

        sendChar();
      },
    });

    return new Response(stream, { headers: SSE_HEADERS });
  }

  if (action === 'styles') {
    return NextResponse.json({
      code: 200,
      data: {
        styles: Object.values(INTERVIEW_STYLES).map(s => ({
          id: s.id,
          name: s.name,
          emoji: s.emoji,
          description: s.description,
        })),
        defaultStyle: 'warm',
      },
    });
  }

  return NextResponse.json({
    code: 200,
    data: {
      sessionId: 'int_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 10),
      intro: DEMO_INTERVIEW_INTRO,
      userType,
      userId,
    },
  });
}
