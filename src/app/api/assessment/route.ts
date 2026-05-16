/**
 * 专业能力测评AI智能体流式API
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

// 能力测评 fallback 回复
function getAssessmentFallback(major: string, grade: string): string {
  return `# 📊 专业能力测评报告

**个人信息**
- 所属专业：${major || '未填写'}
- 当前年级：${grade || '未填写'}

---

## 🎯 测评概览

根据您的【${major || '计算机'}】专业背景，以下是您的能力画像：

### 综合评分：72 / 100

---

## 📋 各维度评分

| 维度 | 评分 | 等级 |
|------|------|------|
| 专业知识 | 75/100 | B+ |
| 实践能力 | 65/100 | B |
| 沟通表达 | 80/100 | A- |
| 逻辑思维 | 78/100 | B+ |
| 团队协作 | 70/100 | B |
| 创新能力 | 68/100 | B |

---

## 💪 核心优势
- ✅ 扎实的专业理论基础
- ✅ 良好的沟通表达能力
- ✅ 较强的逻辑分析能力

## ⚠️ 待提升方向
- 缺乏项目实战经验
- 创新思维训练不足
- 团队协作能力有待加强

---

## 🎯 推荐岗位
新媒体运营 | 内容策划 | 品牌营销 | 产品运营

---

*本报告由职途星AI专业能力测评助手生成，仅供参考*`;
}

/**
 * 调用 Coze Workflow stream_run API
 */
async function callAssessmentWorkflowApi(
  message: string,
  sessionId: string,
  userType: string
): Promise<Response> {
  const token = process.env.COZE_ASSESSMENT_TOKEN;
  const projectId = process.env.COZE_ASSESSMENT_PROJECT_ID;

  const url = 'https://f35g9r6pp2.coze.site/stream_run';

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
      // 传入 user_type 用于权限控制
      custom_variables: {
        user_type: userType || 'free',
      },
    }),
  });

  return response;
}

/**
 * 解析 Workflow stream_run SSE 流
 * 边读边转发，同时解析 <<DATA:type=xxx>>...<<END>> 结构化数据
 */
function createAssessmentSSEStream(
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
          const trimmed = chunk.trim();
          if (trimmed.startsWith('{') || trimmed.startsWith('{"error"')) {
            try {
              const errorData = JSON.parse(trimmed);
              if (errorData.code && errorData.code !== 0) {
                console.error('Assessment Workflow API error:', errorData);
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

              // Workflow stream_run 返回格式：
              // type=answer: content.answer 含文本片段
              // type=message_start: 会话开始
              // type=message_end: 会话结束
              let textContent = '';

              if (parsed.type === 'answer' && parsed.content?.answer != null) {
                textContent = parsed.content.answer;
              } else if (parsed.type === 'message_start' || parsed.type === 'message_end') {
                // 控制事件，不转发文本
                textContent = '';
              } else if (parsed.type === 'text' && parsed.content?.text) {
                textContent = parsed.content.text;
              } else if (parsed.type === 'output') {
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
                const dataStartRegex = /<<DATA:type=(\w+)>>/i;
                const dataEndRegex = /<<END>>/i;

                const startMatch = buffer.match(dataStartRegex);
                if (startMatch) {
                  const startIndex = buffer.indexOf(startMatch[0]);
                  const beforeData = buffer.slice(0, startIndex);
                  if (beforeData.trim()) {
                    processTextChunk(beforeData, controller, encoder);
                  }
                  structuredBuffer = buffer.slice(startIndex + startMatch[0].length);
                  buffer = '';

                  const endMatch = structuredBuffer.match(dataEndRegex);
                  if (endMatch) {
                    const endIndex = structuredBuffer.indexOf(endMatch[0]);
                    const jsonStr = structuredBuffer.slice(0, endIndex).trim();
                    const dataType = startMatch[1];
                    processStructuredData(dataType, jsonStr, controller, encoder, userId);
                    structuredBuffer = '';
                  }
                } else if (structuredBuffer) {
                  structuredBuffer += textContent;
                  const endMatch = structuredBuffer.match(dataEndRegex);
                  if (endMatch) {
                    const endIndex = structuredBuffer.indexOf(endMatch[0]);
                    const jsonStr = structuredBuffer.slice(0, endIndex).trim();
                    const startMatch2 = structuredBuffer.match(/<<DATA:type=(\w+)>>/i);
                    const dataType = startMatch2 ? startMatch2[1] : 'skill_assessment';
                    processStructuredData(dataType, jsonStr, controller, encoder, userId);
                    structuredBuffer = '';
                  }
                } else {
                  const lastDataTag = buffer.lastIndexOf('<<DATA');
                  if (lastDataTag > -1) {
                    const beforeTag = buffer.slice(0, lastDataTag);
                    if (beforeTag.trim()) {
                      processTextChunk(beforeTag, controller, encoder);
                    }
                    buffer = buffer.slice(lastDataTag);
                  } else {
                    if (buffer.trim()) {
                      processTextChunk(buffer, controller, encoder);
                      buffer = '';
                    }
                  }
                }
              }
            } catch {
              if (dataText && dataText !== '[DONE]') {
                processTextChunk(dataText, controller, encoder);
              }
            }
          }
        }
      } catch (error) {
        console.error('Assessment SSE stream error:', error);
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

    // 保存到 Supabase（assessment 类型存入 assessment_results 表）
    if (userId) {
      saveStructuredData('assessment', userId, dataType, jsonData as Record<string, unknown>).catch((err: unknown) => {
        console.error('保存测评数据失败:', err);
      });
    }
  } catch (e) {
    console.error('解析结构化数据JSON失败:', e, 'raw:', jsonStr.slice(0, 200));
    processTextChunk(`<<DATA:type=${dataType}>>${jsonStr}<<END>>`, controller, encoder);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { major, grade, message, sessionId } = body;

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
    const queryContent = message || `请根据以下信息，为我生成一份专业能力测评报告：\n\n【基本信息】\n- 所属专业：${major || '未填写'}\n- 当前年级：${grade || '未填写'}\n\n请从专业知识、实践能力、沟通表达、逻辑思维、团队协作、创新能力六个维度进行测评，给出评分和提升建议。`;
    const finalMessage = userContext + queryContent;

    // 4. 检查 Workflow API 配置
    const token = process.env.COZE_ASSESSMENT_TOKEN;
    const projectId = process.env.COZE_ASSESSMENT_PROJECT_ID;

    if (!token || !projectId) {
      console.log('Assessment Workflow API not configured, using fallback');
      const fallback = getAssessmentFallback(major, grade);
      return new Response(createTextStream(fallback), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // 5. 生成 session_id
    const finalSessionId = sessionId || `assessment_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // 6. 调用 Workflow stream_run API
    const cozeResponse = await callAssessmentWorkflowApi(finalMessage, finalSessionId, userType);

    // 检查响应状态
    if (!cozeResponse.ok) {
      console.error('Assessment Workflow API error:', cozeResponse.status);
      const fallback = getAssessmentFallback(major, grade);
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
      console.error('Assessment Workflow API JSON error:', errorData);
      const fallback = getAssessmentFallback(major, grade);
      return new Response(createTextStream(fallback), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // 7. 创建 SSE 流（含结构化数据解析）
    const stream = createAssessmentSSEStream(
      cozeResponse,
      userId,
      getAssessmentFallback(major, grade)
    );

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('能力测评生成失败:', error);
    return NextResponse.json(
      { code: 500, message: '生成失败', error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
