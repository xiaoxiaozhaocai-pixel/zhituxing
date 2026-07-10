/**
 * 简历综合评分 API v2 — 6维度结构化评估
 * POST /api/resume/score
 * 
 * 输入：{ resumeData, targetJob? }
 * 输出：{ overallScore, summary, dimensions[], improvements[], radarData }
 * 
 * 参考：北森面试评价表（十分制/评价维度/自动计分）+ 职途星C端优化方案
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;
const DEEPSEEK_MODEL = process.env.MODEL || 'deepseek-chat';

const SCORE_PROMPT = `你是专业简历评估专家。
请根据提供的简历内容，从以下6个维度进行结构化评分（每项1-10分），并给出总分（百分制）。

评分维度说明：
1. 教育背景 - 学校层次、专业对口度、学历匹配度
2. 技能匹配 - 硬技能(工具/证书/语言)与目标岗位的契合度
3. 项目经验 - 项目复杂度、角色贡献、成果量化程度
4. 实习经历 - 行业对齐度、岗位对齐度、实习时长与深度
5. 岗位匹配度 - 综合评估与目标岗位的适配程度（若无目标岗位则为通用匹配度）
6. 综合竞争力 - 上述维度的加权综合评估

每个维度需附具体评语(comment)和权重(weight, 总和=1.0)。

返回严格 JSON（不要markdown包裹）：
{
  "overallScore": 72,
  "summary": "一句话总体评价",
  "dimensions": [
    {"name": "教育背景", "score": 8, "maxScore": 10, "weight": 0.15, "comment": "评语"},
    {"name": "技能匹配", "score": 6, "maxScore": 10, "weight": 0.20, "comment": "评语"},
    {"name": "项目经验", "score": 7, "maxScore": 10, "weight": 0.25, "comment": "评语"},
    {"name": "实习经历", "score": 5, "maxScore": 10, "weight": 0.20, "comment": "评语"},
    {"name": "岗位匹配度", "score": 7, "maxScore": 10, "weight": 0.20, "comment": "评语"},
    {"name": "综合竞争力", "score": 6, "maxScore": 10, "weight": 0.00, "comment": "评语"}
  ],
  "improvements": ["改进建议1", "改进建议2", "改进建议3"]
}`;

function buildResumeText(resumeData: Record<string, unknown>): string {
  const parts: string[] = [];
  const basic = resumeData.basic as Record<string, string> | undefined;
  if (basic) {
    parts.push(`基本信息：${basic.name || ''} | ${basic.school || ''} | ${basic.major || ''} | ${basic.graduation || ''}`);
  }
  const education = resumeData.education as Record<string, string>[] | undefined;
  if (education?.length) {
    parts.push(`教育经历：${education.map(e => `${e.school} ${e.major} ${e.degree || ''} ${e.time || ''}${e.gpa ? ` GPA:${e.gpa}` : ''}`).join('；')}`);
  }
  const experience = resumeData.experience as Record<string, unknown>[] | undefined;
  if (experience?.length) {
    parts.push(`实习经历：${experience.map(e => {
      const desc = Array.isArray(e.description) ? (e.description as string[]).join(' ') : '';
      return `${e.company} ${e.role} ${e.time || ''} ${desc}`;
    }).join('；')}`);
  }
  const projects = resumeData.projects as Record<string, unknown>[] | undefined;
  if (projects?.length) {
    parts.push(`项目经历：${projects.map(p => {
      const desc = Array.isArray(p.description) ? (p.description as string[]).join(' ') : '';
      return `${p.name || p.company} ${p.role} ${p.time || ''} ${desc}`;
    }).join('；')}`);
  }
  const skills = resumeData.skills as string[] | undefined;
  if (skills?.length) {
    parts.push(`技能：${skills.join('、')}`);
  }
  if (resumeData.content) {
    parts.push(`补充信息：${String(resumeData.content).slice(0, 500)}`);
  }
  return parts.join('\n\n');
}

export async function POST(request: Request) {
  try {
    const { resumeData, targetJob } = await request.json();

    if (!resumeData) {
      return Response.json({ error: '请提供简历数据' }, { status: 400 });
    }

    const resumeText = buildResumeText(resumeData);
    const contextTarget = targetJob || '通用岗位';

    if (!resumeText.trim()) {
      return Response.json({
        overallScore: 0,
        summary: '简历内容为空，请先填写基本信息',
        dimensions: [
          { name: '教育背景', score: 0, maxScore: 10, weight: 0.15, comment: '' },
          { name: '技能匹配', score: 0, maxScore: 10, weight: 0.20, comment: '' },
          { name: '项目经验', score: 0, maxScore: 10, weight: 0.25, comment: '' },
          { name: '实习经历', score: 0, maxScore: 10, weight: 0.20, comment: '' },
          { name: '岗位匹配度', score: 0, maxScore: 10, weight: 0.20, comment: '' },
          { name: '综合竞争力', score: 0, maxScore: 10, weight: 0.00, comment: '' },
        ],
        improvements: ['请先填写简历内容'],
        radarData: {},
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const userPrompt = `目标岗位：${contextTarget}\n\n请对以下简历进行综合评分：\n\n${resumeText.slice(0, 2500)}`;

    const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: SCORE_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!resp.ok) {
      console.error('[resume-score] DeepSeek error:', resp.status);
      return Response.json({ error: '评分服务暂不可用' }, { status: 502 });
    }

    const data = await resp.json();
    const raw = data.choices?.[0]?.message?.content || '';

    let result;
    try {
      const jsonStr = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      result = JSON.parse(jsonStr);
    } catch {
      return Response.json({
        overallScore: 0,
        summary: '评分解析异常，请重试',
        dimensions: [
          { name: '教育背景', score: 0, maxScore: 10, weight: 0.15, comment: '' },
          { name: '技能匹配', score: 0, maxScore: 10, weight: 0.20, comment: '' },
          { name: '项目经验', score: 0, maxScore: 10, weight: 0.25, comment: '' },
          { name: '实习经历', score: 0, maxScore: 10, weight: 0.20, comment: '' },
          { name: '岗位匹配度', score: 0, maxScore: 10, weight: 0.20, comment: '' },
          { name: '综合竞争力', score: 0, maxScore: 10, weight: 0.00, comment: '' },
        ],
        improvements: ['评分异常，请重新提交'],
        radarData: {},
      });
    }

    // 补全 radarData
    if (result.dimensions && !result.radarData) {
      result.radarData = {};
      for (const d of result.dimensions) {
        if (d.name && d.name !== '综合竞争力') {
          result.radarData[d.name] = d.score;
        }
      }
    }

    return Response.json(result);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return Response.json({ error: '评分超时，请重试' }, { status: 504 });
    }
    console.error('[resume-score] Error:', err);
    return Response.json({ error: '评分失败' }, { status: 500 });
  }
}
