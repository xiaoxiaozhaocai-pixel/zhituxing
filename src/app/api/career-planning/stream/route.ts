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
const CAREER_AGENT_TOKEN = process.env.CAREER_AGENT_TOKEN || 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjMxMWQwNzVjLTY2NDktNDdmYi04MWUxLTJmZDIyYTJmMTgxOSJ9.eyJpc3MiOiJodHRwczovL2FwaS5jb3plLmNuIiwiYXVkIjpbIkxudVM4eG9qNUtnUFNvVEszWHZ2VHZNMUZCNmxvSGIyIl0sImV4cCI6ODIxMDI2Njg3Njc5OSwiaWF0IjoxNzc2ODQyODI2LCJzdWIiOiJzcGlmZmU6Ly9hcGkuY296ZS5jbi93b3Jrb2xvYWRfaWRlbnRpdHkvaWQ6NzYzMTIwOTkxNzQyNDQwMjQ4MiIsInNyYyI6ImluYm91bmRfYXV0aF9hY2Nlc3NfdG9rZW5faWQ6NzYzMTQ4MTgzMzExMjk5NDAwMTgifQ.IiRCLJsbZcoFgcnobZYhQ9oKlfmzrGBjBqo0MCT83HcA01EKQB9Cxm-ICkE31yv7hZGsLj1Vv2VFoGQfyJTQ2gyMp47Xr3jKYUzKVC79aQS6aAot09HjOufpZu6lEGL9NZTZyBb4CyXnIs7LZcAksiq8ZIhMJVliIzs7JVUZOInue5aWxRm0B1qjVM2DGuSzyc2px_EUhSpbywooTxsJB1cOdfscMWqYSeah427zjzfY5HPFpsp7YIpxiLkiD-8m9NS3jpFVBYl8K4bhFBKuqqI68V-fhtAsvzdlX2CJdmmv6lkg2aqOBycWuZ1DlmzxFpJNOraLSlMxG_XrNG8arQ';
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

        // 获取流式响应
        const reader = response.body?.getReader();
        if (!reader) {
          controller.enqueue(`data: ${JSON.stringify({ error: '无法获取响应流' })}\n\n`);
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data:')) {
              const dataStr = line.slice(5).trim();
              if (dataStr) {
                try {
                  const data = JSON.parse(dataStr);
                  // 处理Coze API的响应格式
                  if (data.data) {
                    const parsed = JSON.parse(data.data);
                    if (parsed.content) {
                      controller.enqueue(`data: ${JSON.stringify({ content: parsed.content })}\n\n`);
                    }
                  }
                } catch (e) {
                  // 忽略解析错误
                }
              }
            }
          }
        }

        controller.close();
      } catch (error) {
        console.error('流式调用失败:', error);
        controller.enqueue(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : '流式调用失败' })}\n\n`);
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// 模拟数据流
async function streamDemoContent(major: string, grade: string, city: string): Promise<Response> {
  const demoReport = `
# 🎯 职业规划报告

**个人信息**
- 所属专业：${major || '计算机科学与技术'}
- 当前年级：${grade || '大三'}
- 意向城市：${city || '杭州'}

---

## 📊 精准匹配结论

根据您的【${major || '计算机'}】专业、【${grade || '大三'}】年级、【${city || '杭州'}】意向城市，我为您推荐以下最优赛道：

### 🚀 核心推荐岗位：前端开发工程师

1. **行业前景**：2024年互联网行业前端岗位需求同比增长18%，${city || '杭州'}地区平均月薪12-20K
2. **竞争分析**：相比后端岗位，竞争比低23%，更适合快速上岸
3. **技能匹配**：您所学的${major || '计算机'}专业与前端技能重合度达75%

---

## 🎯 核心优势

- ✅ 扎实的编程基础
- ✅ 良好的逻辑思维能力
- ✅ 年轻有活力，学习能力强

## ⚠️ 核心短板

- 缺乏大型项目实战经验
- 前端框架使用经验不足

---

## 📅 行动清单（6个月）

### 第一个月：夯实基础
- 完成 React 官方文档学习
- 完成 TodoList 项目实战
- 学习 TypeScript 基础

### 第二个月：框架进阶
- 完成电商项目前端开发
- 学习状态管理（Redux/Zustand）
- 掌握单元测试基础

---

*本报告由职途星AI职业规划助手生成，仅供参考*
`;

  const stream = new ReadableStream({
    async start(controller) {
      const lines = demoReport.split('\n');
      for (let i = 0; i < lines.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 50));
        controller.enqueue(`data: ${JSON.stringify({ content: lines[i] + (i < lines.length - 1 ? '\n' : '') })}\n\n`);
      }
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
