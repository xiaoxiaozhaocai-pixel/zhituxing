/**
 * 职业规划AI智能体流式API
 * 调用Coze平台职业规划智能体，通过SSE协议返回流式响应
 * 
 * 环境变量配置：
 * - CAREER_AGENT_TOKEN: 认证Token
 * - CAREER_AGENT_PROJECT_ID: 项目ID（可选）
 */

import { NextRequest, NextResponse } from 'next/server';

// 职业规划智能体API配置
const CAREER_AGENT_API = process.env.CAREER_AGENT_API || 'https://7xwsb63bkk.coze.site/stream_run';
const CAREER_AGENT_TOKEN = process.env.CAREER_AGENT_TOKEN || '';
const PROJECT_ID = process.env.CAREER_AGENT_PROJECT_ID || '7631200707550609418';

// 模拟职业规划内容（用于演示）
const DEMO_PLAN = `
【职业规划报告】

一、职业方向推荐

基于您的专业背景和年级，我为您推荐以下职业方向：

1. 前端开发工程师
   - 匹配度：92%
   - 行业：互联网/IT
   - 薪资范围：15K-30K
   - 核心技能：React/Vue、TypeScript、前端工程化

2. 后端开发工程师
   - 匹配度：88%
   - 行业：互联网/IT
   - 薪资范围：18K-35K
   - 核心技能：Java/Python、数据库、微服务

3. 全栈工程师
   - 匹配度：85%
   - 行业：互联网/IT
   - 薪资范围：20K-40K
   - 核心技能：前端+后端+DevOps

4. 技术产品经理
   - 匹配度：80%
   - 行业：互联网
   - 薪资范围：25K-45K
   - 核心技能：技术背景、产品思维、沟通协调

二、核心竞争力分析

您的专业背景为您奠定了扎实的技术基础，结合当前阶段的学习，您应该重点培养以下能力：

• 编程基础：数据结构、算法、设计模式
• 前端技能：主流框架、组件化开发、性能优化
• 工程能力：Git协作、自动化测试、CI/CD
• 软技能：技术文档、技术分享、团队协作

三、各年级行动计划

【当前阶段 - 夯实基础】
• 深入学习一门主流前端框架（React或Vue）
• 完成2-3个完整项目，积累项目经验
• 学习TypeScript，提升代码质量
• 准备面试，每日刷题1-2道

【下一阶段 - 项目实战】
• 参与开源项目，积累开源贡献经验
• 完成一个全栈项目，展示端到端能力
• 学习前端工程化：Webpack/Vite、CI/CD
• 准备实习或校招面试

【冲刺阶段 - 就业准备】
• 系统复习计算机基础知识
• 准备简历和面试作品集
• 参加校招宣讲会，了解企业需求
• 拿到心仪offer！

四、技能提升路径

第一阶段（1-3个月）：
• 精通React/Vue框架核心原理
• 掌握TypeScript高级特性
• 学习前端工程化工具链

第二阶段（4-6个月）：
• 学习Node.js后端开发
• 掌握数据库设计与优化
• 完成全栈项目实战

第三阶段（7-12个月）：
• 学习微服务架构
• 了解容器化技术Docker/K8s
• 准备高级工程师面试

五、求职准备建议

1. 简历优化
   • 突出项目经验和个人贡献
   • 量化成果（如：性能提升50%）
   • 展示技术深度和广度

2. 面试准备
   • 系统复习前端核心知识点
   • 练习算法和数据结构
   • 准备项目讲解和系统设计

3. 求职渠道
   • 实习僧、Boss直聘、拉勾网
   • 目标公司官网招聘页
   • 学长学姐内推

祝您求职顺利，早日拿到心仪的offer！
`;

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
async function callRealApi(requestBody: any): Promise<Response> {
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await fetch(CAREER_AGENT_API, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
            'Authorization': `Bearer ${CAREER_AGENT_TOKEN}`
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

// 流式输出演示内容
async function streamDemoContent(major: string, grade: string, city: string): Promise<Response> {
  // 根据用户输入调整内容
  let content = DEMO_PLAN;
  
  if (major) {
    content = content.replace(/计算机科学与技术/g, major);
  }
  if (grade) {
    content = content.replace(/大三/g, grade);
  }
  if (city) {
    content = content.replace(/北京/g, city);
  }

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
