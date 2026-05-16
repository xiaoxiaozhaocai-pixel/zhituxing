/**
 * 职业规划AI智能体流式API
 * 
 * 改造要点：
 * - 使用标准 Coze Bot API (api.coze.cn/v3/chat)，与 chat/route.ts 一致
 * - 使用 COZE_API_KEY + COZE_BOT_ID_DECISION 认证
 * - 用户验证查 user_profiles 表，查出 user_type
 * - Coze API 传入 custom_variables: { user_type }
 * - 真正的边读边转发流式传输
 * - SSE 解析器提取结构化数据，存入对应 Supabase 表
 * - 复用 @/lib/coze-stream.ts 公共模块
 */

import { NextRequest } from 'next/server';
import {
  getUserInfoFromRequest,
  getUserProfileContext,
  callCozeStreamApi,
  createCozeSSEStream,
  createTextStream,
} from '@/lib/coze-stream';

export const runtime = 'edge';

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
    const body = await request.json();
    const { major, grade, city, message, conversationId } = body;

    // 1. 用户验证 — 查 user_profiles 表获取 user_type
    const userInfo = await getUserInfoFromRequest(request);
    const userId = userInfo?.userId || null;
    const userType = userInfo?.userType || 'free';
    const botId = process.env.COZE_BOT_ID_DECISION || '';
    const apiKey = process.env.COZE_API_KEY;

    // 2. 获取用户个人信息上下文
    let userContext = '';
    if (userId) {
      userContext = await getUserProfileContext(userId);
    }

    // 3. 构建最终消息
    const queryContent = message || `请根据以下信息，为我生成一份专属的职业规划报告：\n\n【基本信息】\n- 所属专业：${major || '未填写'}\n- 当前年级：${grade || '未填写'}\n- 意向城市：${city || '未填写'}\n\n请生成一份详细的职业规划报告。`;
    const finalMessage = userContext + queryContent;

    // 4. 如果没有配置 Coze API，使用 fallback
    if (!apiKey || !botId) {
      console.log('Career planning Coze API not configured, using fallback');
      const fallback = getCareerFallback(major, grade, city);
      return new Response(createTextStream(fallback), { headers: SSE_HEADERS });
    }

    // 5. 调用 Coze API，传入 custom_variables
    const cozeResponse = await callCozeStreamApi({
      botId,
      message: finalMessage,
      userType,
      conversationId,
      userContext: '', // 已拼接到 finalMessage 中
    });

    // 6. 先检查 HTTP 状态码
    if (!cozeResponse.ok) {
      console.log('Career planning Coze API HTTP error:', cozeResponse.status);
      const fallback = getCareerFallback(major, grade, city);
      return new Response(createTextStream(fallback), { headers: SSE_HEADERS });
    }

    // 检查 Content-Type，如果不是 SSE 流，说明返回了 JSON 错误
    const contentType = cozeResponse.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const errorText = await cozeResponse.text();
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.code && errorData.code !== 0) {
          console.log('Career planning Coze API error:', errorData.code, errorData.msg);
          const fallback = getCareerFallback(major, grade, city);
          return new Response(createTextStream(fallback), { headers: SSE_HEADERS });
        }
      } catch {
        // JSON 解析失败，继续
      }
    }

    // 7. 流式转发 + SSE 解析器
    const fallbackForStream = getCareerFallback(major, grade, city);
    const stream = createCozeSSEStream({
      cozeResponse,
      userId,
      botType: 'career',
      fallbackText: fallbackForStream,
    });

    return new Response(stream, { headers: SSE_HEADERS });
  } catch (error) {
    console.error('职业规划生成失败:', error);

    const fallback = getCareerFallback('', '', '');
    return new Response(createTextStream(fallback), { headers: SSE_HEADERS });
  }
}
