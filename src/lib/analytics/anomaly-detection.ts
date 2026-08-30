/**
 * 异常检测与风险提示（判断力 · 块3）
 *
 * 面向「数据底座」引入异常检测：对关键指标做离群/异常识别
 * （如评分异常、数据分布漂移、反馈质量骤降），输出风险提示。
 *
 * 核心原则：提示风险而非下因果结论 —— 异常只触发「需要去看」，
 * 不直接归因。任何异常项的建议动作都强调「核实，而非推断」。
 *
 * 方法：z-score / IQR / 基线偏离（纯函数，无外部依赖，便于引擎层快校验与测试）。
 * 阈值取向：用户已拍板「宁可多提示、但给风险等级，避免漏报」，故预警阈值偏松。
 */

export type AnomalyMethod = 'zscore' | 'iqr' | 'baseline';
export type RiskLevel = 'notice' | 'warning' | 'alert';
export type Direction = 'high' | 'low';
export type AnomalyOverall = 'ok' | 'attention' | 'alert';

export interface AnomalyItem {
  index: number;
  value: number;
  method: AnomalyMethod;
  direction: Direction;
  riskLevel: RiskLevel;
  zScore: number | null;
  q1: number | null;
  q3: number | null;
  iqr: number | null;
  description: string;
  suggestion: string;
}

export interface AnomalyDetectionResult {
  count: number;
  overall: AnomalyOverall;
  mean: number | null;
  stdDev: number | null;
  q1: number | null;
  q3: number | null;
  iqr: number | null;
  items: AnomalyItem[];
}

export interface AnomalyDetectOptions {
  /** 启用的检测方法，默认 ['zscore', 'iqr'] */
  methods?: AnomalyMethod[];
  /** z-score 预警阈值，默认 2（宁多提示） */
  zWarnThreshold?: number;
  /** z-score 高风险阈值，默认 3 */
  zAlertThreshold?: number;
  /** IQR 预警倍数，默认 1.5 */
  iqrWarnFactor?: number;
  /** IQR 高风险倍数，默认 3 */
  iqrAlertFactor?: number;
  /** 基线值，存在时启用 baseline 方法 */
  baseline?: number;
  /** baseline 偏离预警比例，默认 0.3 */
  baselineWarnRatio?: number;
  /** baseline 偏离高风险比例，默认 0.5 */
  baselineAlertRatio?: number;
  /** 指标名，用于描述文案 */
  label?: string;
}

const DEFAULT_OPTS = {
  methods: ['zscore', 'iqr'] as AnomalyMethod[],
  zWarnThreshold: 2,
  zAlertThreshold: 3,
  iqrWarnFactor: 1.5,
  iqrAlertFactor: 3,
  baselineWarnRatio: 0.3,
  baselineAlertRatio: 0.5,
};

const NAME = (label?: string) => (label ? `「${label}」` : '该指标');

/** 线性插值分位数（numpy 风格），p ∈ [0,1] */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return Number.NaN;
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** 样本标准差（n-1）；n<2 返回 null */
function sampleStdDev(values: number[], mean: number): number | null {
  if (values.length < 2) return null;
  const variance = values.reduce((s, v) => s + (v - mean) * (v - mean), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/** 均值；空数组返回 null */
function meanOf(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

const HIGH_PREFIX = '数值偏高（高于均值/中位区间/基线）';
const LOW_PREFIX = '数值偏低（低于均值/中位区间/基线）';

function zDesc(value: number, z: number, name: string): string {
  const dir = z > 0 ? '偏高' : '偏低';
  return `${name}第 ${value} 个点${dir}，偏离均值 ${Math.abs(z).toFixed(2)} 个标准差（z=${z.toFixed(2)}），属离群信号。`;
}

function iqrDesc(value: number, dir: Direction, q1: number, q3: number, iqr: number, name: string): string {
  const beyond = dir === 'high' ? `高于 Q3（${q3.toFixed(2)}）${(value - q3).toFixed(2)}` : `低于 Q1（${q1.toFixed(2)}）${(q1 - value).toFixed(2)}`;
  return `${name}第 ${value} 个点${beyond}，IQR=${iqr.toFixed(2)}，落在正常区间之外，属离群信号。`;
}

function baselineDesc(value: number, baseline: number, devRatio: number, name: string): string {
  const dir = value > baseline ? '偏高' : '偏低';
  return `${name}值 ${value} 相对基线 ${baseline} 偏离 ${(Math.abs(devRatio) * 100).toFixed(1)}%，明显越出基线区间。`;
}

const SUGGESTION = '建议：此为风险前置提示，仅触发「需要去看」，不代表因果判断。请核查该值是否为真实业务波动、录入或同步异常，并结合上下文判断后再处理。';

/**
 * 异常检测主函数（纯函数）。
 *
 * @param values 关键指标的数值样本（通常为按时间/序列排布的观测值）
 * @param opts   阈值与方法配置
 */
export function detectAnomalies(values: number[], opts: AnomalyDetectOptions = {}): AnomalyDetectionResult {
  // 只合并用户明确传入的自定义项，忽略 undefined（避免 opts.methods 为 undefined 时覆盖内置默认）
  const cfg = {
    methods: opts.methods ?? DEFAULT_OPTS.methods,
    zWarnThreshold: opts.zWarnThreshold ?? DEFAULT_OPTS.zWarnThreshold,
    zAlertThreshold: opts.zAlertThreshold ?? DEFAULT_OPTS.zAlertThreshold,
    iqrWarnFactor: opts.iqrWarnFactor ?? DEFAULT_OPTS.iqrWarnFactor,
    iqrAlertFactor: opts.iqrAlertFactor ?? DEFAULT_OPTS.iqrAlertFactor,
    baselineWarnRatio: opts.baselineWarnRatio ?? DEFAULT_OPTS.baselineWarnRatio,
    baselineAlertRatio: opts.baselineAlertRatio ?? DEFAULT_OPTS.baselineAlertRatio,
    baseline: opts.baseline,
    label: opts.label,
  };
  const name = NAME(cfg.label);
  const normalized = values.map((v) => (typeof v === 'number' && Number.isFinite(v) ? v : Number.NaN));
  const clean = normalized.filter((v) => Number.isFinite(v));
  const items: AnomalyItem[] = [];

  if (clean.length === 0) {
    return { count: 0, overall: 'ok', mean: null, stdDev: null, q1: null, q3: null, iqr: null, items: [] };
  }

  const m = meanOf(clean)!;
  const sd = sampleStdDev(clean, m);
  const sorted = [...clean].sort((a, b) => a - b);
  const q1 = percentile(sorted, 0.25);
  const q3 = percentile(sorted, 0.75);
  const iqrVal = q3 - q1;

  const zHit: Set<number> = new Set();
  const iqrHit: Set<number> = new Set();
  const baseHit: Set<number> = new Set();

  // ---- z-score ----
  if (cfg.methods.includes('zscore') && sd !== null && sd > 0 && clean.length >= 3) {
    for (let i = 0; i < clean.length; i++) {
      const x = clean[i];
      const z = (x - m) / sd;
      const az = Math.abs(z);
      const riskLevel: RiskLevel = az >= cfg.zAlertThreshold ? 'alert' : az >= cfg.zWarnThreshold ? 'warning' : 'notice';
      if (az >= cfg.zWarnThreshold) {
        zHit.add(i);
        items.push({
          index: i,
          value: x,
          method: 'zscore',
          direction: z > 0 ? 'high' : 'low',
          riskLevel,
          zScore: z,
          q1: null,
          q3: null,
          iqr: null,
          description: zDesc(i, x, z, name),
          suggestion: SUGGESTION,
        });
      }
    }
  }

  // ---- IQR ----
  if (cfg.methods.includes('iqr') && clean.length >= 4 && iqrVal > 0) {
    const warnLo = q1 - cfg.iqrWarnFactor * iqrVal;
    const warnHi = q3 + cfg.iqrWarnFactor * iqrVal;
    const alertLo = q1 - cfg.iqrAlertFactor * iqrVal;
    const alertHi = q3 + cfg.iqrAlertFactor * iqrVal;
    for (let i = 0; i < clean.length; i++) {
      const x = clean[i];
      let riskLevel: RiskLevel | null = null;
      let dir: Direction | null = null;
      if (x > warnHi) {
        dir = 'high';
        riskLevel = x > alertHi ? 'alert' : 'warning';
      } else if (x < warnLo) {
        dir = 'low';
        riskLevel = x < alertLo ? 'alert' : 'warning';
      }
      if (riskLevel && dir) {
        iqrHit.add(i);
        items.push({
          index: i,
          value: x,
          method: 'iqr',
          direction: dir,
          riskLevel,
          zScore: null,
          q1,
          q3,
          iqr: iqrVal,
          description: iqrDesc(x, dir, q1, q3, iqrVal, name),
          suggestion: SUGGESTION,
        });
      }
    }
  }

  // ---- 基线偏离 ----
  if (cfg.methods.includes('baseline') && typeof cfg.baseline === 'number' && Number.isFinite(cfg.baseline) && Math.abs(cfg.baseline) > 1e-9) {
    const baseline = cfg.baseline;
    for (let i = 0; i < clean.length; i++) {
      const x = clean[i];
      const devRatio = (x - baseline) / baseline;
      const abs = Math.abs(devRatio);
      const riskLevel: RiskLevel = abs >= cfg.baselineAlertRatio ? 'alert' : abs >= cfg.baselineWarnRatio ? 'warning' : 'notice';
      if (abs >= cfg.baselineWarnRatio) {
        baseHit.add(i);
        items.push({
          index: i,
          value: x,
          method: 'baseline',
          direction: devRatio > 0 ? 'high' : 'low',
          riskLevel,
          zScore: null,
          q1: null,
          q3: null,
          iqr: null,
          description: baselineDesc(x, baseline, devRatio, name),
          suggestion: SUGGESTION,
        });
      }
    }
  }

  // 同一位置去重：z-score 与 IQR 命中同一点时，保留更高风险等级的那条
  const byPos = new Map<number, AnomalyItem>();
  for (const it of items) {
    const prev = byPos.get(it.index);
    if (!prev) {
      byPos.set(it.index, it);
    } else {
      const rank = (r: RiskLevel) => (r === 'alert' ? 2 : r === 'warning' ? 1 : 0);
      if (rank(it.riskLevel) > rank(prev.riskLevel)) byPos.set(it.index, it);
    }
  }
  const deduped = Array.from(byPos.values()).sort((a, b) => a.index - b.index);

  const hasAlert = deduped.some((i) => i.riskLevel === 'alert');
  const hasWarn = deduped.some((i) => i.riskLevel !== 'notice');
  const overall: AnomalyOverall = hasAlert ? 'alert' : hasWarn ? 'attention' : 'ok';

  return {
    count: deduped.length,
    overall,
    mean: m,
    stdDev: sd,
    q1,
    q3,
    iqr: iqrVal,
    items: deduped,
  };
}
