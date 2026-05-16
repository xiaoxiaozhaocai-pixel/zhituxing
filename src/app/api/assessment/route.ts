import { NextRequest, NextResponse } from 'next/server';
import {
  getUserInfoFromRequest,
  getUserProfileContext,
  getWorkflowConfig,
  callWorkflowStreamApi,
  createWorkflowSSEStream,
  createTextStream,
} from '@/lib/coze-stream';

export const runtime = 'edge';

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
    const { major, grade, message, sessionId } = body;

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
