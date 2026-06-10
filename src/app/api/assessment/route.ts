import { NextRequest, NextResponse } from 'next/server';
import {
  getUserInfoFromRequest,
  getUserProfileContext,
  getWorkflowConfig,
  callWorkflowStreamApi,
  createWorkflowSSEStream,
  createTextStream,
} from '@/lib/coze-stream';
import { getSupabaseAdmin } from '@/lib/supabase';
import { calculateCompetencyPercentile, type CompetencyPercentileResult, type PeerMatchScore } from '@/lib/matching-algorithm';
import {
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
  extractKeywords,
  querySupabase,
  buildRAGContext,
} from '@/lib/rag-utils';

const supabase = getSupabaseAdmin();


// DeepSeek 开关
const USE_DEEPSEEK = process.env.DEEPSEEK_ENABLED === 'true';

// ============================================================
// 辅助函数：保存结构化测评数据到 Supabase
// ============================================================

async function saveStructuredDataAssessment(
  userId: string,
  dataType: string,
  jsonData: Record<string, unknown>
): Promise<void> {
  try {
    const now = new Date().toISOString();

    // 根据 dataType 选择目标表
    let table = 'assessment_results';
    let dataField = 'result_data';

    if (dataType === 'career_plan') {
      table = 'career_plans';
      dataField = 'plan_data';
    }

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
      console.log(`[assessment] 结构化数据已保存: type=${dataType}, table=${table}`);
    } else {
      console.error('[assessment] 保存结构化数据失败:', res.status, await res.text());
    }
  } catch (error) {
    console.error('[assessment] 保存结构化数据异常:', error);
  }
}

// ============================================================
// 辅助函数：创建带 <<DATA>> 解析的 DeepSeek SSE 流
// ============================================================

function createDeepSeekAssessmentStream(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: string; content: string }>,
  userId: string | null
): ReadableStream {
  const encoder = new TextEncoder();

  // SSE 辅助函数
  function sendText(controller: { enqueue: (d: Uint8Array) => void }, text: string) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`));
  }

  function sendStructuredData(
    controller: { enqueue: (d: Uint8Array) => void },
    dataType: string,
    jsonData: Record<string, unknown>
  ) {
    controller.enqueue(
      encoder.encode(`event: structured_data\ndata: ${JSON.stringify({ type: dataType, data: jsonData })}\n\n`)
    );
  }

  function sendDone(controller: { enqueue: (d: Uint8Array) => void }) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
  }

  function sendError(controller: { enqueue: (d: Uint8Array) => void }, message: string) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message })}\n\n`));
  }

  return new ReadableStream({
    async start(controller) {
      try {
        const messages = [
          { role: 'system' as const, content: systemPrompt },
          ...(history || []).filter((m: { role: string }) => m.role !== 'system'),
          { role: 'user' as const, content: userMessage },
        ];

        const response = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
            messages,
            temperature: 0.7,
            max_tokens: 4000,
            stream: true,
          }),
        });

        if (!response.ok) {
          sendText(controller, 'AI服务暂时不可用，请稍后再试');
          sendDone(controller);
          controller.close();
          return;
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          sendError(controller, '无法读取AI响应');
          controller.close();
          return;
        }

        let buffer = '';
        let pendingText = '';
        const dataStartRegex = /<<\s*DATA\s*:\s*type\s*=\s*(\w+)\s*>>/i;
        const dataEndRegex = /<<\s*END\s*>>/i;

        // 刷新 pendingText，检测 <<DATA>> 标记
        function flushPendingText(): string {
          let searchStart = 0;

          while (searchStart < pendingText.length) {
            const startMatch = pendingText.substring(searchStart).match(dataStartRegex);

            if (!startMatch) {
              // 检查尾部是否有未完成的 <<DATA>> 前缀
              const lastLt = pendingText.lastIndexOf('<<', searchStart);
              if (lastLt > searchStart && lastLt > pendingText.length - 30) {
                const safeText = pendingText.substring(searchStart, lastLt);
                if (safeText) sendText(controller, safeText);
                return pendingText.substring(lastLt);
              }
              const safeText = pendingText.substring(searchStart);
              if (safeText) sendText(controller, safeText);
              return '';
            }

            const dataType = startMatch[1];
            const dataStartPos = searchStart + startMatch.index! + startMatch[0].length;

            // 转发标记前的普通文本
            if (startMatch.index! > 0) {
              const textBefore = pendingText.substring(searchStart, searchStart + startMatch.index!);
              if (textBefore) sendText(controller, textBefore);
            }

            // 查找 <<END>>
            const endMatch = pendingText.substring(dataStartPos).match(dataEndRegex);

            if (!endMatch) {
              // <<END>> 还没到，保留从 <<DATA>> 开始的部分
              return pendingText.substring(searchStart + startMatch.index!);
            }

            // 提取结构化数据
            const jsonStr = pendingText.substring(dataStartPos, dataStartPos + endMatch.index!);
            const afterEndPos = dataStartPos + endMatch.index! + endMatch[0].length;

            try {
              const jsonData = JSON.parse(jsonStr);
              sendStructuredData(controller, dataType!, jsonData);

              // 异步保存到 Supabase
              if (userId) {
                saveStructuredDataAssessment(userId, dataType!, jsonData).catch((err) =>
                  console.error('[assessment] Background save error:', err)
                );
              }
            } catch (parseErr) {
              console.error('[assessment] 结构化数据JSON解析失败:', parseErr);
              sendText(controller, `<<DATA:type=${dataType}>>${jsonStr}<<END>>`);
            }

            searchStart = afterEndPos;
          }

          return '';
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // 解析 SSE 事件
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (line.startsWith('data:')) {
              const data = line.slice(5).trim();
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.choices?.[0]?.delta?.content) {
                  pendingText += parsed.choices[0].delta.content;
                  pendingText = flushPendingText();
                }
              } catch {
                // 非 JSON，忽略
              }
            }
          }
        }

        // 流结束，刷新剩余内容
        pendingText = flushPendingText();
        if (pendingText) sendText(controller, pendingText);
        sendDone(controller);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('[assessment] Stream error:', errMsg);
        sendError(controller, errMsg);
      } finally {
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      }
    },
  });
}

// ============================================================
// GET - 获取测评历史 + 竞争力百分位
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const userInfo = await getUserInfoFromRequest(request);
    const userId = userInfo?.userId || null;

    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const targetPosition = searchParams.get('target_position') || '';

    // 1. 获取用户测评历史
    const { data: assessRows, error: assessError } = await supabase
      .from('assessment_results')
      .select('id, result_data, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (assessError) throw assessError;

    const history = (assessRows || []).map((row) => {
      return {
        id: row.id,
        data: typeof row.result_data === 'string' ? JSON.parse(row.result_data) : row.result_data,
        createdAt: row.created_at,
      };
    });

    // 2. 计算竞争力百分位
    let percentile: CompetencyPercentileResult | null = null;
    if (targetPosition) {
      // 获取同岗位其他用户的匹配度
      const { data: matchRows, error: matchError } = await supabase
        .from('skill_job_match')
        .select('match_data, user_id')
        .ilike('match_data', `%${targetPosition}%`);

      if (matchError) throw matchError;

      const peerScores: PeerMatchScore[] = [];
      let userScore = 0;

      for (const row of matchRows || []) {
        try {
          const data = typeof row.match_data === 'string' ? JSON.parse(row.match_data) : row.match_data;
          const rowUserId = row.user_id as (string | number);
          // match_data 是数组，每项有 matchScore
          if (Array.isArray(data)) {
            for (const item of data) {
              if (item.matchScore) {
                peerScores.push({ userId: rowUserId || 'unknown', matchScore: item.matchScore });
              }
              if (item.jobName && item.jobName.includes(targetPosition) && item.matchScore) {
                userScore = item.matchScore;
              }
            }
          }
        } catch {
          // 解析失败跳过
        }
      }

      if (peerScores.length > 0 && userScore > 0) {
        percentile = calculateCompetencyPercentile(userScore, peerScores);
      }
    }

    // 3. 成长曲线（2次以上测评时）
    let growthCurve: Array<{ date: string; score: number }> | null = null;
    if (history.length >= 2) {
      growthCurve = history
        .map((h) => {
          const d = h.data as Record<string, unknown>;
          return {
            date: h.createdAt as string,
            score: (d.overall_score as number) || (d.match_score as number) || 0,
          };
        })
        .reverse(); // 按时间升序
    }

    return NextResponse.json({
      success: true,
      data: {
        history,
        percentile,
        growthCurve,
        totalAssessments: history.length,
      },
    });
  } catch (error) {
    console.error('[assessment] GET Error:', error);
    return NextResponse.json(
      { error: '查询测评历史失败', detail: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

// ============================================================
// POST - 触发能力测评（保留原有功能）
// ============================================================

// 能力测评 fallback 回复
function getAssessmentFallback(major?: string, grade?: string): string {
  return `您好！我是职途星专业能力测评助手。

请告诉我以下信息，我来为您生成专业能力测评报告：

📊 **基本信息：**
• 您的专业：${major || '未填写'}
• 当前年级：${grade || '未填写'}

📈 **测评维度：**
• 专业知识掌握度
• 实践应用能力
• 沟通表达能力
• 逻辑思维能力
• 团队协作能力
• 创新思维能力

请提供信息，开始您的专业能力测评！`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { major, grade, message, sessionId, history } = body;

    // ============================================================
    // DeepSeek + RAG 分支
    // ============================================================
    if (USE_DEEPSEEK) {
      try {
        // 1. 用户验证
        const userInfo = await getUserInfoFromRequest(request);
        const userId = userInfo?.userId || null;

        // 2. 从用户消息提取关键词
        const userMessage = message || `请根据以下信息，为我生成一份专业能力测评报告：\n\n【基本信息】\n- 所属专业：${major || '未填写'}\n- 当前年级：${grade || '未填写'}`;
        const keywords = extractKeywords(userMessage);

        // 3. RAG 检索：查询 skill_assessments 题库
        const filters: { field: string; operator: 'eq' | 'ilike'; value: string | number | boolean | string[] }[] = [];
        if (keywords.industry) filters.push({ field: 'industry', operator: 'ilike', value: keywords.industry });
        if (keywords.jobTitle) filters.push({ field: 'skill_name', operator: 'ilike', value: keywords.jobTitle });

        const assessmentQuestions = await querySupabase('skill_assessments', filters, 15);

        // 4. 构建系统提示词
        const ragContext = buildRAGContext([
          { tableName: 'skill_assessments', displayName: '测评题库', data: assessmentQuestions.slice(0, 10), fields: ['question', 'options', 'skill_name'] },
        ]);

        const systemPrompt = `你是"测测"——职途星平台的专业能力测评助手。

你的职责：
1. 根据用户的${major ? `专业（${major}）` : "专业方向"}和${grade ? `年级（${grade}）` : "当前阶段"}出题
2. 每次出一道选择题（4个选项），等用户回答后再出下一道
3. 用户回答后，给出正确答案和解析
4. 测评结束后，给出各维度评分和提升建议

测评维度（6个维度，每个维度0-100分）：
- 专业知识掌握度 — 对本专业核心知识体系的理解深度
- 实践应用能力 — 将理论知识应用于实际场景的能力
- 沟通表达能力 — 口头和书面表达的清晰度与说服力
- 逻辑思维能力 — 分析问题、推理判断的严密性
- 团队协作能力 — 在团队中协调配合、推动共识的能力
- 创新思维能力 — 提出新观点、新方案的创造力和批判性思维

${ragContext ? `--- 题库参考 ---\n${ragContext}\n---` : ""}

请根据题库出题，如果题库不匹配，请根据用户专业自行设计合理的测评题目。

【重要】当测评结束（用户完成所有题目或要求出报告时），你必须在回复末尾输出结构化数据，格式如下：

<<DATA:type=skill_assessment>>
{
  "dimensions": [
    {"name": "专业知识掌握度", "score": 72, "level": "达标", "percentile": 45},
    {"name": "实践应用能力", "score": 58, "level": "待提升", "percentile": 30},
    {"name": "沟通表达能力", "score": 81, "level": "良好", "percentile": 68},
    {"name": "逻辑思维能力", "score": 65, "level": "达标", "percentile": 42},
    {"name": "团队协作能力", "score": 70, "level": "达标", "percentile": 50},
    {"name": "创新思维能力", "score": 55, "level": "待提升", "percentile": 25}
  ],
  "overall_score": 67,
  "grade": "达标",
  "gap_skills": ["创新思维能力", "实践应用能力"],
  "strengths": ["沟通表达能力突出"],
  "weaknesses": ["创新思维有待提升"],
  "target_position": "用户目标岗位",
  "recommended_jobs": ["产品经理", "项目管理"],
  "summary": "综合评价摘要"
}
<<END>>

评分校准规则（重要，确保区分度）：
- 90-100分 = 优秀（前10%，仅对显著超出同龄人的能力给此分）
- 75-89分 = 良好（前25%，有明确证据的能力）
- 60-74分 = 达标（多数人水平，有基本掌握但不够突出）
- 40-59分 = 待提升（低于多数人，有明显不足）
- 0-39分 = 薄弱（严重不足，需要系统性学习）
- percentile字段表示超过同龄人的百分比（0-100）
- 不同人的测评结果必须有明显差异，不要所有人都给70-80分的安全分数`;

        // 5. 构建 DeepSeek 消息列表
        const _messages = [
          { role: 'system' as const, content: systemPrompt },
          ...(history || []).filter((m: { role: string }) => m.role !== 'system'),
          { role: 'user' as const, content: userMessage },
        ];

        // 6. 返回 DeepSeek SSE 流（带 <<DATA>> 解析）
        const stream = createDeepSeekAssessmentStream(systemPrompt, userMessage, history || [], userId);
        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      } catch (deepSeekError) {
        console.error('[assessment] DeepSeek error, falling back to Coze:', deepSeekError);
        // 出错时回退到 Coze
      }
    }

    // ============================================================
    // Coze Workflow 分支（原有逻辑）
    // ============================================================

    // 1. 用户验证
    const userInfo = await getUserInfoFromRequest(request);
    const userId = userInfo?.userId || null;
    const _userType = userInfo?.userType || 'free';

    // 2. 构建用户上下文
    let userContext = '';
    if (userId) {
      userContext = await getUserProfileContext(userId);
    }

    // 3. 构建最终消息
    const queryContent = message || `请根据以下信息，为我生成一份专业能力测评报告：\n\n【基本信息】\n- 所属专业：${major || '未填写'}\n- 当前年级：${grade || '未填写'}\n\n请从专业知识、实践能力、沟通表达、逻辑思维、团队协作、创新能力六个维度进行测评，给出评分和提升建议。`;
    const finalMessage = userContext + queryContent;

    // 4. 获取 Workflow 配置
    const config = getWorkflowConfig('assessment');

    if (!config) {
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
    const _finalSessionId = sessionId || `assessment_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // 6. 调用 Workflow stream_run API
    const cozeResponse = await callWorkflowStreamApi({
      botType: 'assessment',
      message: finalMessage,
      userContext,
    });

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
    const stream = createWorkflowSSEStream({
      workflowResponse: cozeResponse,
      userId,
      botType: 'assessment',
      fallbackText: getAssessmentFallback(major, grade),
    });

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
