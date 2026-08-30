import { analyzeNarrative } from '@/lib/career-paths/engine/narrative';

describe('analyzeNarrative 空输入兜底', () => {
  it('空字符串返回兜底报告', () => {
    const r = analyzeNarrative('');
    expect(r.emphasis.value).toBe(0);
    expect(r.layers).toEqual([]);
    expect(r.translations).toEqual([]);
    expect(r.summary).toContain('未提供');
  });

  it('只有空白也走兜底', () => {
    const r = analyzeNarrative('   ');
    expect(r.emphasis.value).toBe(0);
  });
});

describe('analyzeNarrative 强信号经历（方法+结果+量化）', () => {
  const input = '我主导了产线数据化改造，通过SQL和Python搭建数据看板，不良率下降12%，节省成本30万';
  const r = analyzeNarrative(input, '后端开发工程师');

  it('识别为强信号，叙事价值高', () => {
    expect(r.emphasis.value).toBeGreaterThanOrEqual(70);
  });

  it('重点突出「硬技能」层（权重最高 40%）', () => {
    expect(r.emphasis.focus).toContain('硬技能');
  });

  it('高价值 placement 放简历前段', () => {
    expect(r.emphasis.placement).toContain('前 1-2 段');
  });

  it('硬技能层命中 SQL/Python', () => {
    const hard = r.layers.find((l) => l.layer === 'hard');
    expect(hard).toBeDefined();
    const labels = hard!.signals.map((s) => s);
    expect(labels).toContain('SQL 数据查询');
    expect(labels).toContain('Python 数据处理');
  });

  it('强信号翻译不拔高、去冗余主语「我」', () => {
    const t = r.translations[0];
    expect(t.translated).not.toContain('我');
    expect(t.rationale).toContain('结果');
  });

  it('summary 包含目标岗位与价值', () => {
    expect(r.summary).toContain('面向「后端开发工程师」');
    expect(r.summary).toContain('/100');
  });
});

describe('analyzeNarrative 弱信号经历（无方法/无结果/无量）', () => {
  const r = analyzeNarrative('我协助处理产线异常');

  it('识别为弱信号，叙事价值低', () => {
    expect(r.emphasis.value).toBeLessThan(60);
  });

  it('focus 提示需要补「方法+结果」', () => {
    expect(r.emphasis.focus).toContain('方法+结果');
  });

  it('低价值 placement 放后段', () => {
    expect(r.emphasis.placement).toContain('后段');
  });

  it('弱信号翻译给出补全框架（不编造）', () => {
    const t = r.translations[0];
    expect(t.translated).toContain('建议补');
  });
});

describe('analyzeNarrative 信号识别', () => {
  it('软技能「沟通/数据」要进入 soft 层', () => {
    const r = analyzeNarrative('负责跨部门沟通，用Excel做数据分析');
    const soft = r.layers.find((l) => l.layer === 'soft');
    expect(soft).toBeDefined();
    const labels = soft!.signals;
    expect(labels).toContain('跨部门沟通与协作'); // 沟通
    expect(labels).toContain('基于数据分析做决策'); // 数据
  });

  it('软技能层有 signal 时无缺口提示', () => {
    const r = analyzeNarrative('负责跨部门沟通，用Excel做数据分析');
    const soft = r.layers.find((l) => l.layer === 'soft');
    expect(soft!.gap).toBe('');
  });
});
