/**
 * 简历综合评分 API — DeepSeek 直连，3-5s 响应
 * POST /api/resume/score
 * Body: { resumeData: { basic, education, experience, projects, skills, content } }
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;
const DEEPSEEK_MODEL = process.env.MODEL || 'deepseek-chat';

const SCORE_PROMPT = `你是简历评分专家。根据提供的简历内容，从以下5个维度打分（每项1-10分），并给出总分（百分制）和一句话总结。

必须返回严格 JSON 格式（不要markdown包裹）：
{
  "overallScore": 72,
  "summary": "简历整体结构清晰，但实习经历缺乏量化成果，建议补充数据支撑",
  "dimensions": [
    {"name": "内容完整度", "score": 8, "maxScore": 10},
    {"name": "量化程度", "score": 5, "maxScore": 10},
    {"name": "关键词覆盖", "score": 7, "maxScore": 10},
    {"name": "格式规范", "score": 8, "maxScore": 10},
    {"name": "ATS兼容性", "score": 6, "maxScore": 10}
  ]
}`;

function buildResumeText(resumeData: Record<string, unknown>): string {
  const parts: string[] = [];
  const basic = resumeData.basic as Record<string, string> | undefined;
  if (basic) {
    parts.push(`基本信息：${basic.name || ''} | ${basic.school || ''} | ${basic.major || ''} | ${basic.graduation || ''}`);
  }
  const education = resumeData.education as Record<string, string>[] | undefined;
  if (education?.length) {
    parts.push(`教育经历：${education.map((e: Record<string, string>) => `${e.school} ${e.major} ${e.degree} ${e.time}`).join('；')}`);
  }
  const experience = resumeData.experience as Record<string, unknown>[] | undefined;
  if (experience?.length) {
    parts.push(`实习经历：${experience.map((e: Record<string, unknown>) => {
      const desc = Array.isArray(e.description) ? (e.description as string[]).join(' ') : '';
      return `${e.company} ${e.role} ${e.time} ${desc}`;
    }).join('；')}`);
  }
  const projects = resumeData.projects as Record<string, unknown>[] | undefined;
  if (projects?.length) {
    parts.push(`项目经历：${projects.map((p: Record<string, unknown>) => {
      const desc = Array.isArray(p.description) ? (p.description as string[]).join(' ') : '';
      return `${p.company} ${p.role} ${p.time} ${desc}`;
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
    const { resumeData } = await request.json();

    if (!resumeData) {
      return Response.json({ error: '请提供简历数据' }, { status: 400 });
    }

    const resumeText = buildResumeText(resumeData);

    if (!resumeText.trim()) {
      return Response.json({
        overallScore: 0,
        summary: '简历内容为空，请先填写基本信息',
        dimensions: [
          { name: '内容完整度', score: 0, maxScore: 10 },
          { name: '量化程度', score: 0, maxScore: 10 },
          { name: '关键词覆盖', score: 0, maxScore: 10 },
          { name: '格式规范', score: 0, maxScore: 10 },
          { name: 'ATS兼容性', score: 0, maxScore: 10 },
        ],
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

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
          { role: 'user', content: `请对以下简历进行综合评分：\n\n${resumeText.slice(0, 2000)}` },
        ],
        temperature: 0.3,
        max_tokens: 500,
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
      result = {
        overallScore: 0,
        summary: '评分解析异常',
        dimensions: [
          { name: '内容完整度', score: 0, maxScore: 10 },
          { name: '量化程度', score: 0, maxScore: 10 },
          { name: '关键词覆盖', score: 0, maxScore: 10 },
          { name: '格式规范', score: 0, maxScore: 10 },
          { name: 'ATS兼容性', score: 0, maxScore: 10 },
        ],
      };
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
