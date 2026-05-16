import { NextRequest } from 'next/server';
import { checkFeatureAccess } from '@/lib/quota';
import { execSql } from '@/lib/exec-sql';

export const runtime = 'edge';

// 用户验证结果
interface UserInfo {
  userId: string;
  userType: string; // 'free' | 'member'
}

// 智能体路由选择
function selectBotId(botType?: string): string {
  const jobsBotId = process.env.COZE_BOT_ID_JOBS;
  const interviewBotId = process.env.COZE_BOT_ID_INTERVIEW;
  const decisionBotId = process.env.COZE_BOT_ID_DECISION;
  
  // 如果指定了bot类型，返回对应的ID（可能为空）
  if (botType === 'jobs') return jobsBotId || '';
  if (botType === 'interview') return interviewBotId || '';
  if (botType === 'decision') return decisionBotId || '';
  if (botType === 'career') return decisionBotId || '';
  
  // 默认返回岗位百科ID
  return jobsBotId || '';
}

// 预设回复（Coze未配置时的fallback）
function getFallbackResponse(botType?: string, message?: string): string {
  const msgLower = (message || '').toLowerCase();
  
  if (botType === 'interview' || msgLower.includes('面试')) {
    return `您好！我是您的AI模拟面试官。

要开始模拟面试，请先告诉我以下信息：

1️⃣ **您应聘的岗位**（如：互联网产品经理）
2️⃣ **您的简历**（可以粘贴文字版简历）
3️⃣ **目标公司**（可选）

准备好后，我会按照标准面试流程与您互动：

📋 **面试流程：**
• 简历初筛
• HR初面（电话）
• 业务二面
• 高管终面
• 复盘反馈

请提供信息开始吧！`;
  }
  
  if (botType === 'decision' || msgLower.includes('考研') || msgLower.includes('就业')) {
    return `您好！我是考研就业决策助手，专注于帮助大学生做出最佳选择。

请告诉我以下信息，我来为您分析：

📊 **基本信息：**
• 您的专业：
• 当前年级：
• 成绩排名（如：前20%）：

🔍 **我可以帮您分析：**
• 考研vs就业的优劣势对比
• 适合您的考研院校推荐
• 匹配的就业岗位分析
• 详细的备考/求职时间线

请提供您的信息，开始个性化分析！`;
  }
  
  if (botType === 'career' || msgLower.includes('职业规划')) {
    return `您好！我是AI职业生涯规划助手。

请告诉我您的：

🎯 **基本信息：**
• 所学专业：
• 所在年级：
• 职业兴趣方向：

📈 **我能帮您规划：**
• 根据目标岗位的成长路径
• 大一到大四的分阶段计划
• 所需技能和证书
• 实习和项目建议

请提供信息，我来为您定制专属规划！`;
  }
  
  // 默认岗位百科回复
  return `👋 您好！我是「职途星——职搭子」，您的专属岗位百科助手。

🔍 **我可以帮您查询：**

• **岗位信息**：直接输入岗位名称，如「Java开发」「产品经理」「新媒体运营」

• **按地点推荐**：告诉我城市，如「深圳」「上海」「北京」

• **按薪资推荐**：告诉我薪资范围，如「10k-15k」「5k-8k」

• **按背景匹配**：告诉我您的专业和学历，如「计算机专业，本科」

• **智能组合**：多个条件组合，如「深圳Java开发15k-20k」

📚 覆盖互联网/金融/制造/教育/医疗等15+主流行业

请告诉我您的需求！`;
}

// 1. 用户验证改查user_profiles表，返回 { userId, userType }
async function getUserInfoFromRequest(request: NextRequest): Promise<UserInfo | null> {
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

// 获取用户个人信息并构建上下文
async function getUserProfileContext(userId: string): Promise<string> {
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

    // 构建用户信息上下文
    const contextParts: string[] = [];
    
    if (profile.personality_type) {
      contextParts.push(`人格测评结果：${profile.personality_type}`);
    }
    if (profile.major) {
      contextParts.push(`专业：${profile.major}`);
    }
    if (profile.grade) {
      contextParts.push(`年级：${profile.grade}`);
    }
    if (profile.graduation_year) {
      contextParts.push(`毕业年份：${profile.graduation_year}年`);
    }
    if (profile.city) {
      contextParts.push(`意向工作城市：${profile.city}`);
    }
    if (profile.job_intention) {
      contextParts.push(`求职意向：${profile.job_intention}`);
    }
    if (profile.skills) {
      contextParts.push(`已掌握技能：${profile.skills}`);
    }
    // 解析ability_background结构化数据
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
          if (ab.office_skills.default_selected?.length) {
            officeParts.push(...ab.office_skills.default_selected);
          }
          if (ab.office_skills.custom_skills?.length) {
            officeParts.push(...ab.office_skills.custom_skills);
          }
          if (officeParts.length) {
            contextParts.push(`办公软件技能：${officeParts.join('、')}`);
          }
        }
        if (ab.language_abilities?.length) {
          const langStr = ab.language_abilities
            .map((l: { language?: string; level?: string; proficiency?: string }) => 
              `${l.language || ''}${l.level ? ' ' + l.level : ''}${l.proficiency ? '（' + l.proficiency + '）' : ''}`)
            .join('、');
          if (langStr) {
            contextParts.push(`外语能力：${langStr}`);
          }
        }
        if (ab.certificates?.length) {
          contextParts.push(`职业技能证书：${ab.certificates.join('、')}`);
        }
      } catch {
        // 解析失败，忽略
      }
    }
    if (profile.internship_experience) {
      contextParts.push(`实习经历：${profile.internship_experience}`);
    }
    if (profile.project_experience) {
      contextParts.push(`项目经历：${profile.project_experience}`);
    }
    if (profile.awards) {
      contextParts.push(`获奖情况：${profile.awards}`);
    }

    if (contextParts.length === 0) {
      return '';
    }

    return `\n【用户个人信息（已保存）】\n${contextParts.join('\n')}\n请基于以上用户信息提供个性化建议。\n---\n`;
  } catch (error) {
    console.error('获取用户个人信息失败:', error);
    return '';
  }
}

// 流式返回文本（fallback用）
function createTextStream(text: string): ReadableStream {
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

// 4. 保存结构化数据到Supabase
async function saveStructuredData(
  botType: string | undefined,
  userId: string,
  dataType: string,
  jsonData: Record<string, unknown>
): Promise<void> {
  try {
    const now = new Date().toISOString();
    
    if (botType === 'interview') {
      await execSql(
        `INSERT INTO interview_results (user_id, result_data, created_at) 
         VALUES ('${userId}', '${JSON.stringify(jsonData).replace(/'/g, "''")}', '${now}')`
      );
    } else if (botType === 'career') {
      await execSql(
        `INSERT INTO career_plans (user_id, plan_data, created_at) 
         VALUES ('${userId}', '${JSON.stringify(jsonData).replace(/'/g, "''")}', '${now}')`
      );
    } else if (botType === 'jobs' || dataType === 'skill_job_match') {
      await execSql(
        `INSERT INTO skill_job_match (user_id, match_data, created_at) 
         VALUES ('${userId}', '${JSON.stringify(jsonData).replace(/'/g, "''")}', '${now}')`
      );
    }
    console.log(`结构化数据已保存: botType=${botType}, type=${dataType}`);
  } catch (error) {
    console.error('保存结构化数据失败:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message, botType, conversationId } = await request.json();
    
    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: '消息内容不能为空' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. 改为获取UserInfo对象
    const userInfo = await getUserInfoFromRequest(request);
    const userId = userInfo?.userId || null;
    const userType = userInfo?.userType || 'free';
    const botId = selectBotId(botType);
    const apiKey = process.env.COZE_API_KEY;

    // 获取用户个人信息上下文
    let userContext = '';
    if (userId) {
      userContext = await getUserProfileContext(userId);
    }

    // 构建最终消息（用户上下文 + 用户输入）
    const finalMessage = userContext + message;

    // 检查配额（非会员需要扣减）
    if (userId && !apiKey) {
      const feature = botType === 'interview' ? 'interview' : 
                      botType === 'assessment' ? 'assessment' : 'career_planning';
      const access = await checkFeatureAccess(userId, feature);
      if (!access.allowed) {
        return new Response(
          JSON.stringify({ error: 'quota_exceeded', message: access.reason }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // 如果没有配置Coze API，使用fallback
    if (!apiKey || !botId) {
      console.log('Coze API not configured, using fallback response');
      const fallback = getFallbackResponse(botType, message);
      return new Response(createTextStream(fallback), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // 2. 调用Coze API，添加custom_variables
    const cozeResponse = await fetch('https://api.coze.cn/v3/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bot_id: botId,
        conversation_id: conversationId || '',
        stream: true,
        auto_save_history: true,
        custom_variables: {
          user_type: userType || 'free',
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

    // 先检查HTTP状态码
    if (!cozeResponse.ok) {
      console.log('Coze API HTTP error:', cozeResponse.status);
      const fallback = getFallbackResponse(botType, message);
      return new Response(createTextStream(fallback), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // 检查Content-Type，如果不是SSE流，说明返回了JSON错误
    const contentType = cozeResponse.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      // 非流式响应，可能是错误
      const errorText = await cozeResponse.text();
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.code && errorData.code !== 0) {
          console.log('Coze API error:', errorData.code, errorData.msg);
          const fallback = getFallbackResponse(botType, message);
          return new Response(createTextStream(fallback), {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            },
          });
        }
      } catch {
        // JSON解析失败，继续
      }
    }

    // 获取配额信息
    let quotaInfo = { remaining: -1, isMember: false };
    if (userId) {
      const access = await checkFeatureAccess(userId, 'career_planning');
      quotaInfo = {
        remaining: access.remaining ?? 0,
        isMember: access.allowed && (access.remaining === -1 || access.remaining === undefined)
      };
    }

    const finalUserId = userId;
    const finalBotType = botType;

    // 3+4. 真正的流式转发 + SSE解析器
    const stream = new ReadableStream({
      async start(controller) {
        const reader = cozeResponse.body?.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        
        if (!reader) {
          controller.close();
          return;
        }

        // SSE解析状态
        let buffer = '';          // 未匹配的文本缓冲
        let isFirstChunk = true;  // 用于检查第一个chunk是否为错误JSON

        // 结构化数据标记的正则
        const dataStartRegex = /<<DATA:type=(\w+)>>/;
        const dataEndRegex = /<<END>>/;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            
            // 第一个chunk检查是否为Coze错误JSON
            if (isFirstChunk) {
              isFirstChunk = false;
              const trimmed = chunk.trim();
              if (trimmed.startsWith('{')) {
                try {
                  const potentialError = JSON.parse(trimmed);
                  if (potentialError.code && potentialError.code !== 0) {
                    console.log('Coze API stream error:', potentialError.code, potentialError.msg);
                    const fallback = getFallbackResponse(finalBotType, message);
                    controller.enqueue(encoder.encode(fallback));
                    break;
                  }
                } catch {
                  // 不是完整JSON，可能是SSE格式的开始，正常处理
                }
              }
            }

            // 将新chunk追加到缓冲区
            buffer += chunk;

            // 解析结构化数据标记 <<DATA:type=xxx>>...<<END>>
            let searchStart = 0;
            while (searchStart < buffer.length) {
              const startMatch = buffer.substring(searchStart).match(dataStartRegex);
              
              if (!startMatch) {
                // 没有找到 <<DATA: 标记，检查buffer尾部是否有部分匹配
                // 保留最后可能不完整的部分
                const lastLt = buffer.lastIndexOf('<<', searchStart);
                if (lastLt > searchStart && lastLt > buffer.length - 20) {
                  // 可能是未完成的标记，保留到最后
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
                
                // 通过特殊SSE事件推送给前端
                const structuredEvent = `event: structured_data\ndata: ${JSON.stringify({ type: dataType, data: jsonData })}\n\n`;
                controller.enqueue(encoder.encode(structuredEvent));

                // 异步保存到Supabase
                if (finalUserId) {
                  // 不await，避免阻塞流
                  saveStructuredData(finalBotType, finalUserId, dataType, jsonData).catch(err => 
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

          // 处理buffer中剩余的内容
          if (buffer) {
            controller.enqueue(encoder.encode(buffer));
          }
        } finally {
          reader.releaseLock();
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Quota-Remaining': String(quotaInfo.remaining),
        'X-Is-Member': String(quotaInfo.isMember),
      },
    });
  } catch (error) {
    console.error('Chat API Error:', error);
    
    // 出错时使用fallback
    const fallback = getFallbackResponse();
    return new Response(createTextStream(fallback), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }
}
