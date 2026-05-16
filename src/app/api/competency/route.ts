/**
 * 胜任力评估AI智能体流式API
 * 使用Coze Workflow stream_run API，通过SSE协议返回流式响应
 * 会员专属功能 — free用户提示升级
 */

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

// 胜任力评估 fallback 回复
function getCompetencyFallback(major: string, grade: string): string {
  return `# 🏆 胜任力评估报告

您好！我是职途星胜任力评估助手，这是会员专属功能。

📊 **您的基本信息：**
- 专业：${major || '未填写'}
- 年级：${grade || '未填写'}

💡 **成为会员后您将获得：**
- 六维胜任力雷达图评估
- 个性化胜任力提升建议
- 胜任力成长轨迹追踪
- 岗位胜任力对标分析

🔗 请升级为会员，解锁完整的胜任力评估功能！`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { major, grade, message, sessionId } = body;

    // 1. 用户验证 + 权限检查
    const userInfo = await getUserInfoFromRequest(request);
    const userId = userInfo?.userId || null;
    const userType = userInfo?.userType || 'free';

    // 胜任力评估是会员专属功能
    if (userType !== 'member') {
      const fallback = getCompetencyFallback(major || '', grade || '');
      return new Response(createTextStream(fallback), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // 2. 构建用户上下文
    let userContext = '';
    if (userId) {
      userContext = await getUserProfileContext(userId);
    }

    // 3. 构建最终消息
    const queryContent = message || `请根据以下信息，为我生成一份胜任力评估报告：\n\n【基本信息】\n- 所属专业：${major || '未填写'}\n- 当前年级：${grade || '未填写'}\n\n请从核心素质、专业技能、实践经验、沟通能力、领导潜力、创新能力六个维度进行胜任力评估，并给出提升建议。`;
    const finalMessage = userContext + queryContent;

    // 4. 获取 Workflow 配置
    const config = getWorkflowConfig('competency');

    if (!config) {
      console.log('Competency Workflow API not configured, using fallback');
      const fallback = getCompetencyFallback(major || '', grade || '');
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
    const cozeResponse = await callWorkflowStreamApi({
      botType: 'competency',
      message: finalMessage,
      userContext,
    });

    // 检查响应状态
    if (!cozeResponse.ok) {
      console.error('Competency Workflow API error:', cozeResponse.status);
      const fallback = getCompetencyFallback(major || '', grade || '');
      return new Response(createTextStream(fallback), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // 如果响应不是流式的
    const contentType = cozeResponse.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const errorData = await cozeResponse.json();
      console.error('Competency Workflow API JSON error:', errorData);
      const fallback = getCompetencyFallback(major || '', grade || '');
      return new Response(createTextStream(fallback), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // 7. 创建 SSE 流（含结构化数据解析）
    const fallbackText = getCompetencyFallback(major || '', grade || '');
    const stream = createWorkflowSSEStream({
      workflowResponse: cozeResponse,
      userId,
      botType: 'competency',
      fallbackText,
    });

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
