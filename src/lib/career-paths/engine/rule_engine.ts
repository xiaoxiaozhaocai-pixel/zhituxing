// 职途星组态引擎 · 规则匹配引擎
// 对应 Python: rule_engine.py (v3)

import {
  EncodedProfile,
  RouteConfig,
  RouteCondition,
  RouteMatchResult,
  MatchReport,
  MatchSummary,
  FieldDetail,
  GapItem,
  FIELD_LABELS,
} from '@/lib/career-paths/types';
import { CONFIG } from '@/lib/career-paths/engine/config_routes';

/**
 * 判断单个条件是否满足
 */
function checkCondition(
  condition: RouteCondition,
  profileValue: number | string
): { met: boolean; isNearGap: boolean } {
  if (condition.operator === '>=') {
    const threshold = condition.value as number;
    const actual = profileValue as number;
    if (actual >= threshold) return { met: true, isNearGap: false };
    // near_gap: 差0.1以内
    if (actual >= threshold - 0.1) return { met: false, isNearGap: true };
    return { met: false, isNearGap: false };
  }

  if (condition.operator === 'in') {
    const allowed = condition.value as string[];
    if (allowed.includes(profileValue as string)) return { met: true, isNearGap: false };
    return { met: false, isNearGap: false };
  }

  return { met: false, isNearGap: false };
}

/**
 * 构造条件值的可读描述
 */
function describeRequired(condition: RouteCondition): string {
  if (condition.operator === '>=') {
    return `≥${condition.value}`;
  }
  if (condition.operator === 'in') {
    const vals = condition.value as string[];
    if (vals.length > 5) {
      return `${vals.slice(0, 4).join('/')}等`;
    }
    return vals.join('/');
  }
  return '';
}

/**
 * 获取条件的编码值（用于对比）
 */
function getProfileFieldValue(profile: EncodedProfile, field: string): number | string {
  const val = (profile as unknown as Record<string, number | string>)[field];
  return val !== undefined ? val : '';
}

/**
 * 计算单条路径的匹配率
 */
/** 全局字段权重（默认；字段越核心权重越高）。不同岗位因 conditions 字段集合不同而自然差异化。 */
export const FIELD_WEIGHT: Record<string, number> = {
  MAJ_CAT: 2.5,   // 专业对口：能不能入行的根本
  INT_QLT: 1.8,   // 实习质量：大厂/头部硬加分
  SKILL_SET: 1.5, // 技能密度：硬技能
  INT_NUM: 1.2,   // 实习数量：有经验
  DEG_LEV: 0.9,   // 学历：校招门槛，非绝对
  SCH_TIER: 0.8,  // 学校档次：桂电基准，非名校导向
};

/** 取字段权重：岗位可用 condition.weight 微调，否则用全局 FIELD_WEIGHT */
function getFieldWeight(condition: RouteCondition, field: string): number {
  if (condition.weight !== undefined) return condition.weight;
  return FIELD_WEIGHT[field] ?? 1;
}

/**
 * 计算单条路径的加权匹配率：Σ(命中字段权重) / Σ(字段权重)
 * 核心字段权重更高 → 命中核心字段对匹配率的拉动更大，避免等权平均稀释。
 */
function calcMatchRate(
  conditions: Record<string, RouteCondition>,
  profile: EncodedProfile
): { matchedWeight: number; totalWeight: number } {
  let matchedWeight = 0;
  let totalWeight = 0;

  for (const [field, condition] of Object.entries(conditions)) {
    const w = getFieldWeight(condition, field);
    totalWeight += w;
    const profileValue = getProfileFieldValue(profile, field);
    const { met } = checkCondition(condition, profileValue);
    if (met) matchedWeight += w;
  }

  return { matchedWeight, totalWeight };
}

/** 生成加权匹配的可解释说明（哪些字段是决定项、哪些拉低） */
function buildWeightedExplanation(fieldDetails: FieldDetail[], matchRate: number): string {
  const metFields = fieldDetails.filter((f) => f.status === 'met');
  const gapFields = fieldDetails.filter((f) => f.status === 'gap' || f.status === 'near_gap');
  const topMet = [...metFields].sort((a, b) => b.weight - a.weight)[0];
  const topGap = [...gapFields].sort((a, b) => b.weight - a.weight)[0];

  const parts: string[] = [];
  parts.push(`加权匹配率 ${(matchRate * 100).toFixed(0)}%`);
  if (topMet) parts.push(`最关键的命中项是「${topMet.label}」（权重 ${topMet.weight}）`);
  if (topGap) parts.push(`拉低分数的是「${topGap.label}」（权重 ${topGap.weight}，未达标）`);
  else parts.push('所有条件均已达标');
  return parts.join('；');
}

/**
 * 判定 verdict
 */
function determineVerdict(matchRate: number): 'strong_match' | 'match' | 'partial_match' | 'no_match' {
  if (matchRate >= 1.0) return 'strong_match';
  if (matchRate >= 0.75) return 'match';
  if (matchRate >= 0.40) return 'partial_match';
  return 'no_match';
}

/**
 * 获取差距建议
 */
function getGapAdvice(route: RouteConfig, gapField: string): string {
  return route.meta.gap_advice?.[gapField] || '建议针对性提升该方面能力';
}

/**
 * 对单条路径执行匹配
 */
function matchRoute(route: RouteConfig, profile: EncodedProfile): RouteMatchResult {
  const fieldDetails: FieldDetail[] = [];
  const gaps: GapItem[] = [];

  // 先算总权重，用于计算各字段贡献占比
  let totalWeight = 0;
  for (const [field, condition] of Object.entries(route.conditions)) {
    totalWeight += getFieldWeight(condition, field);
  }

  for (const [field, condition] of Object.entries(route.conditions)) {
    const profileValue = getProfileFieldValue(profile, field);
    const { met, isNearGap } = checkCondition(condition, profileValue);
    const w = getFieldWeight(condition, field);
    const contribution = totalWeight > 0 ? w / totalWeight : 0;

    let status: 'met' | 'gap' | 'near_gap';
    if (met) {
      status = 'met';
    } else if (isNearGap) {
      status = 'near_gap';
    } else {
      status = 'gap';
    }

    const requiredStr = describeRequired(condition);

    fieldDetails.push({
      field,
      label: FIELD_LABELS[field] || field,
      operator: condition.operator,
      required: requiredStr,
      current: profileValue,
      status,
      weight: w,
      contribution,
    });

    if (!met) {
      gaps.push({
        field,
        label: FIELD_LABELS[field] || field,
        required: requiredStr,
        current: profileValue,
        advice: getGapAdvice(route, field),
      });
    }
  }

  const { matchedWeight, totalWeight: tw2 } = calcMatchRate(route.conditions, profile);
  const matchRate = tw2 > 0 ? matchedWeight / tw2 : 0;
  const weightedExplanation = buildWeightedExplanation(fieldDetails, matchRate);

  return {
    route_id: route.route_id,
    name: route.name,
    verdict: determineVerdict(matchRate),
    match_rate: Math.round(matchRate * 100) / 100,
    scenario: route.meta.scenario,
    job_types: route.meta.job_types,
    conditions: route.conditions,
    field_details: fieldDetails,
    gaps,
    weighted_explanation: weightedExplanation,
  };
}

/**
 * 计算专业对口度得分（同等匹配度下的二次排序用）
 * 有 MAJ_CAT 条件的路径 → 用户专业命中 → 对口度高
 * 范围越窄（类别少）说明越精准
 */
function calcRelevanceScore(route: RouteMatchResult, profile: EncodedProfile): number {
  const majCatCondition = route.conditions['MAJ_CAT'];
  if (!majCatCondition) return 0;

  if (majCatCondition.operator === 'in') {
    const allowed = majCatCondition.value as string[];
    if (allowed.includes(profile.MAJ_CAT)) {
      // 范围越窄越精准：1 + 1/(类别数+1) ∈ (1.0, 1.5)
      return 1 + (1 / (allowed.length + 1));
    }
  }

  return 0;
}

/**
 * 主入口：执行完整匹配
 * 输入编码后的画像，输出完整的匹配报告
 */
export function runEngine(profile: EncodedProfile): MatchReport {
  const routes = CONFIG.routes.map((route) => matchRoute(route, profile));

  // 先按匹配度降序，同等匹配度下按专业对口度降序
  routes.sort((a, b) => {
    const rateDiff = b.match_rate - a.match_rate;
    if (rateDiff !== 0) return rateDiff;
    return calcRelevanceScore(b, profile) - calcRelevanceScore(a, profile);
  });

  const summary: MatchSummary = {
    strong_match: routes.filter((r) => r.verdict === 'strong_match').length,
    match: routes.filter((r) => r.verdict === 'match').length,
    partial_match: routes.filter((r) => r.verdict === 'partial_match').length,
    no_match: routes.filter((r) => r.verdict === 'no_match').length,
    total_routes: routes.length,
    best_route: routes.length > 0 ? routes[0].route_id : '',
    best_match_rate: routes.length > 0 ? routes[0].match_rate : 0,
  };

  return {
    profile,
    summary,
    routes,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 从原始输入直接出报告（快捷入口）
 */
export function getMatchReport(profile: EncodedProfile): MatchReport {
  return runEngine(profile);
}
