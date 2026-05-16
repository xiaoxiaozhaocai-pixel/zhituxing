/**
 * Coze 智能体公共模块
 * 提供用户验证、流式解析、结构化数据保存等复用逻辑
 */

import { NextRequest } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 用户信息类型
export interface UserInfo {
  userId: string;
  userType: string; // 'free' | 'member'
}

/**
 * 1. 用户验证 — 查 user_profiles 表，返回 { userId, userType }
 */
export async function getUserInfoFromRequest(request: NextRequest): Promise<UserInfo | null> {
  const userId = request.headers.get('x-user-id');
  if (!userId) return null;

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/user_profiles?user_id=eq.${userId}&select=user_id,user_type&limit=1`,
      {
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
        },
      }
    );

    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        return {
          userId,
          userType: data[0].user_type || 'free',
        };
      }
    }
  } catch (e) {
    console.error('User validation error:', e);
  }

  return null;
}

/**
 * 2. 获取用户个人信息并构建上下文
 */
export async function getUserProfileContext(userId: string): Promise<string> {
  try {
    const result = await execSql(
      `SELECT personality_type, major, grade, graduation_year, city, 
              job_intention, skills, internship_experience, project_experience, awards,
              ability_background
       FROM user_profiles 
       WHERE user_id = '${userId}' 
       LIMIT 1`
    );

    if (!result || result.length === 0) {
      return '';
    }

    const profile = result[0] as {
      personality_type: string | null;
      major: string | null;
      grade: string | null;
      graduation_year: number | null;
      city: string | null;
      job_intention: string | null;
      skills: string | null;
      internship_experience: string | null;
      project_experience: string | null;
      awards: string | null;
      ability_background: string | null;
    };

    const contextParts: string[] = [];

    if (profile.personality_type) contextParts.push(`人格测评结果：${profile.personality_type}`);
    if (profile.major) contextParts.push(`专业：${profile.major}`);
    if (profile.grade) contextParts.push(`年级：${profile.grade}`);
    if (profile.graduation_year) contextParts.push(`毕业年份：${profile.graduation_year}年`);
    if (profile.city) contextParts.push(`意向工作城市：${profile.city}`);
    if (profile.job_intention) contextParts.push(`求职意向：${profile.job_intention}`);
    if (profile.skills) contextParts.push(`已掌握技能：${profile.skills}`);

    // 解析 ability_background 结构化数据
    if (profile.ability_background) {
      try {
        const ab = typeof profile.ability_background === 'string'
          ? JSON.parse(profile.ability_background)
          : profile.ability_background;
        if (ab.professional_skills?.length) {
          contextParts.push(`专业核心技能：${ab.professional_skills.join('、')}`);
        }
        if (ab.office_skills) {
          const officeParts: string[] = [];
          if (ab.office_skills.default_selected?.length) officeParts.push(...ab.office_skills.default_selected);
          if (ab.office_skills.custom_skills?.length) officeParts.push(...ab.office_skills.custom_skills);
          if (officeParts.length) contextParts.push(`办公软件技能：${officeParts.join('、')}`);
        }
        if (ab.language_abilities?.length) {
          const langStr = ab.language_abilities
            .map((l: { language?: string; level?: string; proficiency?: string }) =>
              `${l.language || ''}${l.level ? ' ' + l.level : ''}${l.proficiency ? '（' + l.proficiency + '）' : ''}`)
            .join('、');
          if (langStr) contextParts.push(`外语能力：${langStr}`);
        }
        if (ab.certificates?.length) {
          contextParts.push(`职业技能证书：${ab.certificates.join('、')}`);
        }
      } catch {
        // 解析失败，忽略
      }
    }

    if (profile.internship_experience) contextParts.push(`实习经历：${profile.internship_experience}`);
    if (profile.project_experience) contextParts.push(`项目经历：${profile.project_experience}`);
    if (profile.awards) contextParts.push(`获奖情况：${profile.awards}`);

    if (contextParts.length === 0) return '';

    return `\n【用户个人信息（已保存）】\n${contextParts.join('\n')}\n请基于以上用户信息提供个性化建议。\n---\n`;
  } catch (error) {
    console.error('获取用户个人信息失败:', error);
    return '';
  }
}

/**
 * 3. 保存结构化数据到 Supabase
 * 根据 dataType 映射到对应表
 */
export async function saveStructuredData(
  botType: string | undefined,
  userId: string,
  dataType: string,
  jsonData: Record<string, unknown>
): Promise<void> {
  try {
    const now = new Date().toISOString();
    const jsonStr = JSON.stringify(jsonData).replace(/'/g, "''");

    // 优先按 dataType 判断表，其次按 botType
    if (dataType === 'interview_result' || botType === 'interview') {
      await execSql(
        `INSERT INTO interview_results (user_id, result_data, created_at) 
         VALUES ('${userId}', '${jsonStr}', '${now}')`
      );
    } else if (dataType === 'career_plan' || botType === 'career') {
      await execSql(
        `INSERT INTO career_plans (user_id, plan_data, created_at) 
         VALUES ('${userId}', '${jsonStr}', '${now}')`
      );
    } else if (dataType === 'jd_match' || dataType === 'skill_job_match' || botType === 'jobs') {
      await execSql(
        `INSERT INTO skill_job_match (user_id, match_data, created_at) 
         VALUES ('${userId}', '${jsonStr}', '${now}')`
      );
    } else if (dataType === 'skill_assessment' || botType === 'assessment') {
      await execSql(
        `INSERT INTO assessment_results (user_id, result_data, created_at) 
         VALUES ('${userId}', '${jsonStr}', '${now}')`
      );
    }
    console.log(`结构化数据已保存: botType=${botType}, type=${dataType}`);
  } catch (error) {
    console.error('保存结构化数据失败:', error);
  }
}

/**
 * 4. 创建 Coze API 的流式请求
 * 包含 custom_variables 和用户上下文注入
 */
export async function callCozeStreamApi(params: {
  botId: string;
  message: string;
  userType: string;
  conversationId?: string;
  userContext?: string;
}): Promise<Response> {
  const finalMessage = (params.userContext || '') + params.message;

  return fetch('https://api.coze.cn/v3/chat', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.COZE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      bot_id: params.botId,
      conversation_id: params.conversationId || '',
      stream: true,
      auto_save_history: true,
      custom_variables: {
        user_type: params.userType || 'free',
      },
      additional_messages: [
        {
          role: 'user',
          content: finalMessage,
          content_type: 'text',
        },
      ],
    }),
  });
}

/**
 * 5. Coze SSE 流解析 + 结构化数据提取
 * 边读边转发，解析 <<DATA:type=xxx>>...<<END>> 标记
 * 
 * 返回一个 ReadableStream，可直接作为 Response body
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
      const reader = cozeResponse.body?.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();

      if (!reader) {
        controller.close();
        return;
      }

      // SSE 解析状态
      let buffer = '';
      let isFirstChunk = true;

      // 结构化数据标记的正则（容错：允许多余空格、大小写变化）
      const dataStartRegex = /<<\s*DATA\s*:\s*type\s*=\s*(\w+)\s*>>/i;
      const dataEndRegex = /<<\s*END\s*>>/i;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });

          // 第一个 chunk 检查是否为 Coze 错误 JSON
          if (isFirstChunk) {
            isFirstChunk = false;
            const trimmed = chunk.trim();
            if (trimmed.startsWith('{')) {
              try {
                const potentialError = JSON.parse(trimmed);
                if (potentialError.code && potentialError.code !== 0) {
                  console.log('Coze API stream error:', potentialError.code, potentialError.msg);
                  controller.enqueue(encoder.encode(fallbackText));
                  break;
                }
              } catch {
                // 不是完整 JSON，可能是 SSE 格式的开始，正常处理
              }
            }
          }

          // 将新 chunk 追加到缓冲区
          buffer += chunk;

          // 解析结构化数据标记 <<DATA:type=xxx>>...<<END>>
          let searchStart = 0;
          while (searchStart < buffer.length) {
            const startMatch = buffer.substring(searchStart).match(dataStartRegex);

            if (!startMatch) {
              // 没有找到 <<DATA: 标记，检查 buffer 尾部是否有部分匹配
              const lastLt = buffer.lastIndexOf('<<', searchStart);
              if (lastLt > searchStart && lastLt > buffer.length - 20) {
                // 可能是未完成的标记，保留
                const textToForward = buffer.substring(searchStart, lastLt);
                if (textToForward) {
                  controller.enqueue(encoder.encode(textToForward));
                }
                buffer = buffer.substring(lastLt);
                break;
              }
              // 没有部分标记，全部转发
              const textToForward = buffer.substring(searchStart);
              if (textToForward) {
                controller.enqueue(encoder.encode(textToForward));
              }
              buffer = '';
              break;
            }

            const dataType = startMatch[1];
            const dataStartPos = searchStart + startMatch.index! + startMatch[0].length;

            // 转发标记前的普通文本
            if (startMatch.index! > 0) {
              const textBefore = buffer.substring(searchStart, searchStart + startMatch.index!);
              if (textBefore) {
                controller.enqueue(encoder.encode(textBefore));
              }
            }

            // 查找 <<END>>
            const endMatch = buffer.substring(dataStartPos).match(dataEndRegex);

            if (!endMatch) {
              // <<END>> 还没到，保留从 <<DATA: 开始的缓冲，等更多数据
              buffer = buffer.substring(searchStart + startMatch.index!);
              break;
            }

            // 提取结构化数据
            const jsonStr = buffer.substring(dataStartPos, dataStartPos + endMatch.index!);
            const afterEndPos = dataStartPos + endMatch.index! + endMatch[0].length;

            try {
              const jsonData = JSON.parse(jsonStr);

              // 通过特殊 SSE 事件推送给前端
              const structuredEvent = `event: structured_data\ndata: ${JSON.stringify({ type: dataType, data: jsonData })}\n\n`;
              controller.enqueue(encoder.encode(structuredEvent));

              // 异步保存到 Supabase（不 await，避免阻塞流）
              if (userId) {
                saveStructuredData(botType, userId, dataType, jsonData).catch(err =>
                  console.error('Background save error:', err)
                );
              }
            } catch (parseErr) {
              console.error('结构化数据JSON解析失败:', parseErr);
              // 解析失败，原样转发
              controller.enqueue(encoder.encode(`<<DATA:type=${dataType}>>${jsonStr}<<END>>`));
            }

            // 继续处理 <<END>> 之后的内容
            searchStart = afterEndPos;
          }
        }

        // 处理 buffer 中剩余的内容
        if (buffer) {
          controller.enqueue(encoder.encode(buffer));
        }
      } finally {
        reader.releaseLock();
        controller.close();
      }
    },
  });
}

/**
 * 6. 流式返回纯文本（fallback 用，模拟打字效果）
 */
export function createTextStream(text: string): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      let index = 0;
      const chunkSize = 5;

      while (index < text.length) {
        const chunk = text.slice(index, index + chunkSize);
        controller.enqueue(new TextEncoder().encode(chunk));
        index += chunkSize;
        await new Promise(resolve => setTimeout(resolve, 30));
      }

      controller.close();
    },
  });
}
