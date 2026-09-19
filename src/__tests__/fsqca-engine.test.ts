import {
  runFsqca,
  fuzzyCalibrate,
  outcomeCalibrate,
  COND_KEYS,
  type CandidateScores,
} from '@/lib/fsqca-engine';

describe('fuzzyCalibrate 模糊校准（1-5 整数 → [0,1] 成员度）', () => {
  it('4 分 → 0.95（完全成员，学术惯例避免 1.0）', () => expect(fuzzyCalibrate(4)).toBe(0.95));
  it('5 分 → 0.95（封顶）', () => expect(fuzzyCalibrate(5)).toBe(0.95));
  it('3 分 → 0.5（交叉点最大模糊）', () => expect(fuzzyCalibrate(3)).toBe(0.5));
  it('2 分 → 0.05（完全不成员，避免 0 完全否定）', () => expect(fuzzyCalibrate(2)).toBe(0.05));
  it('1 分 → 0.05', () => expect(fuzzyCalibrate(1)).toBe(0.05));
  it('null → 0（缺失保守处理）', () => expect(fuzzyCalibrate(null)).toBe(0));
  it('undefined → 0', () => expect(fuzzyCalibrate(undefined)).toBe(0));
  it('越界值被 clamp 到 [1,5]', () => expect(fuzzyCalibrate(9)).toBe(0.95));
});

describe('outcomeCalibrate 结果变量（匹配度）校准', () => {
  it('match=4（>=4 匹配）→ 0.95', () => expect(outcomeCalibrate(4)).toBe(0.95));
  it('match=5 → 0.95', () => expect(outcomeCalibrate(5)).toBe(0.95));
  it('match=3 → 0.5（模糊）', () => expect(outcomeCalibrate(3)).toBe(0.5));
  it('match=null → 0（不参与组态建模）', () => expect(outcomeCalibrate(null)).toBe(0));
});

describe('runFsqca 门槛逻辑', () => {
  it('<15 人：仅返回线索，不强行出组态解（守四真）', () => {
    const rows: CandidateScores[] = Array.from({ length: 12 }, () => ({
      skill: 4, exp: 4, soft: 3, edu: 4, match: 4,
    }));
    const r = runFsqca(rows, 30);
    expect(r.sufficient).toBe(false);
    expect(r.solutions).toHaveLength(0);
    expect(r.hint).toContain('15');
    COND_KEYS.forEach((k) => expect(r.necessity[k]).toBeDefined());
  });

  it('15≤n<30：出线索级组态（minimal），不宣称完整解', () => {
    const rows: CandidateScores[] = Array.from({ length: 20 }, (_, i) => ({
      skill: 4, exp: i % 2 ? 4 : 3, soft: 3, edu: 4, match: 4,
    }));
    const r = runFsqca(rows, 30);
    expect(r.sufficient).toBe(false);
    expect(r.solutions.length).toBeGreaterThan(0);
    expect(r.hint).toContain('完整');
  });

  it('≥30 人：输出完整组态解，hint 为空', () => {
    const rows: CandidateScores[] = [];
    for (let i = 0; i < 15; i++) rows.push({ skill: 4, exp: 4, soft: 3, edu: 3, match: 4 });
    for (let i = 0; i < 10; i++) rows.push({ skill: 2, exp: 2, soft: 4, edu: 4, match: 4 });
    for (let i = 0; i < 5; i++) rows.push({ skill: 3, exp: 3, soft: 3, edu: 3, match: 2 });
    const r = runFsqca(rows, 30);
    expect(r.sufficient).toBe(true);
    expect(r.hint).toBeNull();
    expect(r.solutions.length).toBeGreaterThanOrEqual(1);
    expect(r.solutions.length).toBeLessThanOrEqual(4);
    expect(r.n).toBe(30);
  });
});

describe('runFsqca 组态解内容正确性', () => {
  it('能真实解码数据模式（技能×经验 与 软素质×学历）', () => {
    const rows: CandidateScores[] = [];
    for (let i = 0; i < 15; i++) rows.push({ skill: 4, exp: 4, soft: 3, edu: 3, match: 4 });
    for (let i = 0; i < 10; i++) rows.push({ skill: 2, exp: 2, soft: 4, edu: 4, match: 4 });
    for (let i = 0; i < 5; i++) rows.push({ skill: 3, exp: 3, soft: 3, edu: 3, match: 2 });
    const r = runFsqca(rows, 30);
    // 主组态应为 技能+经验 高（占比最大的匹配模式）
    expect(r.solutions.some((s) => s.term.skill === '1' && s.term.exp === '1')).toBe(true);
    // 组态一致性/覆盖率在合理区间
    r.solutions.forEach((s) => {
      expect(s.consistency).toBeGreaterThanOrEqual(0);
      expect(s.consistency).toBeLessThanOrEqual(1);
      expect(s.rawCoverage).toBeGreaterThanOrEqual(0);
      expect(s.rawCoverage).toBeLessThanOrEqual(1);
    });
  });

  it('necessity 必要性分析：四条件皆返回 consistency/coverage/negConsistency', () => {
    const rows: CandidateScores[] = Array.from({ length: 32 }, () => ({
      skill: 4, exp: 4, soft: 3, edu: 4, match: 4,
    }));
    const r = runFsqca(rows, 30);
    COND_KEYS.forEach((k) => {
      const c = r.necessity[k];
      expect(c).toBeDefined();
      expect(c!.consistency).toBeGreaterThanOrEqual(0);
      expect(c!.consistency).toBeLessThanOrEqual(1);
      expect(c!.coverage).toBeGreaterThanOrEqual(0);
      expect(c!.coverage).toBeLessThanOrEqual(1);
    });
  });
});

describe('runFsqca 缺失结果处理', () => {
  it('match 缺失样本不计入组态建模（missingOutcome 正确）', () => {
    const rows: CandidateScores[] = [];
    for (let i = 0; i < 28; i++) rows.push({ skill: 4, exp: 4, soft: 4, edu: 4, match: 4 });
    for (let i = 0; i < 5; i++) rows.push({ skill: 4, exp: 4, soft: 3, edu: 3, match: null });
    const r = runFsqca(rows, 30);
    expect(r.n).toBe(33);
    expect(r.missingOutcome).toBe(5);
    // 有效样本仅 28 人 < 30 → 不得判为完整（不编造）
    expect(r.sufficient).toBe(false);
  });
});