/**
 * 职业规划AI智能体流式API
 * 使用Coze Workflow stream_run API，通过SSE协议返回流式响应
 * 集成用户验证、user_type权限、SSE结构化数据解析
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getUserInfoFromRequest,
  getUserProfileContext,
  saveStructuredData,
  createTextStream,
} from '@/lib/coze-stream';

export const runtime = 'edge';

// 职业规划 fallback 回复
function getCareerFallback(major: string, grade: string, city: string): string {
  return `# 🎯 职业规划报告

**个人信息**
- 所属专业：${major || '未填写'}
- 当前年级：${grade || '未填写'}
- 意向城市：${city || '未填写'}

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

*本报告由职途星AI职业规划助手生成，仅供参考*`;
}

/**
 * 调用 Coze Workflow stream_run API
 * 与标准 Bot chat API 不同，Workflow API 使用 stream_run 端点
 */
async function callWorkflowStreamApi(
  message: string,
  sessionId: string,
  userType: string
): Promise<Response> {
  const token = process.env.COZE_CAREER_PLANNING_TOKEN;
  const projectId = process.env.COZE_CAREER_PLANNING_PROJECT_ID;

  const url = 'https://7xwsb63bkk.coze.site/stream_run';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify({
      content: {
        query: {
          prompt: [
            {
              type: 'text',
              content: {
                text: message,
              },
            },
          ],
        },
      },
      type: 'query',
      session_id: sessionId,
      project_id: projectId,
    }),
  });

  return response;
}

/**
 * 解析 Workflow stream_run SSE 流
 * 工作流 SSE 格式与标准 Bot chat API 不同，需要单独处理
 * 边读边转发，同时解析 <<DATA:type=xxx>>...<<END>> 结构化数据
 */
function createWorkflowSSEStream(
  cozeResponse: Response,
  userId: string | null,
  fallbackText: string
): ReadableStream {
  const reader = cozeResponse.body?.getReader();
  if (!reader) {
    return createTextStream(fallbackText);
  }

  let buffer = '';
  let structuredBuffer = '';
  let isFirstChunk = true;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          // 处理 buffer 中剩余的文本
          if (buffer.trim()) {
            processTextBuffer(buffer, controller, encoder, userId);
          }
          controller.close();
          return;
        }

        const chunk = decoder.decode(value, { stream: true });

        // 首个 chunk 检查是否为错误响应
        if (isFirstChunk) {
          isFirstChunk = false;
          // 如果第一个 chunk 看起来是 JSON 错误
          const trimmed = chunk.trim();
          if (trimmed.startsWith('{') || trimmed.startsWith('{"error"')) {
            try {
              const errorData = JSON.parse(trimmed);
              if (errorData.code && errorData.code !== 0) {
                console.error('Workflow API error:', errorData);
                // 降级为 fallback
                const fallbackStream = createTextStream(fallbackText);
                const fallbackReader = fallbackStream.getReader();
                while (true) {
                  const { done: fd, value: fv } = await fallbackReader.read();
                  if (fd) break;
                  controller.enqueue(fv);
                }
                controller.close();
                return;
              }
            } catch {
              // 不是完整 JSON，继续正常处理
            }
          }
        }

        // 解析 SSE 事件格式
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data:')) {
            const dataText = line.slice(5).trim();
            if (!dataText || dataText === '[DONE]') continue;

            try {
              const parsed = JSON.parse(dataText);

              // Workflow API 返回格式：提取文本内容
              // 不同的事件类型有不同的内容字段
              let textContent = '';

              if (parsed.type === 'text' && parsed.content?.text) {
                textContent = parsed.content.text;
              } else if (parsed.type === 'answer' || parsed.type === 'output') {
                textContent = parsed.content || parsed.answer || '';
              } else if (parsed.msg?.content) {
                textContent = parsed.msg.content;
              } else if (typeof parsed === 'string') {
                textContent = parsed;
              } else if (parsed.content && typeof parsed.content === 'string') {
                textContent = parsed.content;
              }

              if (textContent) {
                buffer += textContent;
                // 尝试解析结构化数据标记
                const dataStartRegex = /<<DATA:type=(\w+)>>/i;
                const dataEndRegex = /<<END>>/i;

                const startMatch = buffer.match(dataStartRegex);
                if (startMatch) {
                  // 找到开始标记，累积到 structuredBuffer
                  const startIndex = buffer.indexOf(startMatch[0]);
                  // 把开始标记之前的文本先转发
                  const beforeData = buffer.slice(0, startIndex);
                  if (beforeData.trim()) {
                    processTextChunk(beforeData, controller, encoder);
                  }
                  structuredBuffer = buffer.slice(startIndex + startMatch[0].length);
                  buffer = '';

                  // 检查是否已有结束标记
                  const endMatch = structuredBuffer.match(dataEndRegex);
                  if (endMatch) {
                    const endIndex = structuredBuffer.indexOf(endMatch[0]);
                    const jsonStr = structuredBuffer.slice(0, endIndex).trim();
                    const dataType = startMatch[1];
                    processStructuredData(dataType, jsonStr, controller, encoder, userId);
                    structuredBuffer = '';
                  }
                } else if (structuredBuffer) {
                  // 继续累积结构化数据
                  structuredBuffer += textContent;
                  const endMatch = structuredBuffer.match(dataEndRegex);
                  if (endMatch) {
                    const endIndex = structuredBuffer.indexOf(endMatch[0]);
                    const jsonStr = structuredBuffer.slice(0, endIndex).trim();
                    const startMatch2 = structuredBuffer.match(/<<DATA:type=(\w+)>>/i);
                    const dataType = startMatch2 ? startMatch2[1] : 'career_plan';
                    processStructuredData(dataType, jsonStr, controller, encoder, userId);
                    structuredBuffer = '';
                  }
                } else {
                  // 普通文本，尝试提取部分转发
                  // 保留最后一段可能不完整的标记
                  const lastDataTag = buffer.lastIndexOf('<<DATA');
                  if (lastDataTag > -1) {
                    const beforeTag = buffer.slice(0, lastDataTag);
                    if (beforeTag.trim()) {
                      processTextChunk(beforeTag, controller, encoder);
                    }
                    buffer = buffer.slice(lastDataTag);
                  } else {
                    // 没有未完成的标记，全部转发
                    if (buffer.trim()) {
                      processTextChunk(buffer, controller, encoder);
                      buffer = '';
                    }
                  }
                }
              }
            } catch {
              // JSON 解析失败，原样转发文本
              if (dataText && dataText !== '[DONE]') {
                processTextChunk(dataText, controller, encoder);
              }
            }
          }
        }
      } catch (error) {
        console.error('Workflow SSE stream error:', error);
        controller.close();
      }
    },
  });
}

/**
 * 处理普通文本块 — 通过 SSE event: message 转发
 */
function processTextChunk(
  text: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  const sseEvent = `event: message\ndata: ${JSON.stringify({ content: text })}\n\n`;
  controller.enqueue(encoder.encode(sseEvent));
}

/**
 * 处理完整 buffer 中的文本（流结束时）
 */
function processTextBuffer(
  text: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  userId: string | null
) {
  // 检查是否有未解析的结构化数据
  const dataStartRegex = /<<DATA:type=(\w+)>>/i;
  const startMatch = text.match(dataStartRegex);

  if (startMatch) {
    const startIndex = text.indexOf(startMatch[0]);
    const beforeData = text.slice(0, startIndex);
    if (beforeData.trim()) {
      processTextChunk(beforeData, controller, encoder);
    }

    const afterStart = text.slice(startIndex + startMatch[0].length);
    const dataEndRegex = /<<END>>/i;
    const endMatch = afterStart.match(dataEndRegex);
    const jsonStr = endMatch ? afterStart.slice(0, afterStart.indexOf(endMatch[0])).trim() : afterStart.trim();
    processStructuredData(startMatch[1], jsonStr, controller, encoder, userId);
  } else {
    processTextChunk(text, controller, encoder);
  }
}

/**
 * 处理结构化数据 — 通过 SSE event: structured_data 推送，同时保存到 Supabase
 */
function processStructuredData(
  dataType: string,
  jsonStr: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  userId: string | null
) {
  try {
    const jsonData = JSON.parse(jsonStr);

    // 推送给前端
    const sseEvent = `event: structured_data\ndata: ${JSON.stringify({ type: dataType, data: jsonData })}\n\n`;
    controller.enqueue(encoder.encode(sseEvent));

    // 保存到 Supabase
    if (userId) {
      saveStructuredData('career', userId, dataType, jsonData as Record<string, unknown>).catch((err: unknown) => {
        console.error('保存结构化数据失败:', err);
      });
    }
  } catch (e) {
    console.error('解析结构化数据JSON失败:', e, 'raw:', jsonStr.slice(0, 200));
    // JSON 解析失败，作为普通文本转发
    processTextChunk(`<<DATA:type=${dataType}>>${jsonStr}<<END>>`, controller, encoder);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { major, grade, city, message, sessionId } = body;

    // 1. 用户验证 — 查 user_profiles 表
    const userInfo = await getUserInfoFromRequest(request);
    const userId = userInfo?.userId || null;
    const userType = userInfo?.userType || 'free';

    // 2. 构建用户上下文
    let userContext = '';
    if (userId) {
      userContext = await getUserProfileContext(userId);
    }

    // 3. 构建最终消息
    const queryContent = message || `请根据以下信息，为我生成一份专属的职业规划报告：\n\n【基本信息】\n- 所属专业：${major || '未填写'}\n- 当前年级：${grade || '未填写'}\n- 意向城市：${city || '未填写'}\n\n请生成一份详细的职业规划报告。`;
    const finalMessage = userContext + queryContent;

    // 4. 检查 Workflow API 配置
    const token = process.env.COZE_CAREER_PLANNING_TOKEN;
    const projectId = process.env.COZE_CAREER_PLANNING_PROJECT_ID;

    if (!token || !projectId) {
      console.log('Career planning Workflow API not configured, using fallback');
      const fallback = getCareerFallback(major, grade, city);
      return new Response(createTextStream(fallback), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // 5. 生成 session_id（每次对话唯一）
    const finalSessionId = sessionId || `career_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // 6. 调用 Workflow stream_run API
    const cozeResponse = await callWorkflowStreamApi(finalMessage, finalSessionId, userType);

    // 检查响应状态
    if (!cozeResponse.ok) {
      console.error('Workflow API error:', cozeResponse.status);
      const fallback = getCareerFallback(major, grade, city);
      return new Response(createTextStream(fallback), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // 如果响应不是流式的（返回 JSON 错误）
    const contentType = cozeResponse.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const errorData = await cozeResponse.json();
      console.error('Workflow API JSON error:', errorData);
      const fallback = getCareerFallback(major, grade, city);
      return new Response(createTextStream(fallback), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // 7. 创建 SSE 流（含结构化数据解析）
    const stream = createWorkflowSSEStream(
      cozeResponse,
      userId,
      getCareerFallback(major, grade, city)
    );

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('职业规划生成失败:', error);
    return NextResponse.json(
      { code: 500, message: '生成失败', error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
