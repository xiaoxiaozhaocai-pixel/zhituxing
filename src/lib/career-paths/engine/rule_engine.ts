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
  const val = (profile as any)[field];
  return val !== undefined ? val : '';
}

/**
 * 计算单条路径的匹配率
 */
function calcMatchRate(
  conditions: Record<string, RouteCondition>,
  profile: EncodedProfile
): { matchedCount: number; totalCount: number } {
  let matched = 0;
  let total = 0;

  for (const [field, condition] of Object.entries(conditions)) {
    total++;
    const profileValue = getProfileFieldValue(profile, field);
    const { met } = checkCondition(condition, profileValue);
    if (met) matched++;
  }

  return { matchedCount: matched, totalCount: total };
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

  for (const [field, condition] of Object.entries(route.conditions)) {
    const profileValue = getProfileFieldValue(profile, field);
    const { met, isNearGap } = checkCondition(condition, profileValue);

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

  const { matchedCount, totalCount } = calcMatchRate(route.conditions, profile);
  const matchRate = totalCount > 0 ? matchedCount / totalCount : 0;

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
  };
}

/**
 * 主入口：执行完整匹配
 * 输入编码后的画像，输出完整的匹配报告
 */
export function runEngine(profile: EncodedProfile): MatchReport {
  const routes = CONFIG.routes.map((route) => matchRoute(route, profile));

  // 按匹配度降序排序
  routes.sort((a, b) => b.match_rate - a.match_rate);

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
