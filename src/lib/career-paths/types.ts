// 职途星组态引擎 · 类型定义

/** 匹配判定 */
export type Verdict = 'strong_match' | 'match' | 'partial_match' | 'no_match';

/** 单个条件状态 */
export type FieldStatus = 'met' | 'gap' | 'near_gap';

/** 条件操作符 */
export type ConditionOperator = '>=' | 'in';

/** 单条条件定义 */
export interface RouteCondition {
  operator: ConditionOperator;
  value: number | string[];
}

/** 路径的条件集合 */
export interface RouteConditions {
  [field: string]: RouteCondition;
}

/** 编码后的用户画像 */
export interface EncodedProfile {
  SCH_TIER: number;
  MAJ_CAT: string;
  DEG_LEV: number;
  INT_NUM: number;
  INT_QLT: number;
  SKILL_SET: number;
}

/** 编码前的原始用户输入 */
export interface RawProfile {
  school: string;
  major: string;
  degree: string;
  internshipCount: number;      // 0-5
  internshipQuality: string;    // 无/小厂/中厂/大厂/头部
  skills: string[];
}

/** 单个字段匹配详情 */
export interface FieldDetail {
  field: string;
  label: string;
  operator: string;
  required: string;
  current: string | number;
  status: FieldStatus;
}

/** 差距项（含建议） */
export interface GapItem {
  field: string;
  label: string;
  required: string;
  current: string | number;
  advice: string;
}

/** 单条路径匹配结果 */
export interface RouteMatchResult {
  route_id: string;
  name: string;
  verdict: Verdict;
  match_rate: number;
  scenario: string;
  job_types: string[];
  conditions: RouteConditions;
  field_details: FieldDetail[];
  gaps: GapItem[];
}

/** 匹配报告摘要 */
export interface MatchSummary {
  strong_match: number;
  match: number;
  partial_match: number;
  no_match: number;
  total_routes: number;
  best_route: string;
  best_match_rate: number;
}

/** 完整匹配报告 */
export interface MatchReport {
  profile: EncodedProfile;
  summary: MatchSummary;
  routes: RouteMatchResult[];
  timestamp: string;
}

/** 路径配置（来自 config_routes.json） */
export interface RouteConfig {
  route_id: string;
  name: string;
  templates: string[];
  conditions: RouteConditions;
  meta: {
    coverage: number;
    consistency: number;
    job_types: string[];
    scenario: string;
    gap_advice: Record<string, string>;
  };
}

/** 完整配置 */
export interface ConfigData {
  meta: {
    version: string;
    description: string;
    桂电基准: string;
    方向来源: string;
    分类升级: string;
    档位说明: Record<string, string>;
  };
  templates: Record<string, {
    name: string;
    fields: string[];
    description: string;
  }>;
  routes: RouteConfig[];
}

/** 所有字段的标签映射 */
export const FIELD_LABELS: Record<string, string> = {
  SCH_TIER: '学校档次',
  MAJ_CAT: '专业分类',
  DEG_LEV: '学历',
  INT_NUM: '实习数量',
  INT_QLT: '实习质量',
  SKILL_SET: '技能密度',
};
