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
export const dynamic = 'force-dynamic';
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
  return `<<DATA:type=radar>>{"dimensions":[{"name":"硬技能","score":65,"max":100,"weight":40},{"name":"软技能","score":55,"max":100,"weight":25},{"name":"经验匹配","score":40,"max":100,"weight":25},{"name":"教育背景","score":70,"max":100,"weight":10}],"overallScore":58,"summary":"系统暂未获取到完整用户数据，显示默认评估。请完善个人信息以获得精准诊断。"}<<END>>

# 🎯 能力诊断+成长规划报告

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

        const systemPrompt = `你是能力诊断+成长规划顾问"抉择"，先诊断用户当前能力短板，再制定针对性成长路径。

## 输出格式（两步走）

### 第一步：能力诊断（必须先用 DATA 块输出雷达图数据）
先输出一个结构化数据块：
\`\`\`
<<DATA:type=radar>>{"dimensions":[{"name":"硬技能","score":75,"max":100,"weight":40},{"name":"软技能","score":60,"max":100,"weight":25},{"name":"经验匹配","score":45,"max":100,"weight":25},{"name":"教育背景","score":80,"max":100,"weight":10}],"overallScore":65,"summary":"你的硬技能和教育背景较好，但经验匹配是主要短板"}<<END>>
\`\`\`
维度说明：硬技能（专业知识和工具掌握）、软技能（沟通协作领导力）、经验匹配（实习项目与目标岗位相关度）、教育背景（学历专业匹配度）。分数基于用户输入和参考数据合理评估，0=完全不匹配，100=完美匹配。

接着用文字展开诊断：每个维度的具体分析、短板定位、改进优先级。

### 第二步：成长规划
基于诊断结果，给出：
1. 岗位匹配：推荐3-5个最适合的目标岗位（含薪资、竞争比）
2. 分阶段计划：按月或按季度，每个阶段具体目标和行动
3. 学习资源：推荐的课程、项目、证书
4. SWOT总结

## 回答规范
- 第一步必须先输出 DATA 块（雷达图），再展开文字
- 量化分析基于真实岗位数据
- 建议具体可执行
- 检索不到数据时坦诚说明`;

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
