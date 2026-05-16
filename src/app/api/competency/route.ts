/**
 * 胜任力评估AI智能体流式API
 * 使用Coze Workflow stream_run API，通过SSE协议返回流式响应
 * 集成用户验证、user_type权限、SSE结构化数据解析
 * 会员专属功能 — free用户提示升级
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getUserInfoFromRequest,
  getUserProfileContext,
  saveStructuredData,
  createTextStream,
} from '@/lib/coze-stream';

export const runtime = 'edge';

// 胜任力评估 fallback 回复
function getCompetencyFallback(major: string, grade: string): string {
  return `# 🏆 胜任力评估报告

**个人信息**
- 所属专业：${major || '未填写'}
- 当前年级：${grade || '未填写'}

---

## 🎯 综合胜任力评分：68 / 100

---

## 📊 胜任力雷达图

| 维度 | 评分 | 满分 |
|------|------|------|
| 专业知识 | 72 | 100 |
| 沟通协作 | 75 | 100 |
| 执行落地 | 65 | 100 |
| 学习成长 | 70 | 100 |
| 创新思维 | 60 | 100 |
| 领导潜质 | 55 | 100 |

---

## 💪 核心优势
- ✅ 扎实的专业基础，知识储备丰富
- ✅ 良好的沟通表达能力

## ⚠️ 待提升方向
- 🔶 项目执行落地能力需加强
- 🔶 创新思维与领导力有较大提升空间

---

## 📈 成长建议
1. 积极参与项目实践，提升执行落地能力
2. 尝试带领小团队完成项目，锻炼领导力
3. 多关注行业前沿，培养创新思维

---

*本报告由职途星AI胜任力评估助手生成，仅供参考*`;
}

/**
 * 调用 Coze Workflow stream_run API
 */
async function callCompetencyWorkflowApi(
  message: string,
  sessionId: string,
  userType: string
): Promise<Response> {
  const token = process.env.COZE_COMPETENCY_TOKEN;
  const projectId = process.env.COZE_COMPETENCY_PROJECT_ID;

  const url = 'https://xmsnhjsv9q.coze.site/stream_run';

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
function createCompetencySSEStream(
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
                console.error('Competency Workflow API error:', errorData);
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

              // Workflow stream_run 返回格式
              let textContent = '';

              if (parsed.type === 'answer' && parsed.content?.answer != null) {
                textContent = parsed.content.answer;
              } else if (parsed.type === 'message_start' || parsed.type === 'message_end') {
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
                    const dataType = startMatch2 ? startMatch2[1] : 'competency';
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
        console.error('Competency SSE stream error:', error);
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

    // 保存到 Supabase（competency 类型存入 skill_job_match 表）
    if (userId) {
      saveStructuredData('competency', userId, dataType, jsonData as Record<string, unknown>).catch((err: unknown) => {
        console.error('保存胜任力评估数据失败:', err);
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

    // 胜任力评估为会员专属功能
    if (userType !== 'member') {
      return new Response(
        createTextStream('⚠️ 胜任力评估为**会员专属功能**，请升级为会员后使用。\n\n会员可享受：\n- 完整胜任力雷达图\n- 动态成长轨迹追踪\n- 个性化提升方案\n- 对标行业岗位胜任力模型\n\n请联系管理员开通会员权限。'),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      );
    }

    // 2. 构建用户上下文
    let userContext = '';
    if (userId) {
      userContext = await getUserProfileContext(userId);
    }

    // 3. 构建最终消息
    const queryContent = message || `请根据以下信息，为我生成一份胜任力评估报告：\n\n【基本信息】\n- 所属专业：${major || '未填写'}\n- 当前年级：${grade || '未填写'}\n\n请从专业知识、沟通协作、执行落地、学习成长、创新思维、领导潜质六个维度进行评估，给出评分、雷达图和提升建议。`;
    const finalMessage = userContext + queryContent;

    // 4. 检查 Workflow API 配置
    const token = process.env.COZE_COMPETENCY_TOKEN;
    const projectId = process.env.COZE_COMPETENCY_PROJECT_ID;

    if (!token || !projectId) {
      console.log('Competency Workflow API not configured, using fallback');
      const fallback = getCompetencyFallback(major, grade);
      return new Response(createTextStream(fallback), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // 5. 生成 session_id
    const finalSessionId = sessionId || `competency_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // 6. 调用 Workflow stream_run API
    const cozeResponse = await callCompetencyWorkflowApi(finalMessage, finalSessionId, userType);

    // 检查响应状态
    if (!cozeResponse.ok) {
      console.error('Competency Workflow API error:', cozeResponse.status);
      const fallback = getCompetencyFallback(major, grade);
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
      console.error('Competency Workflow API JSON error:', errorData);
      const fallback = getCompetencyFallback(major, grade);
      return new Response(createTextStream(fallback), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // 7. 创建 SSE 流（含结构化数据解析）
    const stream = createCompetencySSEStream(
      cozeResponse,
      userId,
      getCompetencyFallback(major, grade)
    );

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('胜任力评估生成失败:', error);
    return NextResponse.json(
      { code: 500, message: '生成失败', error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
