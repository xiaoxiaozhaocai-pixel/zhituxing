/**
 * 职业规划报告生成核心逻辑 — /api/career-planning/generate 与 chat 工具执行器（方向四）共用
 * 行为与原 route 实现保持一致（prompt / 解析 / 落库口径不变），仅做位置抽离。
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import { chatWithDS } from '@/lib/deepseek/client';

export interface GeneratePlanParams {
  userId: string;
  major: string;
  grade: string;
  city?: string;
  targetIndustry?: string;
  targetJob?: string;
}

export interface GeneratePlanResult {
  id: string;
  coreJobs: { name?: string; match_score?: number; industry?: string; city?: string; salary_range?: string }[];
  dimensions: Record<string, number>;
}

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
  "dimension_insight": {
    "personality": { "evidence": "可观察行为依据", "reason": "判定理由", "path": "提升路径", "suggestion": "改进建议" },
    "major": { "evidence": "可观察行为依据", "reason": "判定理由", "path": "提升路径", "suggestion": "改进建议" },
    "ability": { "evidence": "可观察行为依据", "reason": "判定理由", "path": "提升路径", "suggestion": "改进建议" },
    "interest": { "evidence": "可观察行为依据", "reason": "判定理由", "path": "提升路径", "suggestion": "改进建议" },
    "values": { "evidence": "可观察行为依据", "reason": "判定理由", "path": "提升路径", "suggestion": "改进建议" },
    "risk": { "evidence": "可观察行为依据", "reason": "判定理由", "path": "提升路径", "suggestion": "改进建议" }
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
- dimension_insight 为每个维度提供判断力解释：evidence=可观察行为依据（基于用户专业/年级/意向等具体信息，禁止空泛套话）、reason=判定理由（为什么这样判断）、path=提升路径（可执行行动路线）、suggestion=改进建议（一句可落地建议）。判断力不等于打分，必须给出"依据+理由+路径+建议"，禁止只给分数不给判断；每条 40-80 字，具体、可背调、不编造。
- core_jobs 推荐 3 个最匹配岗位，match_score 0-100
- skills_gap 列出 4-6 个核心技能缺口
- action_plan 列出 6 个月的行动计划
- career_path 分 3 个阶段`;

export async function generateCareerPlan(params: GeneratePlanParams): Promise<GeneratePlanResult> {
  const { userId, major, grade, city, targetIndustry, targetJob } = params;

  const userContext = `【个人信息】
- 专业：${major}
- 年级：${grade}
- 意向城市：${city || '不限'}
${targetIndustry ? `- 目标行业：${targetIndustry}` : ''}
${targetJob ? `- 目标岗位：${targetJob}` : ''}

请根据以上信息，生成一份完整的职业规划报告 JSON。`;

  const result = await chatWithDS({
    messages: [
      { role: 'system', content: GENERATE_SYSTEM_PROMPT },
      { role: 'user', content: userContext },
    ],
    temperature: 0.7,
    max_tokens: 4096,
  });

  const content = result.content.trim();
  const jsonStart = content.indexOf('{');
  const jsonEnd = content.lastIndexOf('}');

  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error('AI 返回格式异常');
  }

  const planData = JSON.parse(content.slice(jsonStart, jsonEnd + 1)) as {
    core_jobs?: GeneratePlanResult['coreJobs'];
    dimensions?: Record<string, number>;
  };

  if (!planData.core_jobs || !planData.dimensions) {
    throw new Error('AI 返回数据不完整');
  }

  const supabase = getSupabaseAdmin();
  const { data: plan, error } = await supabase
    .from('career_plans')
    .insert({
      user_id: userId,
      target_job: planData.core_jobs[0]?.name || targetJob || '',
      target_industry: targetIndustry || planData.core_jobs[0]?.industry || '',
      current_match_score: planData.core_jobs[0]?.match_score || 0,
      plan_data: planData,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) throw error;

  return {
    id: plan.id,
    coreJobs: planData.core_jobs,
    dimensions: planData.dimensions,
  };
}
