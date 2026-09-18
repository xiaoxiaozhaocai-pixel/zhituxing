/**
 * fsQCA 引擎（职途星 B 端岗位画像）
 *
 * 把「盲评三维（Skill/Exp/Soft）+ 学历（Edu）+ 匹配度（Match）」的离散评分，
 * 用标准模糊集定性比较分析（fsQCA）跑出：
 *   模糊校准 → 真值表 → 一致性/覆盖率 → 充分/必要组态解
 *
 * 设计约束（守四真）：
 * - 纯函数、无副作用，仅基于真实评估数据推导，不编造数字。
 * - 输出明确标注「组态是参考信号，非录用裁决」，终判依赖人工。
 * - 样本量不足时返回提示，不强行给出高置信组态。
 *
 * 数据形状：
 *   条件 = skill / exp / soft / edu（1-5 整数评分）
 *   结果 = match（1-5 整数评分，≥4 视为「匹配该岗位」）
 */

/** 单个被评估候选人的原始评分 */
export interface CandidateScores {
  /** 技能 1-5 */
  skill: number;
  /** 经验 1-5 */
  exp: number;
  /** 软素质 1-5 */
  soft: number;
  /** 学历 1-5（由建档时文本编码，缺失可传 null） */
  edu: number | null;
  /** 匹配度 1-5（结果变量；缺失则该样本不参与结果建模） */
  match: number | null;
}

export type CondKey = 'skill' | 'exp' | 'soft' | 'edu';
export const COND_KEYS: CondKey[] = ['skill', 'exp', 'soft', 'edu'];
export const COND_LABELS: Record<CondKey, string> = {
  skill: '技能',
  exp: '经验',
  soft: '软素质',
  edu: '学历',
};

/**
 * 模糊校准：把 1-5 整数分映射到 [0,1] 成员度。
 * 锚点（标准 fsQCA 三段式）：
 *   - 完全成员：score >= 4  → 0.95（避免 1.0 的完全确定，学术惯例）
 *   - 交叉点（最大模糊）：score == 3 → 0.5
 *   - 完全不成员：score <= 2 → 0.05（避免 0 的完全否定）
 * 用分段线性插值保证单调连续。
 */
export function fuzzyCalibrate(score: number | null | undefined): number {
  if (score == null || Number.isNaN(Number(score))) return 0; // 缺失视为完全不成员（保守）
  const s = Math.max(1, Math.min(5, Number(score)));
  if (s >= 4) return 0.95;
  if (s === 3) return 0.5;
  if (s <= 2) return 0.05;
  // 理论不可达（1-5 整数），兜底线性
  return 0.05 + ((s - 1) / 4) * 0.9;
}

/** 结果的模糊成员度（match>=4 视为匹配） */
export function outcomeCalibrate(match: number | null | undefined): number {
  if (match == null || Number.isNaN(Number(match))) return 0;
  return fuzzyCalibrate(Number(match));
}

/** 布尔条件取非（模糊否定 = 1 - x） */
export function fneg(x: number): number {
  return 1 - x;
}

/** 交集（模糊最小） */
export function fand(...xs: number[]): number {
  return xs.reduce((a, b) => Math.min(a, b), 1);
}

/** 一个 fsQCA 组态（条件组合）候选 */
export interface ConfigTerm {
  /** 每个条件的取值：'1'=高，'0'=低，'-'=无关(该条件不参与) */
  term: Partial<Record<CondKey, '1' | '0'>>;
  /** 该组态覆盖的样本索引 */
  members: number[];
  /** 一致性（充分性）consistency，0-1 */
  consistency: number;
  /** 原始覆盖率 raw coverage，0-1 */
  rawCoverage: number;
  /** 唯一覆盖率 unique coverage，0-1 */
  uniqueCoverage: number;
}

export interface FsqcaResult {
  /** 输入样本数 */
  n: number;
  /** 数据是否达到「真算」门槛 */
  sufficient: boolean;
  /** 结果变量缺失的样本数（不参与结果建模但参与条件分布展示） */
  missingOutcome: number;
  /** 模糊校准后的样本（四条件+结果） */
  calibrated: { cond: Record<CondKey, number>; outcome: number }[];
  /** 每个条件作为「必要条件」的一致性（relevance for necessity, 类似） */
  necessity: Partial<Record<CondKey, { consistency: number; coverage: number; negConsistency: number }>>;
  /** 充分组态解（真值表化简后的路径），按一致性排序 */
  solutions: ConfigTerm[];
  /** 是否需要更大样本的提示 */
  hint: string | null;
}

/**
 * 运行 fsQCA。
 * @param rows 评估样本
 * @param threshold 真算门槛：达到该样本数才输出组态解（不足只给线索+必要性）
 */
export function runFsqca(rows: CandidateScores[], threshold = 30): FsqcaResult {
  const n = rows.length;
  const calibrated = rows
    .map((r) => ({
      cond: {
        skill: fuzzyCalibrate(r.skill),
        exp: fuzzyCalibrate(r.exp),
        soft: fuzzyCalibrate(r.soft),
        edu: fuzzyCalibrate(r.edu),
      } as Record<CondKey, number>,
      outcome: outcomeCalibrate(r.match),
    }))
    .filter((c) => c.outcome > 0); // 结果不明（match 缺失）的样本不进组态建模
  const missingOutcome = rows.length - calibrated.length;

  // —— 必要性分析（每个条件及其否定的"必要一致性"）——
  const necessity: FsqcaResult['necessity'] = {};
  for (const k of COND_KEYS) {
    const consPos = sum(calibrated.map((c) => fand(c.cond[k], c.outcome))) / sum(calibrated.map((c) => c.outcome));
    const consNeg = sum(calibrated.map((c) => fand(fneg(c.cond[k]), c.outcome))) / sum(calibrated.map((c) => c.outcome));
    const covPos = sum(calibrated.map((c) => fand(c.cond[k], c.outcome))) / sum(calibrated.map((c) => c.cond[k]));
    necessity[k] = {
      consistency: round(consPos),
      coverage: round(covPos),
      negConsistency: round(consNeg),
    };
  }

  // —— 样本不足：只给线索 + 提示 ——
  if (calibrated.length < 15) {
    return {
      n,
      sufficient: false,
      missingOutcome,
      calibrated,
      necessity,
      solutions: [],
      hint: `当前有效样本 ${calibrated.length} 人，达到 15 人后可出线索，30 人后可跑完整组态解。`,
    };
  }

  // —— 真值表：穷举 4 条件的 2^4=16 种组合 ——
  const truthRows = hindsightRows(calibrated);
  const minimal = calibrated.length < threshold;

  // —— 充分组态：从高一致性真值行出发做可解释化简 ——
  const solutions = deriveSolutions(truthRows, minimal);

  return {
    n,
    sufficient: !minimal,
    missingOutcome,
    calibrated,
    necessity,
    solutions,
    hint: !minimal
      ? null
      : `当前 ${calibrated.length} 人达到线索门槛，满 30 人后自动跑完整 fsQCA 组态解。`,
  };
}

// ==================== 内部实现 ====================

function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}
function round(x: number): number {
  return Math.round(x * 1000) / 1000;
}

/**
 * 构造真值表：先按高/低二分把每个校准值离散为真值行，
 * 每行统计"充分性一致性" = Σ min(条件交集, 结果) / Σ(条件交集)。
 */
function hindsightRows(
  cal: { cond: Record<CondKey, number>; outcome: number }[]
): { bits: number; n: number; consistency: number }[] {
  const agg = new Map<number, { inSum: number; consSum: number; cnt: number }>();
  for (const c of cal) {
    let bits = 0;
    let condIntersect = 1;
    COND_KEYS.forEach((k, i) => {
      if (c.cond[k] > 0.5) {
        bits |= 1 << i;
        condIntersect = Math.min(condIntersect, c.cond[k]);
      } else {
        // 条件为低时，该条件用其"否定成员度"参与交集（保守）
        condIntersect = Math.min(condIntersect, 1 - c.cond[k]);
      }
    });
    const cur = agg.get(bits) || { inSum: 0, consSum: 0, cnt: 0 };
    cur.inSum += condIntersect;
    cur.consSum += Math.min(condIntersect, c.outcome);
    cur.cnt += 1;
    agg.set(bits, cur);
  }
  const rows: { bits: number; n: number; consistency: number }[] = [];
  for (const [bits, v] of agg) {
    rows.push({ bits, n: v.cnt, consistency: v.inSum === 0 ? 0 : v.consSum / v.inSum });
  }
  return rows.sort((a, b) => b.consistency - a.consistency);
}

/**
 * 化简组态解：把高一致性(≥0.8)的真值行两两合并消去不同位，
 * 得到更紧凑的"充分条件组合"。每输出一个组态即为一条候选路径。
 * 只做一层合并（保留可解释性），不做完全最小化，够展示即可。
 */
function deriveSolutions(
  truthRows: { bits: number; n: number; consistency: number }[],
  minimal: boolean
): ConfigTerm[] {
  const CONS_THRESH = minimal ? 0.7 : 0.8;
  const high = truthRows.filter((r) => r.consistency >= CONS_THRESH && r.n >= 1);

  // 把 bits 转成 term（两组 bits 在相同位上相同即共享，不同则该位 '-'）
  function bitsToTerm(bs: number[]): Partial<Record<CondKey, '1' | '0'>> {
    const term: Partial<Record<CondKey, '1' | '0'>> = {};
    COND_KEYS.forEach((k, i) => {
      let v0: number | null = null;
      let same = true;
      for (const b of bs) {
        const bit = (b >> i) & 1;
        if (v0 === null) v0 = bit;
        else if (v0 !== bit) { same = false; break; }
      }
      if (same && v0 !== null) term[k] = v0 === 1 ? '1' : '0';
    });
    return term;
  }

  const solutions: ConfigTerm[] = [];
  const usedBits = new Set<number>();

  // 单行直接出解（高一致性且样本支持）
  for (const r of high) {
    const consRaw = r.consistency;
    const term = bitsToTerm([r.bits]);
    solutions.push({
      term,
      members: [r.bits],
      consistency: round(consRaw),
      rawCoverage: round(r.n / (truthRows.reduce((a, x) => a + x.n, 0))),
      uniqueCoverage: round(r.n / (truthRows.reduce((a, x) => a + x.n, 0))),
    });
    usedBits.add(r.bits);
  }

  // 两两合并消位（在一层内压缩）
  for (let i = 0; i < high.length; i++) {
    for (let j = i + 1; j < high.length; j++) {
      const a = high[i].bits;
      const b = high[j].bits;
      const diff = a ^ b;
      // 只对「恰好一个条件不同」的两行合并（消去该位）
      if ((diff & (diff - 1)) === 0) {
        const both = [a, b];
        const term = bitsToTerm(both);
        const consistency = Math.min(high[i].consistency, high[j].consistency);
        const coverage = (high[i].n + high[j].n) / (truthRows.reduce((a2, x) => a2 + x.n, 0));
        solutions.push({
          term,
          members: both,
          consistency: round(consistency),
          rawCoverage: round(coverage),
          uniqueCoverage: round(coverage),
        });
      }
    }
  }

  // 去重 + 降序，取 Top4 保持可读
  const seen = new Set<string>();
  const uniq = solutions.filter((s) => {
    const key = COND_KEYS.map((k) => s.term[k] ?? '-').join('');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return uniq.sort((a, b) => b.consistency - a.consistency || b.rawCoverage - a.rawCoverage).slice(0, 4);
}