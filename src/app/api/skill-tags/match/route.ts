export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUserId } from '@/lib/auth';
import { deepSeekChat, ChatMessage } from '@/lib/deepseek-chat';

const supabase = getSupabaseAdmin();

interface SkillTagRow {
  id: number;
  name: string;
  category: string;
  industry_tags: string[];
}

interface SkillGapResult {
  required: string[];
  matched: string[];
  missing: string[];
  match_rate: number;
}

/**
 * GET /api/skill-tags/match?job_description=xxx
 * 输入岗位描述，返回技能缺口分析
 * 使用 DeepSeek 提取岗位所需技能，对比用户已有技能
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const jobDescription = request.nextUrl.searchParams.get('job_description');
    if (!jobDescription || jobDescription.trim().length === 0) {
      return NextResponse.json(
        { error: 'job_description 是必填参数' },
        { status: 400 }
      );
    }

    // 1. 获取用户已有技能
    const { data: userSkills, error: userSkillError } = await supabase
      .from('user_skill_tags')
      .select(`
        skill_id,
        skill_tags!inner(name, category)
      `)
      .eq('user_id', userId);

    if (userSkillError) throw userSkillError;

    const userSkillNames = new Set(
      (userSkills || []).map((s: { skill_tags: { name: string }[] }) => s.skill_tags[0]?.name || '')
    );

    // 2. 获取所有技能标签库
    const { data: allTags, error: tagsError } = await supabase
      .from('skill_tags')
      .select('id, name, category, industry_tags');

    if (tagsError) throw tagsError;

    const skillTagsList = (allTags || []) as SkillTagRow[];

    // 3. 用 DeepSeek 分析岗位描述，提取所需技能关键词
    const systemPrompt = `你是一个技能匹配分析专家。请分析以下岗位描述，从技能标签库中匹配最相关的技能。

技能标签库：
${skillTagsList.map((t: SkillTagRow) => `- ${t.name} (${t.category})`).join('\n')}

请严格按照以下 JSON 格式回复，不要包含其他文字：
{
  "required_skills": ["技能名1", "技能名2", ...]
}
只从上面的技能标签库中选择，不要编造。如果岗位描述要求某项技能但标签库中没有，用最接近的替代。`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: jobDescription.trim() },
    ];

    const result = await deepSeekChat({
      messages,
      temperature: 0.1,
      maxTokens: 2048,
      returnUsage: true,
    });

    if (!result.content) {
      return NextResponse.json(
        { error: 'AI分析服务返回为空，请重试' },
        { status: 500 }
      );
    }

    // 4. 解析 LLM 返回
    let cleaned = result.content.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
    cleaned = cleaned.replace(/```\s*$/, '');
    cleaned = cleaned.trim();

    let parsed: { required_skills: string[] };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // 尝试修复尾逗号
      try {
        parsed = JSON.parse(cleaned.replace(/,\s*([}\]])/g, '$1'));
      } catch {
        console.error('[skill-match] Failed to parse LLM response:', cleaned);
        return NextResponse.json(
          { error: 'AI分析结果解析失败' },
          { status: 500 }
        );
      }
    }

    const requiredSkills: string[] = parsed.required_skills || [];

    // 5. 计算匹配缺口
    const matched: string[] = [];
    const missing: string[] = [];

    for (const skill of requiredSkills) {
      if (userSkillNames.has(skill)) {
        matched.push(skill);
      } else {
        missing.push(skill);
      }
    }

    const matchRate = requiredSkills.length > 0
      ? Math.round((matched.length / requiredSkills.length) * 100)
      : 0;

    const data: SkillGapResult = {
      required: requiredSkills,
      matched,
      missing,
      match_rate: matchRate,
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[skill-match] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : '技能匹配分析异常';

    if (errorMessage.includes('DeepSeek API')) {
      return NextResponse.json(
        { error: 'AI分析服务暂时不可用，请稍后重试' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: '技能匹配分析异常' },
      { status: 500 }
    );
  }
}
