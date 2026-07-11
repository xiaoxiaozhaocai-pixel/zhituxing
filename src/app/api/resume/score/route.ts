export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUserId } from '@/lib/auth';
import { deepSeekChat, ChatMessage } from '@/lib/deepseek-chat';
import { checkRateLimit } from '@/lib/rate-limit';

const supabase = getSupabaseAdmin();

/**
 * Truncate resume text to ~8000 chars while keeping core paragraphs
 * Preserves the most content-rich paragraphs by preferring longer segments
 */
function truncateResumeText(text: string, maxChars: number = 8000): string {
  if (text.length <= maxChars) return text;

  const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 0);
  
  // Sort by length descending, pick the longest ones that fit
  paragraphs.sort((a, b) => b.trim().length - a.trim().length);
  
  let result = '';
  for (const para of paragraphs) {
    if ((result + '\n' + para).length <= maxChars) {
      result += (result ? '\n' : '') + para;
    }
  }
  
  // If even one paragraph is too long, truncate it
  if (!result) {
    result = text.slice(0, maxChars);
  }
  
  return result;
}

/**
 * Clean and parse LLM JSON response
 * Removes markdown code block wrappers and attempts to fix common formatting issues
 */
function parseLLMResponse(content: string): any {
  // Remove markdown code block markers
  let cleaned = content.trim();
  
  // Remove ```json ... ``` wrappers
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
  cleaned = cleaned.replace(/```\s*$/, '');
  
  // Remove leading/trailing whitespace
  cleaned = cleaned.trim();
  
  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Attempt fixes for common issues
    let fixed = cleaned;
    
    // Remove trailing commas before closing brackets
    fixed = fixed.replace(/,\s*([}\]])/g, '$1');
    
    // Try to fix unquoted string values (values that should be strings but aren't quoted)
    fixed = fixed.replace(/(:\s*)([^",\]})\s{].*?)(\s*[,}\]])/g, (_, prefix, value, suffix) => {
      // Only fix if it looks like an unquoted string (not a number)
      if (!/^-?\d+(\.\d+)?$/.test(value.trim()) && value.trim() !== 'null' && value.trim() !== 'true' && value.trim() !== 'false') {
        return `${prefix}"${value.trim()}"${suffix}`;
      }
      return _;
    });
    
    try {
      return JSON.parse(fixed);
    } catch (e2) {
      throw new Error('Failed to parse LLM response as JSON');
    }
  }
}

/**
 * Validate the parsed score data structure
 */
function validateScoreData(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  if (typeof data.overall_score !== 'number') return false;
  if (!Array.isArray(data.dimensions)) return false;
  if (!Array.isArray(data.improvements)) return false;
  
  for (const dim of data.dimensions) {
    if (!dim.name || typeof dim.name !== 'string') return false;
    if (typeof dim.score !== 'number') return false;
    if (!dim.comment || typeof dim.comment !== 'string') return false;
  }
  
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 2. Rate limiting
    const rateLimitResult = checkRateLimit(`resume_score:${userId}`, { maxRequests: 10, windowMs: 60000 });
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: '请求过于频繁，请稍后再试' },
        { status: 429 }
      );
    }

    // 3. Parse request body
    const body = await request.json();
    const { resume_text, target_job } = body;

    // 4. Validate input
    if (!resume_text || typeof resume_text !== 'string') {
      return NextResponse.json(
        { error: 'resume_text 是必填项且必须为字符串' },
        { status: 400 }
      );
    }

    if (resume_text.trim().length === 0) {
      return NextResponse.json(
        { error: '简历文本不能为空' },
        { status: 400 }
      );
    }

    // 5. Truncate text if too long
    const truncatedText = truncateResumeText(resume_text.trim());

    // 6. Build prompt
    const targetJob = target_job && typeof target_job === 'string' ? target_job.trim() : '';
    
    const systemPrompt = `你是一个专业的简历评估顾问。请根据提供的简历内容，按照以下5个维度进行评分。

评分规则：
- 每个维度0-10分，精确到0.1分
- 参考标准：≥8分优秀，6-8分良好，4-6分一般，<4分需提升
- 综合总分 = 各维度加权（权重见下方）

5个维度及权重：
1. 教育背景（权重0.15）：学校层次、专业对口、GPA
2. 技能匹配（权重0.20）：语言、工具、证书、与岗位契合度
3. 项目经验（权重0.25）：复杂度、角色贡献、成果量化程度
4. 实习经历（权重0.20）：行业对齐度、岗位对齐度、时长
5. 岗位匹配度（权重0.20）：与目标岗位要求的综合匹配度
${targetJob ? `\n目标岗位：${targetJob}` : ''}

请严格按以下JSON格式输出，不要包含其他文字：
{
  "dimensions": [
    { "name": "教育背景", "score": 0.0, "comment": "一句话评语" },
    { "name": "技能匹配", "score": 0.0, "comment": "一句话评语" },
    { "name": "项目经验", "score": 0.0, "comment": "一句话评语" },
    { "name": "实习经历", "score": 0.0, "comment": "一句话评语" },
    { "name": "岗位匹配度", "score": 0.0, "comment": "一句话评语" }
  ],
  "improvements": ["改进建议1", "改进建议2", "改进建议3", "改进建议4", "改进建议5"],
  "overall_score": 0.0
}`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: truncatedText }
    ];

    // 7. Call DeepSeek (non-streaming, temperature=0.1)
    const result = await deepSeekChat({
      messages,
      temperature: 0.1,
      maxTokens: 2048,
    });

    if (!result.content) {
      return NextResponse.json(
        { error: 'AI评分服务返回为空，请重试' },
        { status: 500 }
      );
    }

    // 8. Parse LLM response
    let scoreData: any;
    try {
      scoreData = parseLLMResponse(result.content);
    } catch (parseError) {
      console.error('[resume-score] JSON parse failed:', parseError, 'Raw:', result.content);
      return NextResponse.json(
        { error: 'AI评分结果解析失败，请重试' },
        { status: 500 }
      );
    }

    // 9. Validate parsed data structure
    if (!validateScoreData(scoreData)) {
      console.error('[resume-score] Invalid score data structure:', scoreData);
      return NextResponse.json(
        { error: 'AI评分数据格式异常，请重试' },
        { status: 500 }
      );
    }

    // 10. Build radar data
    const radarData: Record<string, number> = {};
    const dimensionsWithWeight = scoreData.dimensions.map((dim: any) => {
      radarData[dim.name] = dim.score;
      return {
        name: dim.name,
        score: dim.score,
        comment: dim.comment,
        weight: dim.name === '教育背景' ? 0.15 :
                dim.name === '技能匹配' ? 0.20 :
                dim.name === '项目经验' ? 0.25 :
                dim.name === '实习经历' ? 0.20 :
                dim.name === '岗位匹配度' ? 0.20 : 0.20
      };
    });

    // 11. Calculate weighted overall score (use LLM's if provided, otherwise calculate)
    const overallScore = scoreData.overall_score || 
      Math.round(dimensionsWithWeight.reduce((sum: number, dim: any) => sum + dim.score * dim.weight, 0) * 10) / 10;

    // 12. Store in database
    const { data: dbResult, error: dbError } = await supabase
      .from('user_resume_scores')
      .insert({
        user_id: userId,
        target_job: targetJob || null,
        overall_score: overallScore,
        dimensions: dimensionsWithWeight,
        improvements: scoreData.improvements,
        radar_data: radarData,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      console.error('[resume-score] DB insert failed:', dbError);
      // Don't fail the request if DB save fails, but log it
    }

    // 13. Return response
    return NextResponse.json({
      success: true,
      data: {
        overall_score: overallScore,
        dimensions: dimensionsWithWeight,
        improvements: scoreData.improvements,
        radar_data: radarData
      }
    });

  } catch (error) {
    console.error('[resume-score] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : '评分服务异常';
    
    // Check if it's a DeepSeek API error
    if (errorMessage.includes('DeepSeek API')) {
      return NextResponse.json(
        { error: 'AI评分服务暂时不可用，请稍后重试' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: '评分服务异常，请稍后重试' },
      { status: 500 }
    );
  }
}
