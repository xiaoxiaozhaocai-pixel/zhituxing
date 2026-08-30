/**
 * P7.2 雇主端岗位匹配「解释层」
 * 把纯打分（"78%")扩为「解释 + 短板 + 建议」，落地判断力≠打分。
 *
 * 约束：
 * - 纯函数、无副作用、输入可含 null/undefined，保证 CI 单测稳定。
 * - 只基于真实输入的候选人与岗位维度数据推导，不编造数字（守四真）。
 * - 输出为可解释的多维拆解 + 强弱项 + 跟进建议，明确"匹配分是参考信号，终判依赖人工评估"。
 */

export type MatchDimKey = 'skills' | 'industry' | 'city' | 'completeness' | 'assessment';

export interface MatchDimension {
  key: MatchDimKey;
  label: string;
  /** 岗位是否实际考察该维度（如岗位未设行业/城市条件则为 false，不计分） */
  enabled: boolean;
  /** 该维度权重 */
  weight: number;
  /** 该维度实得分（未归一化原始分，如 32/40） */
  gained: number;
  /** 该维度表现档位 */
  level: 'high' | 'mid' | 'low' | 'na';
  /** 该维度命中/差异说明 */
  detail: string;
}

export interface MatchBreakdown {
  /** 一句话解释：为什么是这个匹配分 */
  summary: string;
  /** 各维度拆解 */
  dimensions: MatchDimension[];
  /** 优势点 */
  strengths: string[];
  /** 短板点 */
  shortfalls: string[];
  /** 跟进建议（解释+路径+建议） */
  advice: string;
}

export interface CandidatePortraitLike {
  hard_skills?: string[] | null;
  soft_skills?: string[] | null;
  target_industry?: string | null;
  target_cities?: string[] | null;
  portrait_completeness_score?: number | null;
  assessment_overall_score?: number | null;
}

export interface JobPostLike {
  required_hard_skills?: string[] | null;
  target_industry?: string | null;
  target_cities?: string[] | null;
}

const DIM_LABELS: Record<MatchDimKey, string> = {
  skills: '技能匹配',
  industry: '行业方向',
  city: '城市覆盖',
  completeness: '画像完整度',
  assessment: '测评表现',
};

/** 档位判定：权重内达成比例 */
function levelOf(ratio: number): MatchDimension['level'] {
  if (ratio >= 0.75) return 'high';
  if (ratio >= 0.4) return 'mid';
  return 'low';
}

/**
 * 构建岗位匹配解释层。
 * 只对岗位真实设置的维度（weight>0）计分与拆解；未设置的维度 enabled=false，不计分。
 */
export function buildMatchBreakdown(
  candidate: CandidatePortraitLike,
  post: JobPostLike
): MatchBreakdown {
  const candHard = candidate.hard_skills ?? [];
  const candSoft = candidate.soft_skills ?? [];
  const candSkills = [...candHard, ...candSoft];
  const required = post.required_hard_skills ?? [];

  const dims: MatchDimension[] = [];

  // 1. 技能匹配（权重40）
  if (required.length > 0) {
    const matched = required.filter((s: string) =>
      candSkills.some((cs: string) => cs.toLowerCase().includes(s.toLowerCase()))
    );
    const weight = 40;
    const gained = Math.round((matched.length / required.length) * weight);
    dims.push({
      key: 'skills',
      label: DIM_LABELS.skills,
      enabled: true,
      weight,
      gained,
      level: levelOf(matched.length / required.length),
      detail:
        matched.length === 0
          ? `未命中所要求的 ${required.length} 项硬技能（如 ${required.slice(0, 3).join('、')}）`
          : `命中 ${matched.length}/${required.length} 项硬技能：${matched.join('、')}`,
    });
  } else {
    dims.push({ key: 'skills', label: DIM_LABELS.skills, enabled: false, weight: 0, gained: 0, level: 'na', detail: '岗位未设置技能要求，不计分' });
  }

  // 2. 行业方向（权重20）
  const tIndustry = post.target_industry as string | null;
  const cIndustry = candidate.target_industry as string | null;
  if (tIndustry) {
    const hit =
      cIndustry &&
      (cIndustry.toLowerCase().includes(tIndustry.toLowerCase()) ||
        tIndustry.toLowerCase().includes(cIndustry.toLowerCase()));
    dims.push({
      key: 'industry',
      label: DIM_LABELS.industry,
      enabled: true,
      weight: 20,
      gained: hit ? 20 : 0,
      level: hit ? 'high' : 'low',
      detail: hit
        ? `目标行业「${tIndustry}」与候选人方向「${cIndustry}」匹配`
        : `目标行业「${tIndustry}」与候选人方向「${cIndustry || '未填写'}」不一致，存在行业错位`,
    });
  } else {
    dims.push({ key: 'industry', label: DIM_LABELS.industry, enabled: false, weight: 0, gained: 0, level: 'na', detail: '岗位未设置目标行业，不计分' });
  }

  // 3. 城市覆盖（权重15）
  const tCities = (post.target_cities as string[] | null) ?? [];
  const cCities = (candidate.target_cities as string[] | null) ?? [];
  if (tCities.length > 0) {
    const matchedCities = tCities.filter((c: string) => cCities.includes(c));
    dims.push({
      key: 'city',
      label: DIM_LABELS.city,
      enabled: true,
      weight: 15,
      gained: matchedCities.length > 0 ? 15 : 0,
      level: matchedCities.length > 0 ? 'high' : 'low',
      detail:
        matchedCities.length > 0
          ? `覆盖目标城市 ${matchedCities.join('、')}`
          : `未覆盖目标城市 ${tCities.join('、')}`,
    });
  } else {
    dims.push({ key: 'city', label: DIM_LABELS.city, enabled: false, weight: 0, gained: 0, level: 'na', detail: '岗位未设置目标城市，不计分' });
  }

  // 4. 画像完整度（权重15）
  const completeness = candidate.portrait_completeness_score as number | null;
  if (completeness != null) {
    const gained = Math.round((completeness / 100) * 15);
    dims.push({
      key: 'completeness',
      label: DIM_LABELS.completeness,
      enabled: true,
      weight: 15,
      gained,
      level: levelOf(completeness / 100),
      detail: `画像完整度 ${completeness}%`,
    });
  } else {
    dims.push({ key: 'completeness', label: DIM_LABELS.completeness, enabled: false, weight: 0, gained: 0, level: 'na', detail: '候选人未填写画像，不计分' });
  }

  // 5. 测评表现（权重10）
  const assessment = candidate.assessment_overall_score as number | null;
  if (assessment != null) {
    const gained = Math.round((assessment / 100) * 10);
    dims.push({
      key: 'assessment',
      label: DIM_LABELS.assessment,
      enabled: true,
      weight: 10,
      gained,
      level: levelOf(assessment / 100),
      detail: `测评表现 ${assessment} 分`,
    });
  } else {
    dims.push({ key: 'assessment', label: DIM_LABELS.assessment, enabled: false, weight: 0, gained: 0, level: 'na', detail: '候选人未完成测评，不计分' });
  }

  // 拆解强弱项（只针对岗位实际考察的维度）
  const activeDims = dims.filter((d) => d.enabled);
  const totalWeight = activeDims.reduce((s, d) => s + d.weight, 0);
  const totalGained = activeDims.reduce((s, d) => s + d.gained, 0);

  const strengths: string[] = [];
  const shortfalls: string[] = [];
  for (const d of activeDims) {
    const ratio = d.weight > 0 ? d.gained / d.weight : 0;
    if (ratio >= 0.6) {
      strengths.push(`${d.label}表现较好（${d.detail}）`);
    } else {
      shortfalls.push(`${d.label}有差距（${d.detail}）`);
    }
  }

  // 解释（为什么是这个分）
  let summary: string;
  const pct = totalWeight > 0 ? Math.round((totalGained / totalWeight) * 100) : 0;
  if (shortfalls.length === 0) {
    summary = `综合匹配度 ${pct}%，各维度均达成岗位要求，是当前较合适的候选人。`;
  } else if (strengths.length === 0) {
    summary = `综合匹配度 ${pct}%，各维度均未达岗位要求，需谨慎评估。`;
  } else {
    const strongLabel = strengths[0].split('（')[0];
    const weakLabel = shortfalls[0].split('（')[0];
    summary = `综合匹配度 ${pct}%，${strongLabel}是其主要优势，${weakLabel}是当前主要短板。`;
  }

  // 建议（判断力≠打分：给出参考路径，且明确终判依赖人工）
  let advice: string;
  if (shortfalls.length === 0) {
    advice = '该候选人各维度均匹配岗位要求，可优先联系沟通；建议结合面试进一步确认实际能力与意向，匹配分是参考信号。';
  } else if (strengths.length === 0) {
    advice = '该候选人当前关键维度未达要求，建议暂缓联系，或先补充画像/测评后再评估；若岗位急招可适当放宽部分条件。匹配分是参考信号，最终是否录用应结合人工面试判断。';
  } else {
    const weakFixes = shortfalls.map((s) => s.split('（')[0]).join('、');
    advice = `该候选人优势与短板并存：建议先就「${weakFixes}」通过沟通进一步确认，同时结合其强项判断培养价值；匹配分是参考信号，最终是否录用应结合人工面试判断。`;
  }

  return { summary, dimensions: dims, strengths, shortfalls, advice };
}
