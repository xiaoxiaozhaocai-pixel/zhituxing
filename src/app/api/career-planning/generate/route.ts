import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth';
import { chatWithDS } from '@/lib/deepseek/client';
export const dynamic = 'force-dynamic';

const supabase = getSupabaseAdmin();

const GENERATE_SYSTEM_PROMPT = `你是一个专业的职业规划分析师。根据用户提供的个人信息，生成一份结构化职业规划报告。

## 输出格式
必须返回以下 JSON 结构（只输出 JSON，不要其他内容）：

{
  "major": "用户专业",
  "grade": "用户年级",
  "city": "用户意向城市",
  "core_jobs": [
    {
      "name": "推荐岗位名称",
      "match_score": 85,
      "industry": "所属行业",
      "city": "工作城市",
      "salary_range": "薪资范围"
    }
  ],
  "dimensions": {
    "personality": 70,
    "major": 75,
    "ability": 60,
    "interest": 80,
    "values": 65,
    "risk": 50
  },
  "career_path": [
    { "stage": "短期（0-1年）", "action": "具体行动描述" },
    { "stage": "中期（1-3年）", "action": "具体行动描述" },
    { "stage": "长期（3-5年）", "action": "具体行动描述" }
  ],
  "skills_gap": [
    { "skill": "技能名称", "current": 40, "target": 80 }
  ],
  "action_plan": [
    { "month": "第1个月", "task": "具体任务", "status": "pending" },
    { "month": "第2个月", "task": "具体任务", "status": "pending" },
    { "month": "第3个月", "task": "具体任务", "status": "pending" }
  ]
}

## 评分说明
- dimensions 各项 0-100：personality=性格匹配度, major=专业匹配度, ability=能力匹配度, interest=兴趣匹配度, values=价值观匹配度, risk=风险承受度
- core_jobs 推荐 3 个最匹配岗位，match_score 0-100
- skills_gap 列出 4-6 个核心技能缺口
- action_plan 列出 6 个月的行动计划
- career_path 分 3 个阶段`;

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ code: 401, message: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { major, grade, city, targetIndustry, targetJob } = body;

    if (!major || !grade) {
      return NextResponse.json({ code: 400, message: '请填写专业和年级' }, { status: 400 });
    }

    // Build user profile context
    const userContext = `【个人信息】
- 专业：${major}
- 年级：${grade}
- 意向城市：${city || '不限'}
${targetIndustry ? `- 目标行业：${targetIndustry}` : ''}
${targetJob ? `- 目标岗位：${targetJob}` : ''}

请根据以上信息，生成一份完整的职业规划报告 JSON。`;

    // Call DeepSeek to generate report
    const result = await chatWithDS({
      messages: [
        { role: 'system', content: GENERATE_SYSTEM_PROMPT },
        { role: 'user', content: userContext },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    });

    // Parse JSON from response
    const content = result.content.trim();
    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}');
    
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('AI 返回格式异常');
    }

    const planData = JSON.parse(content.slice(jsonStart, jsonEnd + 1));

    // Validate required fields
    if (!planData.core_jobs || !planData.dimensions) {
      throw new Error('AI 返回数据不完整');
    }

    // Save to database
    const { data: plan, error } = await supabase
      .from('career_plans')
      .insert({
        user_id: user.id,
        target_job: planData.core_jobs[0]?.name || targetJob || '',
        target_industry: targetIndustry || planData.core_jobs[0]?.industry || '',
        current_match_score: planData.core_jobs[0]?.match_score || 0,
        plan_data: planData,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) throw error;

    return NextResponse.json({
      code: 200,
      data: { id: plan.id },
      message: '报告生成成功',
    });
  } catch (error) {
    console.error('生成规划失败:', error);
    const msg = error instanceof Error ? error.message : '生成失败';
    return NextResponse.json({ code: 500, message: msg }, { status: 500 });
  }
}
