import { NextRequest, NextResponse } from 'next/server';
import { checkFeatureAccess } from '@/lib/quota';
import { execSql } from '@/lib/exec-sql';

export const runtime = 'edge';

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

// 检查是否配置了Coze
function isCozeConfigured(): boolean {
  return !!(process.env.COZE_API_KEY && process.env.COZE_BOT_ID_JOBS);
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

// 获取用户ID
async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const userId = request.headers.get('x-user-id');
  if (!userId) return null;
  
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=id&limit=1`, {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
      },
    });
    
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        return userId;
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
              job_intention, skills, internship_experience, project_experience, awards
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

// 流式返回文本
function createTextStream(text: string): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      // 模拟打字效果
      let index = 0;
      const chunkSize = 5; // 每批字符数
      
      while (index < text.length) {
        const chunk = text.slice(index, index + chunkSize);
        controller.enqueue(new TextEncoder().encode(chunk));
        index += chunkSize;
        
        // 添加延迟模拟打字
        await new Promise(resolve => setTimeout(resolve, 30));
      }
      
      controller.close();
    },
  });
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

    const userId = await getUserIdFromRequest(request);
    const botId = selectBotId(botType);
    const apiKey = process.env.COZE_API_KEY;

    // 获取用户个人信息上下文
    let userContext = '';
    if (userId) {
      userContext = await getUserProfileContext(userId);
    }

    // 构建最终消息（用户上下文 + 用户输入）
    const finalMessage = userContext + message;

    // 检查配额（非会员需要扣减）- 根据bot类型判断
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

    // 调用Coze API
    const response = await fetch('https://api.coze.cn/v3/chat', {
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
        additional_messages: [
          {
            role: 'user',
            content: finalMessage,
            content_type: 'text',
          },
        ],
      }),
    });

    // 检查Coze API响应是否有效
    async function checkCozeResponse(response: Response): Promise<boolean> {
      if (!response.ok) return false;
      
      // 检查响应内容是否是错误
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const text = await response.text();
        try {
          const data = JSON.parse(text);
          // 检查Coze的错误码
          if (data.code && data.code !== 0) {
            console.log('Coze API error:', data.code, data.msg);
            return false;
          }
        } catch (e) {
          return true;
        }
      }
      return true;
    }
    
    // 先读取响应判断是否成功
    const responseText = await response.text();
    let isValidResponse = true;
    
    try {
      const data = JSON.parse(responseText);
      if (data.code && data.code !== 0) {
        console.log('Coze API error:', data.code, data.msg);
        isValidResponse = false;
      }
    } catch (e) {
      // 不是JSON，使用原始响应
    }
    
    if (!isValidResponse) {
      // API返回错误，使用fallback
      const fallback = getFallbackResponse(botType, message);
      return new Response(createTextStream(fallback), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
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

    // 流式响应
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        if (!reader) {
          controller.close();
          return;
        }
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
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
