/**
 * 职搭子AI智能体流式API
 * 调用Coze平台职搭子智能体，通过SSE协议返回流式响应
 * 
 * 环境变量配置：
 * - PARTNER_AGENT_API: API地址
 * - PARTNER_AGENT_TOKEN: 认证Token
 * - PARTNER_AGENT_PROJECT_ID: 项目ID
 */

import { NextRequest, NextResponse } from 'next/server';

// 职搭子智能体API配置
const PARTNER_AGENT_API = process.env.PARTNER_AGENT_API || 'https://mgjw28qt93.coze.site/stream_run';
const PARTNER_AGENT_TOKEN = process.env.PARTNER_AGENT_TOKEN || '';
const PROJECT_ID = process.env.PARTNER_AGENT_PROJECT_ID || '7629654356933050409';

// 模拟职搭子回复
const DEMO_RESPONSES: Record<string, string> = {
  greeting: `嗨！你好呀！我是你的职搭子~ 🤝

很高兴认识你！我可以帮你：
• 解答求职疑惑（简历、面试、职场人际等）
• 分享行业动态和求职技巧
• 聊聊职业规划和发展方向
• 提供心理支持和鼓励

不管你是刚入学的新生，还是即将毕业的应届生，又或者是在职场中迷茫的打工人，我都在这里陪着你！

有什么想问的，尽管说~`,

  resume: `关于简历，我来给你几点建议：

1. **突出核心优势**
   - 把最匹配的技能和经验放在最显眼的位置
   - 用数据说话！比如"提升性能30%"

2. **量身定制**
   - 不要用一份简历投所有岗位
   - 根据JD关键词调整简历内容

3. **简洁有力**
   - 最好控制在一页以内
   - 使用简洁的模板，避免花哨

4. **项目经验**
   - 用STAR法则描述：背景+目标+行动+结果
   - 突出你在团队中的贡献

需要我帮你优化简历吗？可以告诉我你的专业、目标岗位，我来给你具体建议！`,

  interview: `面试技巧来啦！🌟

**面试前准备：**
• 研究公司背景和岗位要求
• 准备3-5个自己的亮点故事
• 练习STAR法则回答法

**常见问题应对：**
1. 自我介绍 → 控制在2分钟内，突出与岗位的匹配度
2. 优缺点 → 缺点要说不影响工作的，并且展示改进措施
3. 为什么选我们 → 提前调研，表达真诚兴趣
4. 期望薪资 → 可以给一个范围，表示可以协商

**面试后：**
• 发感谢信，表达诚意
• 复盘表现，总结经验

有什么具体问题吗？或者想模拟一下面试？`,

  career: `职业规划是很重要的事！让我帮你分析分析~ 📊

**自我认知：**
• 你的专业是什么？
• 你对什么行业/岗位感兴趣？
• 你的性格是怎样的？（外向/内向、分析型/创意型）

**职业方向探索：**
• 可以做职业测评（如MBTI、霍兰德）
• 找学长学姐了解真实工作情况
• 尝试实习，体验不同岗位

**长期发展：**
• 确定一个方向后，制定3-5年规划
• 每年给自己设定小目标
• 持续学习，提升核心竞争力

你现在处于什么阶段呢？是大一新生还是即将毕业？我们可以一起聊聊~`,

  default: `嗯嗯，你说的这个问题很有代表性！让我帮你分析一下：

一般来说，这种情况需要考虑几个方面：

1. **明确目标**
   - 你的长期职业目标是什么？
   - 这份工作/机会是否能帮助你接近目标？

2. **权衡利弊**
   - 列出所有优缺点
   - 不要只看眼前利益

3. **信息收集**
   - 多了解行业情况
   - 向前辈请教经验

4. **相信自己**
   - 没有完美的选择
   - 重要的是在选择后全力以赴

你愿意说说具体是什么困惑吗？我可以给你更针对性的建议！💪`
};

// 生成会话ID
function generateSessionId(): string {
  return 'pt_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
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

// 流式对话
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, sessionId } = body;

    // 检查是否配置了Token
    const useRealApi = !!PARTNER_AGENT_TOKEN;

    if (useRealApi) {
      // 调用真实API
      const sid = sessionId || generateSessionId();
      const requestBody = buildRequestBody(message, sid);
      return await callRealApi(requestBody);
    } else {
      // 使用模拟数据
      return await streamDemoResponse(message);
    }
  } catch (error) {
    console.error('职搭子生成失败:', error);
    return NextResponse.json(
      { code: 500, message: '生成失败', error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

// 调用真实API
async function callRealApi(requestBody: object): Promise<Response> {
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await fetch(PARTNER_AGENT_API, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
            'Authorization': `Bearer ${PARTNER_AGENT_TOKEN}`
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

// 流式输出模拟回复
async function streamDemoResponse(message: string): Promise<Response> {
  const lowerMessage = (message || '').toLowerCase();
  
  let responseKey = 'default';
  
  if (lowerMessage.includes('你好') || lowerMessage.includes('hi') || lowerMessage.includes('hello') || lowerMessage.includes('初次')) {
    responseKey = 'greeting';
  } else if (lowerMessage.includes('简历') || lowerMessage.includes('cv')) {
    responseKey = 'resume';
  } else if (lowerMessage.includes('面试')) {
    responseKey = 'interview';
  } else if (lowerMessage.includes('职业规划') || lowerMessage.includes('发展') || lowerMessage.includes('方向')) {
    responseKey = 'career';
  }

  const responseText = DEMO_RESPONSES[responseKey];

  const stream = new ReadableStream({
    async start(controller) {
      const chars = responseText.split('');
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
