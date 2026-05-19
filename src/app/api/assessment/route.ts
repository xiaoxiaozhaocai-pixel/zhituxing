import { NextRequest, NextResponse } from 'next/server';
import {
  getUserInfoFromRequest,
  getUserProfileContext,
  getWorkflowConfig,
  callWorkflowStreamApi,
  createWorkflowSSEStream,
  createTextStream,
} from '@/lib/coze-stream';
import { execSql } from '@/lib/exec-sql';
import { calculateCompetencyPercentile, type CompetencyPercentileResult, type PeerMatchScore } from '@/lib/matching-algorithm';
import {
  extractKeywords,
  querySupabase,
  buildRAGContext,
  createDeepSeekRAGStream,
} from '@/lib/rag-utils';

export const runtime = 'edge';

// DeepSeek 开关
const USE_DEEPSEEK = process.env.DEEPSEEK_ENABLED === 'true';

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
    const assessRows = await execSql(
      `SELECT id, result_data, created_at FROM assessment_results WHERE user_id = '${userId}' ORDER BY created_at DESC LIMIT 10`
    );

    const history = (assessRows || [] as unknown[]).map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: r.id,
        data: typeof r.result_data === 'string' ? JSON.parse(r.result_data) : r.result_data,
        createdAt: r.created_at,
      };
    });

    // 2. 计算竞争力百分位
    let percentile: CompetencyPercentileResult | null = null;
    if (targetPosition) {
      // 获取同岗位其他用户的匹配度
      const matchRows = await execSql(
        `SELECT match_data, user_id FROM skill_job_match WHERE match_data::text ILIKE '%${targetPosition.replace(/'/g, "''")}%'`
      );

      const peerScores: PeerMatchScore[] = [];
      let userScore = 0;

      for (const row of matchRows as Array<Record<string, unknown>>) {
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
1. 根据用户的${major ? `专业（${major}）` : '专业方向'}和${grade ? `年级（${grade}）` : '当前阶段'}出题
2. 每次出一道选择题（4个选项），等用户回答后再出下一道
3. 用户回答后，给出正确答案和解析
4. 测评结束后，给出各维度评分和提升建议

测评维度：
• 专业知识掌握度
• 实践应用能力
• 沟通表达能力
• 逻辑思维能力
• 团队协作能力
• 创新思维能力

${ragContext ? `--- 题库参考 ---\n${ragContext}\n---` : ''}

请根据题库出题，如果题库不匹配，请根据用户专业自行设计合理的测评题目。`;

        // 5. 构建 DeepSeek 消息列表
        const messages = [
          { role: 'system' as const, content: systemPrompt },
          ...(history || []).filter((m: { role: string }) => m.role !== 'system'),
          { role: 'user' as const, content: userMessage },
        ];

        // 6. 返回 DeepSeek SSE 流
        const stream = createDeepSeekRAGStream(systemPrompt, userMessage, history || []);
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
    const userType = userInfo?.userType || 'free';

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
    const finalSessionId = sessionId || `assessment_${Date.now()}_${Math.random().toString(36).slice(2)}`;

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
