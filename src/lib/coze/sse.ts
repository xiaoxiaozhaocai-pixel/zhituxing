/**
 * Coze SSE 流解析模块
 * 提供 Workflow SSE 和 Coze API v3 SSE 的流式解析
 * 统一 SSE 输出格式 + 结构化数据提取与保存
 */

/**
 * 保存结构化数据到 Supabase
 * 根据 dataType 映射到对应表
 */
async function saveStructuredData(
  botType: string | undefined,
  userId: string,
  dataType: string,
  jsonData: Record<string, unknown>
): Promise<void> {
  try {
    const now = new Date().toISOString();

    let table = '';
    let dataField = 'result_data';
    if (dataType === 'interview_result' || dataType === 'interview_feedback' || botType === 'interview') {
      table = 'interview_results';
    } else if (dataType === 'career_plan' || botType === 'career') {
      table = 'career_plans';
      dataField = 'plan_data';
    } else if (dataType === 'jd_match' || dataType === 'skill_job_match' || botType === 'jobs') {
      table = 'skill_job_match';
      dataField = 'match_data';
    } else if (dataType === 'skill_assessment' || botType === 'assessment') {
      table = 'assessment_results';
    } else if (dataType === 'resume_optimization' || botType === 'resume') {
      table = 'resume_optimizations';
    } else if (dataType === 'competency_result' || botType === 'competency') {
      table = 'competency_results';
    } else if (dataType === 'decision_result' || botType === 'decision') {
      table = 'decision_results';
    } else if (dataType === 'tier_match' || botType === 'jobs_tier') {
      table = 'skill_job_match';
      dataField = 'match_data';
    } else if (dataType === 'skill_portrait' || botType === 'skill_portrait') {
      table = 'skill_portraits';
      dataField = 'portrait_data';
    }

    if (!table) return;

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}`,
      {
        method: 'POST',
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          user_id: userId,
          [dataField]: jsonData,
          created_at: now,
        }),
      }
    );

    if (res.ok) {
      console.log(`结构化数据已保存: botType=${botType}, type=${dataType}`);
    } else {
      console.error('保存结构化数据失败:', res.status, await res.text());
    }
  } catch (error) {
    console.error('保存结构化数据失败:', error);
  }
}

// ===== SSE 流解析共享工具函数 =====

type SSEController = { enqueue: (d: Uint8Array) => void };

function sendText(ctrl: SSEController, text: string) {
  const enc = new TextEncoder();
  ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`));
}

function sendDone(ctrl: SSEController) {
  const enc = new TextEncoder();
  ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
}

function sendError(ctrl: SSEController, message: string) {
  const enc = new TextEncoder();
  ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'error', message })}\n\n`));
}

// <<DATA:type=xxx>>...<<END>> 标记正则
const DATA_START_RE = /<<\s*DATA\s*:\s*type\s*=\s*(\w+)\s*>>/i;
const DATA_END_RE = /<<\s*END\s*>>/i;

/**
 * 处理累积文本中的 <<DATA>> 标记：增量检测，安全文本立即转发
 * 返回处理后的 pendingText（未确认部分）
 */
function flushPendingText(
  ctrl: SSEController,
  pendingText: string,
  hasSentAnyData: { value: boolean }
): string {
  const encoder = new TextEncoder();
  let searchStart = 0;

  while (searchStart < pendingText.length) {
    const startMatch = pendingText.substring(searchStart).match(DATA_START_RE);

    if (!startMatch) {
      const lastLt = pendingText.lastIndexOf('<<', searchStart);
      if (lastLt > searchStart && lastLt > pendingText.length - 30) {
        const safeText = pendingText.substring(searchStart, lastLt);
        if (safeText) { sendText(ctrl, safeText); hasSentAnyData.value = true; }
        return pendingText.substring(lastLt);
      }
      const safeText = pendingText.substring(searchStart);
      if (safeText) { sendText(ctrl, safeText); hasSentAnyData.value = true; }
      return '';
    }

    const dataType = startMatch[1];
    const dataStartPos = searchStart + startMatch.index! + startMatch[0].length;

    if (startMatch.index! > 0) {
      const textBefore = pendingText.substring(searchStart, searchStart + startMatch.index!);
      if (textBefore) { sendText(ctrl, textBefore); hasSentAnyData.value = true; }
    }

    const endMatch = pendingText.substring(dataStartPos).match(DATA_END_RE);
    if (!endMatch) {
      return pendingText.substring(searchStart + startMatch.index!);
    }

    const jsonStr = pendingText.substring(dataStartPos, dataStartPos + endMatch.index!);
    const afterEndPos = dataStartPos + endMatch.index! + endMatch[0].length;

    try {
      const jsonData = JSON.parse(jsonStr);
      ctrl.enqueue(encoder.encode(`event: structured_data\ndata: ${JSON.stringify({ type: dataType, data: jsonData })}\n\n`));
      hasSentAnyData.value = true;
    } catch {
      console.error('结构化数据JSON解析失败');
      sendText(ctrl, `<<DATA:type=${dataType}>>${jsonStr}<<END>>`);
      hasSentAnyData.value = true;
    }

    searchStart = afterEndPos;
  }

  return '';
}

// ===== Workflow SSE 流 (stream_run API) =====

/**
 * 解析扣子编程 stream_run 返回的 SSE 流
 * 数据格式: data: {"type":"answer","content":{"answer":"..."}}
 */
export function createWorkflowSSEStream(params: {
  workflowResponse: Response;
  userId: string | null;
  botType: string | undefined;
  fallbackText: string;
}): ReadableStream {
  const { workflowResponse, fallbackText } = params;

  return new ReadableStream({
    async start(controller) {
      const contentType = workflowResponse.headers.get('content-type') || '';
      if (contentType.includes('application/json') || !workflowResponse.ok) {
        try {
          const errorBody = await workflowResponse.text();
          let errorMsg = 'AI服务请求失败';
          try {
            const errorJson = JSON.parse(errorBody);
            errorMsg = errorJson.msg || errorJson.message || errorJson.error || errorMsg;
          } catch { /* use default */ }
          sendError(controller, errorMsg);
        } catch {
          sendError(controller, `AI服务请求失败(HTTP ${workflowResponse.status})`);
        }
        sendDone(controller);
        try { controller.close(); } catch { /* ignore */ }
        return;
      }

      const reader = workflowResponse.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        sendError(controller, '无法读取AI响应');
        try { controller.close(); } catch { /* ignore */ }
        return;
      }

      let sseBuffer = '';
      let pendingText = '';
      let hasError = false;
      const hasSentAnyData: { value: boolean } = { value: false };

      try {
        while (true) {
          let readResult: { done: boolean; value?: Uint8Array };
          try {
            readResult = await reader.read();
          } catch (readErr: unknown) {
            console.log('Workflow stream read error:', readErr instanceof Error ? readErr.message : String(readErr));
            break;
          }
          const { done, value } = readResult;
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });

          const blocks = sseBuffer.split('\n\n');
          sseBuffer = blocks.pop() ?? '';

          for (const block of blocks) {
            const dataLines = block
              .split('\n')
              .filter(line => line.startsWith('data:'))
              .map(line => line.slice(5).trim());

            if (dataLines.length === 0) continue;

            for (const line of dataLines) {
              try {
                const parsed = JSON.parse(line);

                if (parsed.code && parsed.code !== 0) {
                  console.log('Workflow stream error:', parsed.code, parsed.msg);
                  hasError = true;
                  break;
                }

                if (parsed.type === 'answer' && parsed.content?.answer) {
                  pendingText += parsed.content.answer;
                  pendingText = flushPendingText(controller, pendingText, hasSentAnyData);
                } else if (parsed.type === 'error') {
                  console.log('Workflow error event:', parsed);
                  hasError = true;
                  break;
                }
              } catch { /* non-JSON, ignore */ }
            }

            if (hasError) break;
          }

          if (hasError) break;
        }

        if (hasError) {
          if (!hasSentAnyData.value) {
            sendText(controller, fallbackText);
          } else {
            sendError(controller, 'AI生成过程中出现错误');
          }
        } else {
          pendingText = flushPendingText(controller, pendingText, hasSentAnyData);
          if (pendingText) sendText(controller, pendingText);
          sendDone(controller);
        }
      } catch (streamErr: unknown) {
        console.log('Workflow stream unexpected error:', streamErr instanceof Error ? streamErr.message : String(streamErr));
        if (!hasSentAnyData.value) sendText(controller, fallbackText);
        else sendError(controller, 'AI生成过程中出现异常');
      } finally {
        try { reader.releaseLock(); } catch { /* ignore */ }
        try { controller.close(); } catch { /* ignore */ }
      }
    },
  });
}

// ===== Coze API v3 SSE 流 =====

/**
 * Coze API v3 SSE 流解析（增量转发版）
 * 边读边转发，解析 <<DATA:type=xxx>>...<<END>> 标记
 */
export function createCozeSSEStream(params: {
  cozeResponse: Response;
  userId: string | null;
  botType: string | undefined;
  fallbackText: string;
}): ReadableStream {
  const { cozeResponse, userId, botType, fallbackText } = params;

  return new ReadableStream({
    async start(controller) {
      const contentType = cozeResponse.headers.get('content-type') || '';
      if (contentType.includes('application/json') || !cozeResponse.ok) {
        try {
          const errorBody = await cozeResponse.text();
          let errorMsg = 'AI服务请求失败';
          try {
            const errorJson = JSON.parse(errorBody);
            errorMsg = errorJson.msg || errorJson.message || errorJson.error || errorMsg;
          } catch { /* use default */ }
          sendError(controller, errorMsg);
        } catch {
          sendError(controller, `AI服务请求失败(HTTP ${cozeResponse.status})`);
        }
        sendDone(controller);
        try { controller.close(); } catch { /* ignore */ }
        return;
      }

      const reader = cozeResponse.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        sendText(controller, fallbackText);
        try { controller.close(); } catch { /* ignore */ }
        return;
      }

      let buffer = '';
      let isFirstChunk = true;
      const hasSentAnyData: { value: boolean } = { value: false };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });

          if (isFirstChunk) {
            isFirstChunk = false;
            const trimmed = chunk.trim();
            if (trimmed.startsWith('{')) {
              try {
                const potentialError = JSON.parse(trimmed);
                if (potentialError.code && potentialError.code !== 0) {
                  console.log('Coze API stream error:', potentialError.code, potentialError.msg);
                  sendText(controller, fallbackText);
                  hasSentAnyData.value = true;
                  break;
                }
              } catch { /* not complete JSON, normal SSE start */ }
            }
          }

          buffer += chunk;

          let searchStart = 0;
          while (searchStart < buffer.length) {
            const startMatch = buffer.substring(searchStart).match(DATA_START_RE);

            if (!startMatch) {
              const lastLt = buffer.lastIndexOf('<<', searchStart);
              if (lastLt > searchStart && lastLt > buffer.length - 20) {
                const textToForward = buffer.substring(searchStart, lastLt);
                if (textToForward) { sendText(controller, textToForward); hasSentAnyData.value = true; }
                buffer = buffer.substring(lastLt);
                break;
              }
              const textToForward = buffer.substring(searchStart);
              if (textToForward) { sendText(controller, textToForward); hasSentAnyData.value = true; }
              buffer = '';
              break;
            }

            const dataType = startMatch[1];
            const dataStartPos = searchStart + startMatch.index! + startMatch[0].length;

            if (startMatch.index! > 0) {
              const textBefore = buffer.substring(searchStart, searchStart + startMatch.index!);
              if (textBefore) { sendText(controller, textBefore); hasSentAnyData.value = true; }
            }

            const endMatch = buffer.substring(dataStartPos).match(DATA_END_RE);
            if (!endMatch) {
              buffer = buffer.substring(searchStart + startMatch.index!);
              break;
            }

            const jsonStr = buffer.substring(dataStartPos, dataStartPos + endMatch.index!);
            const afterEndPos = dataStartPos + endMatch.index! + endMatch[0].length;

            try {
              const jsonData = JSON.parse(jsonStr);
              const encoder = new TextEncoder();
              const structuredEvent = `event: structured_data\ndata: ${JSON.stringify({ type: dataType, data: jsonData })}\n\n`;
              controller.enqueue(encoder.encode(structuredEvent));
              hasSentAnyData.value = true;

              if (userId) {
                saveStructuredData(botType, userId, dataType!, jsonData).catch(err =>
                  console.error('Background save error:', err)
                );
              }
            } catch {
              console.error('结构化数据JSON解析失败');
              sendText(controller, `<<DATA:type=${dataType}>>${jsonStr}<<END>>`);
              hasSentAnyData.value = true;
            }

            searchStart = afterEndPos;
          }
        }

        if (buffer) { sendText(controller, buffer); hasSentAnyData.value = true; }
        sendDone(controller);
      } catch (streamErr: unknown) {
        console.log('Coze stream unexpected error:', streamErr instanceof Error ? streamErr.message : String(streamErr));
        if (!hasSentAnyData.value) sendText(controller, fallbackText);
      } finally {
        try { reader.releaseLock(); } catch { /* ignore */ }
        try { controller.close(); } catch { /* ignore */ }
      }
    },
  });
}
