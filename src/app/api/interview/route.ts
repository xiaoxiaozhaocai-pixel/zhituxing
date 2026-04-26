/**
 * 模拟面试AI智能体流式API
 * 调用Coze平台模拟面试官智能体，通过SSE协议返回流式响应
 * 
 * 环境变量配置：
 * - INTERVIEW_AGENT_API: API地址
 * - INTERVIEW_AGENT_TOKEN: 认证Token
 * - INTERVIEW_AGENT_PROJECT_ID: 项目ID
 */

import { NextRequest, NextResponse } from 'next/server';

// 模拟面试智能体API配置
const INTERVIEW_AGENT_API = process.env.INTERVIEW_AGENT_API || 'https://cgctvf5zv2.coze.site/stream_run';
const INTERVIEW_AGENT_TOKEN = process.env.INTERVIEW_AGENT_TOKEN || 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjMxMWQwNzVjLTY2NDktNDdmYi04MWUxLTJmZDIyYTJmMTgxOSJ9.eyJpc3MiOiJodHRwczovL2FwaS5jb3plLmNuIiwiYXVkIjpbIkZXRXNDQTIwbnpLTU5uOWlLV3JXUkdXY0k5V3pwb1F0Il0sImV4cCI6ODIxMDI2Njg3Njc5OSwiaWF0IjoxNzc2ODQyNzQwLCJzdWIiOiJzcGlmZmU6Ly9hcGkuY296ZS5jbi93b3JrbG9hZF9pZGVudGl0eS9pZDo3NjMxMzgwMDM5MTc0NDU1MzQ3Iiwic3JjIjoiaW5ib3VuZF9hdXRoX2FjY2Vzc190b2tlbl9pZDo3NjMxNDgxNDU5NTU0OTEwMjQzIn0.GAT0R8QUHg_SjqBD-Y67nRg-EdZLdr1GA6apQ9oM3MyT-2_Yr2jpN8leT2C1I14GbRWSFz8cKGmDZBSY9HfeVS6w0KMRzWeeV-qVRAvVl-Yb3CJrINZwG-NNfJvaNCTn9R-mOK6Um-ddxRDl7j_eDV8JjkzJiBJqaXdH-132hU0oMKDwCCdlisvIQalczRjQJJ54UC-72V3xX2-__M_kJoXOsY-9IzZdbdAH3EnKFGqSuO9iytygDoKAjV0xnLhoazjyy88jFfKBV33vGCN8Ae3E9pRCsFmJR0H7aGwrNraGc4de0xEJ6zCTk6HUeONzcAdM-Nyo8DNMs26zyQpLEw';
const PROJECT_ID = process.env.INTERVIEW_AGENT_PROJECT_ID || '7631320202852204571';

// 模拟面试官的开场白
const DEMO_INTERVIEW_INTRO = `👋你好！我是职途星AI面试官，将为你还原真实的企业校招全流程面试。

【面试模式选择】我们提供两种面试模式，请选择:
1. 文字面试：纯文字对话形式
2. 视频面试：AI面试官以视频形象出现，配合语音提问

请你提供以下信息:
1. 面试模式
2. 你应聘的岗位全称
3. 该岗位的完整官方JD
4. 你的个人求职简历
`;

// 模拟面试回答
const DEMO_ANSWERS: Record<string, string> = {
  frontend: `很好的选择！前端开发是一个非常热门的岗位。

让我追问几个问题：

1. 您平时主要使用哪个前端框架？（React/Vue/Angular）
2. 您有没有做过性能优化方面的项目？
3. 如果让你优化一个首屏加载很慢的页面，你会从哪些方面入手？

请依次回答这些问题。`,

  backend: `后端开发是技术栈中非常重要的一环。

让我追问几个问题：

1. 您熟悉哪些后端语言？（Java/Go/Python/Node.js）
2. 您有没有接触过微服务架构？
3. 如何保证接口的高并发和高可用？

请依次回答这些问题。`,

  product: `产品经理需要很强的综合能力。

让我追问几个问题：

1. 您有没有独立负责过产品从0到1的经验？
2. 如何处理需求优先级和开发资源的矛盾？
3. 您是通过什么方式了解用户需求的？

请依次回答这些问题。`,

  default: `感谢您的回答！

作为面试官，我还想了解一下：

1. 您对这个岗位最大的优势和劣势是什么？
2. 您为什么选择我们公司？
3. 您未来3-5年的职业规划是什么？

请认真思考后回答。`
};

// 生成会话ID
function generateSessionId(): string {
  return 'int_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

// 构建请求体
function buildRequestBody(userMessage: string, sessionId: string) {
  return {
    content: {
      query: {
        prompt: [
          {
            type: 'text',
            content: {
              text: userMessage
            }
          }
        ]
      }
    },
    type: 'query',
    session_id: sessionId,
    project_id: PROJECT_ID
  };
}

// 流式生成面试对话
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, sessionId, jobType, userProfile } = body;

    // 检查是否配置了Token
    const useRealApi = !!INTERVIEW_AGENT_TOKEN;

    if (useRealApi) {
      // 调用真实API
      const sid = sessionId || generateSessionId();
      const requestBody = buildRequestBody(message, sid);
      return await callRealApi(requestBody);
    } else {
      // 使用模拟数据
      return await streamDemoResponse(message, jobType);
    }
  } catch (error) {
    console.error('模拟面试生成失败:', error);
    return NextResponse.json(
      { code: 500, message: '生成失败', error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

// 获取面试开场白
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  if (action === 'intro') {
    return await streamDemoIntro();
  }

  return NextResponse.json({
    code: 200,
    data: {
      sessionId: generateSessionId(),
      intro: DEMO_INTERVIEW_INTRO
    }
  });
}

// 调用真实API
async function callRealApi(requestBody: object): Promise<Response> {
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await fetch(INTERVIEW_AGENT_API, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
            'Authorization': `Bearer ${INTERVIEW_AGENT_TOKEN}`
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          controller.enqueue(`data: ${JSON.stringify({ error: `API请求失败: ${response.status}` })}\n\n`);
          controller.close();
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          controller.enqueue(`data: ${JSON.stringify({ error: '无法读取响应流' })}\n\n`);
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            controller.enqueue(`data: ${JSON.stringify({ done: true })}\n\n`);
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data && data !== '[DONE]') {
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.content || parsed.text || parsed.message?.content || '';
                  if (content) {
                    controller.enqueue(`data: ${JSON.stringify({ content })}\n\n`);
                  }
                } catch (e) {
                  if (data) {
                    controller.enqueue(`data: ${JSON.stringify({ content: data })}\n\n`);
                  }
                }
              }
            }
          }
        }

        controller.close();
      } catch (error) {
        console.error('流式请求错误:', error);
        controller.enqueue(`data: ${JSON.stringify({ error: '服务暂时不可用' })}\n\n`);
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
}

// 流式输出面试开场白
async function streamDemoIntro(): Promise<Response> {
  const stream = new ReadableStream({
    async start(controller) {
      const chars = DEMO_INTERVIEW_INTRO.split('');
      let index = 0;
      
      const sendChar = () => {
        if (index < chars.length) {
          controller.enqueue(`data: ${JSON.stringify({ content: chars[index] })}\n\n`);
          index++;
          const delay = chars[index - 1] === '\n' ? 30 : 3;
          setTimeout(sendChar, delay);
        } else {
          controller.enqueue(`data: ${JSON.stringify({ done: true })}\n\n`);
          controller.close();
        }
      };
      
      sendChar();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
}

// 流式输出模拟回答
async function streamDemoResponse(message: string, jobType?: string): Promise<Response> {
  // 根据消息内容判断岗位类型
  let answerKey = 'default';
  const lowerMessage = (message || '').toLowerCase();
  
  if (lowerMessage.includes('前端') || lowerMessage.includes('react') || lowerMessage.includes('vue')) {
    answerKey = 'frontend';
  } else if (lowerMessage.includes('后端') || lowerMessage.includes('java') || lowerMessage.includes('python')) {
    answerKey = 'backend';
  } else if (lowerMessage.includes('产品') || lowerMessage.includes('pm')) {
    answerKey = 'product';
  }

  const answer = jobType ? DEMO_ANSWERS[jobType] || DEMO_ANSWERS.default : DEMO_ANSWERS[answerKey];

  const stream = new ReadableStream({
    async start(controller) {
      const chars = answer.split('');
      let index = 0;
      
      const sendChar = () => {
        if (index < chars.length) {
          controller.enqueue(`data: ${JSON.stringify({ content: chars[index] })}\n\n`);
          index++;
          const delay = chars[index - 1] === '\n' ? 30 : 3;
          setTimeout(sendChar, delay);
        } else {
          controller.enqueue(`data: ${JSON.stringify({ done: true })}\n\n`);
          controller.close();
        }
      };
      
      sendChar();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
}
