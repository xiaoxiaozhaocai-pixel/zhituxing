/**
 * 职业规划AI智能体流式API
 * 调用Coze平台职业规划智能体，通过SSE协议返回流式响应
 * 
 * 环境变量配置：
 * - CAREER_AGENT_API: API地址（可选）
 * - CAREER_AGENT_TOKEN: 认证Token（必填）
 * - CAREER_AGENT_PROJECT_ID: 项目ID（可选）
 */

import { NextRequest, NextResponse } from 'next/server';

// 职业规划智能体API配置
const CAREER_AGENT_API = process.env.CAREER_AGENT_API || 'https://7xwsb63bkk.coze.site/stream_run';
const CAREER_AGENT_TOKEN = process.env.CAREER_AGENT_TOKEN || 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjNiYjBlZTQ5LTU1MWMtNGJlNi1iYjljLWFkNGRkYTBiMWNlZCJ9.eyJpc3MiOiJodHRwczovL2FwaS5jb3plLmNuIiwiYXVkIjpbIkxudVM4eG9qNUtnUFNvVEszWHZ2VHZNMUZCNmxvSGIyIl0sImV4cCI6ODIxMDI2Njg3Njc5OSwiaWF0IjoxNzc2NzgyMzA5LCJzdWIiOiJzcGlmZmU6Ly9hcGkuY296ZS5jbi93b3JrbG9hZF9pZGVudGl0eS9pZDo3NjMxMjA5OTE3NDI0NDAyNDgyIiwic3JjIjoiaW5ib3VuZF9hdXRoX2FjY2Vzc190b2tlbl9pZDo3NjMxMjIxOTA5OTcxMDA5NTYyIn0.MIyP55GMHeOT7jB_XBPD0i-BhSJSc0wJNdEPe2n4oqG_6Hf46If6Dyr6TSWQFEVN5BS5j4OSV19wTAyz2haf6XztQXSUgX7lv7t046--CZI_JjsnhXmYh4tKUi8us-5_kC_-p7pO9gdGLUiI4Yf1PT46IBVuLtqkCQDv_vVzqB68oTBz563TZC95rKVmeXR2-TGM21Uy_Tjfy-15qAGdSMSCOmy7kl-ZcHtoD2p_79zYFjymE0pCagfg2jtRUL5go-8JS1IG6XqNG8oPLnNbZk0ahYh06nivj138-Fy-PjZ-gkFC78T80o1OwRg-Ooz8p5zp-xVJBAPSE-ntECf-og';
const PROJECT_ID = process.env.CAREER_AGENT_PROJECT_ID || '7631200707550609418';

// 生成会话ID
function generateSessionId(): string {
  return 'cp_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

// 构建请求体
function buildRequestBody(major: string, grade: string, city: string) {
  const queryContent = `
请根据以下信息，为我生成一份专属的职业规划报告：

【基本信息】
- 所属专业：${major || '未填写'}
- 当前年级：${grade || '未填写'}
- 意向城市：${city || '未填写'}

请生成一份详细的职业规划报告。
`.trim();

  return {
    content: {
      query: {
        prompt: [
          {
            type: 'text',
            content: {
              text: queryContent
            }
          }
        ]
      }
    },
    type: 'query',
    session_id: generateSessionId(),
    project_id: PROJECT_ID
  };
}

// 流式生成职业规划
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { major, grade, city } = body;

    // 检查是否配置了Token
    const useRealApi = !!CAREER_AGENT_TOKEN;

    if (useRealApi) {
      // 调用真实API
      const requestBody = buildRequestBody(major, grade, city);
      return await callRealApi(requestBody);
    } else {
      // 使用模拟数据
      return await streamDemoContent(major, grade, city);
    }
  } catch (error) {
    console.error('职业规划生成失败:', error);
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
        const response = await fetch(CAREER_AGENT_API, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CAREER_AGENT_TOKEN}`
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errorText = await response.text();
          controller.enqueue(`data: ${JSON.stringify({ error: `API请求失败: ${response.status}`, details: errorText })}\n\n`);
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
        let isDone = false;

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            if (!isDone) {
              controller.enqueue(`data: ${JSON.stringify({ done: true })}\n\n`);
            }
            break;
          }

          // 解码数据
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // 按双换行分割SSE消息
          const messages = buffer.split(/\r?\n\r?\n/);
          buffer = messages.pop() || '';

          for (const message of messages) {
            if (!message.trim()) continue;
            
            const lines = message.split(/\r?\n/);
            let eventType = '';
            let dataStr = '';

            for (const line of lines) {
              if (line.startsWith('event:')) {
                eventType = line.slice(6).trim();
              } else if (line.startsWith('data:')) {
                dataStr = line.slice(5).trim();
              }
            }

            if (dataStr && dataStr !== '[DONE]') {
              try {
                const parsed = JSON.parse(dataStr);
                
                // 提取content.answer中的内容
                let answer = '';
                if (parsed.content?.answer) {
                  answer = parsed.content.answer;
                }
                
                // 检查是否结束
                if (parsed.finish === true || eventType === 'message_end' || parsed.type === 'message_end') {
                  isDone = true;
                } else if (answer) {
                  // 发送提取的内容
                  controller.enqueue(`data: ${JSON.stringify({ content: answer })}\n\n`);
                }
              } catch (e) {
                // 非JSON数据，忽略
              }
            }
          }
        }
        
        // 确保发送完成信号
        if (!isDone) {
          try {
            controller.enqueue(`data: ${JSON.stringify({ done: true })}\n\n`);
          } catch (e) {
            // 忽略，可能已经关闭
          }
        }
      } catch (error) {
        console.error('流式请求错误:', error);
        try {
          controller.enqueue(`data: ${JSON.stringify({ error: '服务暂时不可用' })}\n\n`);
        } catch (e) {
          // 忽略
        }
      } finally {
        // 确保关闭
        try {
          controller.close();
        } catch (e) {
          // 忽略
        }
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

// 流式输出演示内容
async function streamDemoContent(major: string, grade: string, city: string): Promise<Response> {
  const demoReport = `{
  "basic_version": {
    "core_conclusion": {
      "top_jobs": [
        {"job_name":"前端开发工程师","match_score":92,"industry":"互联网/IT","city":"北京","salary_range":"18-30K","match_reason":"计算机专业对口，北京互联网企业需求旺盛"},
        {"job_name":"Java开发工程师","match_score":90,"industry":"互联网/软件","city":"北京","salary_range":"18-28K","match_reason":"技术栈匹配，岗位需求量大"},
        {"job_name":"算法工程师","match_score":85,"industry":"人工智能","city":"北京","salary_range":"25-40K","match_reason":"专业背景契合，AI领域发展前景好"}
      ],
      "skill_gaps": ["大型项目经验","分布式系统设计","团队协作能力"],
      "suggested_learning": ["Spring Cloud微服务","Kubernetes容器化","系统设计思维"]
    }
  }
}`;

  // 根据用户输入调整内容
  let content = demoReport;
  if (major) content = content.replace(/计算机/g, major);
  if (grade) content = content.replace(/大三/g, grade);
  if (city) content = content.replace(/北京/g, city);

  const stream = new ReadableStream({
    async start(controller) {
      // 模拟打字机效果，逐字符输出
      const chars = content.split('');
      let index = 0;
      
      const sendChar = () => {
        if (index < chars.length) {
          controller.enqueue(`data: ${JSON.stringify({ content: chars[index] })}\n\n`);
          index++;
          // 控制打字速度
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
