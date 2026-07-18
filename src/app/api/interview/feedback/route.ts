/**
 * P6.2 模拟面试反馈报告 API
 * POST /api/interview/feedback
 *   - body: { interview_id: string, conversation: Message[] }
 *   - 使用 DeepSeek 分析面试对话，生成结构化反馈报告
 *   - 返回维度评分（沟通力/逻辑力/专业度）及改进建议
 * GET /api/interview/feedback?user_id=xxx
 *   - 获取用户的历史面试反馈列表（含评分趋势）
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createDeepSeekRAGStream } from '@/lib/rag-utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
  'X-Accel-Buffering': 'no',
};

// 反馈分析系统提示词
const FEEDBACK_SYSTEM_PROMPT = `你是一个专业的面试评估分析师。你的任务是基于面试对话记录，生成结构化的面试反馈报告。

【评分维度】
1. 沟通力（0-100）：表达清晰度、条理性、语速节奏、肢体语言描述、情绪控制
2. 逻辑力（0-100）：回答结构（STAR）、论证清晰度、因果关系、思维缜密度
3. 专业度（0-100）：行业认知深度、岗位理解准确性、数据支撑、专业术语使用
4. 综合匹配度（0-100）：整体表现与目标岗位的契合程度

【评分等级参考】
- 90-100：优秀（超出同届平均水平）
- 75-89：良好（达到校招录取水平）
- 60-74：合格（基础扎实，有提升空间）
- 40-59：待提升（需要系统训练）
- 0-39：薄弱（建议从基础开始）

【输出要求】
请以 JSON 格式输出分析结果（放在 <<DATA:type=interview_feedback>> 和 <<END>> 之间），结构如下：

{
  "communication": 分数,
  "logic": 分数,
  "professionalism": 分数,
  "overall_match": 分数,
  "summary": "一句话总结（50字以内）",
  "strengths": ["优点1", "优点2", "优点3"],
  "weaknesses": ["待改进1", "待改进2", "待改进3"],
  "suggestions": [
    {"area": "沟通力", "advice": "具体改进建议", "priority": "high|medium|low"},
    {"area": "逻辑力", "advice": "具体改进建议", "priority": "high|medium|low"},
    {"area": "专业度", "advice": "具体改进建议", "priority": "high|medium|low"}
  ],
  "star_analysis": {
    "good_examples": ["用户回答中STAR结构完整的例子"],
    "improvement_examples": ["用户回答中STAR结构缺失的例子及改进版本"]
  }
}

如果对话内容不足以分析某个维度，请在 JSON 中标注 "insufficient_data": true 并列出缺失的信息。`;

// POST：生成面试反馈报告
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { interview_id, conversation, target_job, interview_type } = body;

    if (!conversation || !Array.isArray(conversation) || conversation.length === 0) {
      return NextResponse.json({ error: '面试对话内容不能为空' }, { status: 400 });
    }

    // 获取用户信息
    const accessToken = request.cookies.get('sb-access-token')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { data: { user } } = await supabase.auth.getUser(accessToken);
    const userId = user?.id;
    if (!userId) {
      return NextResponse.json({ error: '用户验证失败' }, { status: 401 });
    }

    // 构建对话摘要给 AI 分析
    const conversationText = conversation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((m: any) => `${m.role === 'assistant' ? '面试官' : '候选人'}: ${m.content}`)
      .join('\n\n');

    const contextInfo = [
      target_job ? `目标岗位: ${target_job}` : '',
      interview_type ? `面试类型: ${interview_type}` : '',
    ].filter(Boolean).join('\n');

    const analysisPrompt = `请分析以下面试对话，并生成结构化反馈报告。

${contextInfo}

===== 面试对话记录 =====
${conversationText}
===== 对话结束 =====

请基于以上对话，按要求的JSON格式输出分析结果。`;

    // 使用 DeepSeek 分析
    const stream = createDeepSeekRAGStream(FEEDBACK_SYSTEM_PROMPT, analysisPrompt, []);

    // 收集完整输出以保存到数据库
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    const responseStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });

            // 提取 JSON 部分
            const dataMatch = chunk.match(/<<DATA:type=interview_feedback>>([\s\S]*?)<</);
            if (dataMatch) {
              try {
                const feedbackData = JSON.parse(dataMatch[1]);
                // 保存到数据库
                await supabase.from('interview_results').upsert({
                  user_id: userId,
                  ...(interview_id ? { id: parseInt(interview_id) } : {}),
                  target_job: target_job || '',
                  overall_score: Math.round((feedbackData.communication + feedbackData.logic + feedbackData.professionalism) / 3),
                  key_strengths: feedbackData.strengths || [],
                  key_weaknesses: feedbackData.weaknesses || [],
                  gap_skills: feedbackData.suggestions || [],
                  result_data: feedbackData,
                  created_at: new Date().toISOString(),
                }, { onConflict: 'id' });
              } catch (e) {
                console.error('[feedback] Failed to parse/save feedback:', e);
              }
            }

            controller.enqueue(encoder.encode(chunk));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (err) {
          console.error('[feedback] Stream error:', err);
        } finally {
          controller.close();
          reader.releaseLock();
        }
      },
    });

    return new Response(responseStream, { headers: SSE_HEADERS });
  } catch (err) {
    console.error('[feedback] Error:', err);
    return NextResponse.json({ error: '服务器异常' }, { status: 500 });
  }
}

// GET：获取用户的历史面试反馈列表
export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('sb-access-token')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { data: { user } } = await supabase.auth.getUser(accessToken);
    if (!user) {
      return NextResponse.json({ error: '用户验证失败' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('interview_results')
      .select('id, target_job, overall_score, key_strengths, key_weaknesses, result_data, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ code: 200, data: { feedbacks: data || [] } });
  } catch (err) {
    console.error('[feedback] GET Error:', err);
    return NextResponse.json({ error: '服务器异常' }, { status: 500 });
  }
}
