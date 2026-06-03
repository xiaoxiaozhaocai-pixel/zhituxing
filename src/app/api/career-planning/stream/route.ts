export const dynamic = 'force-dynamic';
/**
 * 职业规划AI智能体流式API
 * 
 * 优先使用扣子编程 stream_run API
 * 回退到标准 Coze Bot API
 * - 用户验证查 user_profiles 表，查出 user_type
 * - 传入 custom_variables: { user_type }
 * - 真正的边读边转发流式传输
 * - SSE 解析器提取结构化数据，存入 career_plans 表
 */

import { NextRequest } from 'next/server';
import { parseRequestBody } from '@/lib/api-contracts/_shared';
import { CareerPlanningStreamRequestSchema } from '@/lib/api-contracts/career-planning';
import {
  getUserInfoFromRequest,
  getUserProfileContext,
  callCozeStreamApi,
  createCozeSSEStream,
  callWorkflowStreamApi,
  createWorkflowSSEStream,
  createTextStream,
  getWorkflowConfig,
} from '@/lib/coze-stream';
import {
  extractKeywords,
  querySupabase,
  buildRAGContext,
  createDeepSeekRAGStream,
  PUBLIC_JD_FIELDS,
} from '@/lib/rag-utils';

const USE_DEEPSEEK = process.env.DEEPSEEK_ENABLED === 'true';

export const runtime = 'nodejs';

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

// SSE 流式响应头
const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
};

export async function POST(request: NextRequest) {
  try {
    // 契约化：用 zod 校验请求体，失败立即返回 INVALID_REQUEST
    const parsed = await parseRequestBody(request, CareerPlanningStreamRequestSchema);
    if (!parsed.ok) return parsed.response;
    const { major, grade, city, message, conversationId } = parsed.data;

    // 1. 用户验证
    const userInfo = await getUserInfoFromRequest(request);
    const userId = userInfo?.userId || null;
    const userType = userInfo?.userType || 'free';

    // 2. 获取用户个人信息上下文
    let userContext = '';
    if (userId) {
      userContext = await getUserProfileContext(userId);
    }

    // 3. 构建最终消息
    const queryContent = message || `请根据以下信息，为我生成一份专属的职业规划报告：\n\n【基本信息】\n- 所属专业：${major || '未填写'}\n- 当前年级：${grade || '未填写'}\n- 意向城市：${city || '未填写'}\n\n请生成一份详细的职业规划报告。`;
    const finalMessage = userContext + queryContent;
    const fallbackText = getCareerFallback(major || '', grade || '', city || '');

    // ===========================
    // DeepSeek + RAG 分支
    // ===========================
    if (USE_DEEPSEEK) {
      console.log('[career] Using DeepSeek + RAG');
      try {
        const keywords = extractKeywords(queryContent);
        const industry = keywords.industry || major;
        const targetCity = keywords.city || city;

        // 并行查询多个表
        const [jds, careerPaths, resources, articles] = await Promise.all([
          querySupabase('job_descriptions', [
            ...(industry ? [{ field: 'industry', operator: 'ilike' as const, value: `%${industry}%` }] : []),
            ...(targetCity ? [{ field: 'city', operator: 'ilike' as const, value: `%${targetCity}%` }] : []),
          ], 8, PUBLIC_JD_FIELDS),
          querySupabase('career_paths', [
            ...(industry ? [{ field: 'industry', operator: 'ilike' as const, value: `%${industry}%` }] : []),
          ], 5),
          querySupabase('learning_resources', [
            ...(industry ? [{ field: 'industry', operator: 'ilike' as const, value: `%${industry}%` }] : []),
          ], 6),
          querySupabase('articles', [
            { field: 'category', operator: 'ilike' as const, value: '%考研%' },
          ], 3),
        ]);

        // 构建 RAG 上下文
        const ragContext = buildRAGContext([
          { tableName: 'job_descriptions', displayName: '岗位数据', data: jds },
          { tableName: 'career_paths', displayName: '职业路径', data: careerPaths },
          { tableName: 'learning_resources', displayName: '学习资源', data: resources },
          { tableName: 'articles', displayName: '相关文章', data: articles },
        ]);

        const systemPrompt = `你是学业与职业规划顾问"抉择"，擅长用SWOT分析法帮用户在考研vs就业之间做决策。

你的能力：
1. 根据用户的个人情况（专业、年级、城市），分析考研和就业两条路
2. 给出短期收益、长期发展、风险、机会成本的量化分析
3. 提供具体可行的行动建议和时间规划
4. 引用真实的岗位数据和薪资信息支撑分析

回答规范：
- 使用SWOT框架清晰呈现分析过程
- 量化分析要有数据支撑（薪资、竞争比、成功率等）
- 给出明确的建议结论和理由
- 如果检索不到相关数据，坦诚说明`;

        const stream = createDeepSeekRAGStream(
          systemPrompt + (ragContext ? `\n\n--- 参考数据 ---\n${ragContext}\n---` : ''),
          finalMessage,
          []
        );

        return new Response(stream, { headers: SSE_HEADERS });
      } catch (error) {
        console.error('[career] DeepSeek error, falling back to Coze:', error);
        // 继续走 Coze 逻辑
      }
    }

    // ===========================
    // 优先尝试 stream_run API
    // ===========================
    const workflowConfig = getWorkflowConfig('career');

    if (workflowConfig) {
      console.log('[career] Using stream_run API');
      try {
        const workflowResponse = await callWorkflowStreamApi({
          botType: 'career',
          message: finalMessage,
          userContext: '', // 已拼接到 finalMessage
        });

        if (workflowResponse.ok) {
          const stream = createWorkflowSSEStream({
            workflowResponse,
            userId,
            botType: 'career',
            fallbackText,
          });
          return new Response(stream, { headers: SSE_HEADERS });
        } else {
          console.log(`[career] stream_run returned ${workflowResponse.status}, falling back`);
        }
      } catch (err) {
        console.error('[career] stream_run error:', err);
      }
    }

    // ===========================
    // 回退到标准 Coze Bot API
    // ===========================
    const botId = process.env.COZE_BOT_CAREER_PLANNING || process.env.COZE_BOT_DECISION || '';
    const apiKey = process.env.COZE_API_TOKEN;

    if (!apiKey || !botId) {
      console.log('[career] No Bot API configured, using fallback');
      return new Response(createTextStream(fallbackText), { headers: SSE_HEADERS });
    }

    const cozeResponse = await callCozeStreamApi({
      botId,
      message: finalMessage,
      userType,
      conversationId,
      userContext: '', // 已拼接到 finalMessage
    });

    if (!cozeResponse.ok) {
      console.log('[career] Coze API error:', cozeResponse.status);
      return new Response(createTextStream(fallbackText), { headers: SSE_HEADERS });
    }

    const contentType = cozeResponse.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const errorText = await cozeResponse.text();
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.code && errorData.code !== 0) {
          console.log('[career] Coze API error:', errorData.code, errorData.msg);
          return new Response(createTextStream(fallbackText), { headers: SSE_HEADERS });
        }
      } catch { /* continue */ }
    }

    const stream = createCozeSSEStream({
      cozeResponse,
      userId,
      botType: 'career',
      fallbackText,
    });

    return new Response(stream, { headers: SSE_HEADERS });
  } catch (error) {
    console.error('职业规划生成失败:', error);
    const fallback = getCareerFallback('', '', '');
    return new Response(createTextStream(fallback), { headers: SSE_HEADERS });
  }
}
