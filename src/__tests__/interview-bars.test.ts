import {
  INTERVIEW_BARS,
  getBarsDimension,
  scoreToBarsLevel,
  buildBarsPrompt,
} from '@/lib/career-paths/engine/interview_bars';

describe('interview_bars BARS 行为锚定量表', () => {
  it('三个维度齐全且 id 唯一', () => {
    const ids = INTERVIEW_BARS.map((d) => d.id);
    expect(ids).toEqual(['communication', 'logic', 'professionalism']);
    expect(new Set(ids).size).toBe(3);
  });

  it('每个维度均为 5 级且覆盖 0-100 分数段', () => {
    for (const dim of INTERVIEW_BARS) {
      expect(dim.levels).toHaveLength(5);
      // 每级都有行为锚点
      for (const lv of dim.levels) {
        expect(lv.anchors.length).toBeGreaterThan(0);
        expect(lv.band[0]).toBeLessThanOrEqual(lv.band[1]);
      }
      // 从 L1 到 L5 分数段连续递增且覆盖 0-100
      const bands = dim.levels.map((l) => l.band);
      expect(bands[0][0]).toBe(0);
      expect(bands[4][1]).toBe(100);
      for (let i = 1; i < bands.length; i++) {
        expect(bands[i][0]).toBe(bands[i - 1][1] + 1);
      }
    }
  });

  it('getBarsDimension 命中与兜底', () => {
    expect(getBarsDimension('logic')?.name).toBe('逻辑力');
    expect(getBarsDimension('communication')?.name).toBe('沟通力');
    // @ts-expect-error 传入非法 id 应返回 undefined
    expect(getBarsDimension('unknown')).toBeUndefined();
  });

  it('scoreToBarsLevel 按分数反查锚点级', () => {
    expect(scoreToBarsLevel('communication', 95)?.level).toBe(5);
    expect(scoreToBarsLevel('communication', 20)?.level).toBe(1);
    expect(scoreToBarsLevel('logic', 85)?.level).toBe(4);
    expect(scoreToBarsLevel('professionalism', 65)?.level).toBe(3);
  });

  it('scoreToBarsLevel 兜底未知维度', () => {
    // @ts-expect-error 非法维度
    expect(scoreToBarsLevel('nope', 50)).toBeUndefined();
  });

  it('buildBarsPrompt 包含步骤与维度名', () => {
    const p = buildBarsPrompt();
    expect(p).toContain('行为锚定');
    expect(p).toContain('沟通力');
    expect(p).toContain('逻辑力');
    expect(p).toContain('专业度');
    expect(p).toContain('列举观察到的具体行为');
  });
});
