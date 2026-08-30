import { detectAnomalies } from '@/lib/analytics/anomaly-detection';

describe('异常检测与风险提示（判断力 · 块3）', () => {
  it('空数组：无异常，整体 ok', () => {
    const r = detectAnomalies([]);
    expect(r.count).toBe(0);
    expect(r.overall).toBe('ok');
    expect(r.mean).toBeNull();
    expect(r.items).toHaveLength(0);
  });

  it('全为 NaN：清洗后为空，无异常', () => {
    const r = detectAnomalies([Number.NaN, Number.NaN]);
    expect(r.count).toBe(0);
    expect(r.overall).toBe('ok');
  });

  it('单值：无异常，均值保留', () => {
    const r = detectAnomalies([42]);
    expect(r.count).toBe(0);
    expect(r.overall).toBe('ok');
    expect(r.mean).toBe(42);
  });

  it('全相同值（sd=0/IQR=0）：不触发离群', () => {
    const r = detectAnomalies([7, 7, 7, 7, 7]);
    expect(r.count).toBe(0);
    expect(r.overall).toBe('ok');
  });

  it('z-score 捕获明显偏高（warning · high）', () => {
    const r = detectAnomalies([10, 10, 10, 10, 10, 10, 10, 10, 10, 80]);
    expect(r.count).toBe(1);
    expect(r.items[0].index).toBe(9);
    expect(r.items[0].method).toBe('zscore');
    expect(r.items[0].direction).toBe('high');
    expect(r.items[0].riskLevel).toBe('warning');
    expect(r.items[0].zScore).not.toBeNull();
    expect(r.overall).toBe('attention');
  });

  it('z-score 捕获明显偏低（direction · low）', () => {
    const r = detectAnomalies([50, 50, 50, 50, 50, 50, 50, 50, 50, 5]);
    expect(r.count).toBe(1);
    expect(r.items[0].index).toBe(9);
    expect(r.items[0].direction).toBe('low');
    expect(r.items[0].riskLevel).toBe('warning');
  });

  it('IQR 捕获极端离群（alert · high）', () => {
    const r = detectAnomalies([1, 2, 3, 4, 5, 6, 7, 8, 9, 100]);
    expect(r.count).toBe(1);
    // z-score(warning) 与 IQR(alert) 同点去重，保留更高风险等级 alert
    expect(r.items[0].riskLevel).toBe('alert');
    expect(r.items[0].method).toBe('iqr');
    expect(r.items[0].direction).toBe('high');
    expect(r.overall).toBe('alert');
  });

  it('基线偏离：偏离基线超阈值触发 alert', () => {
    const r = detectAnomalies([12, 11, 10, 9, 11, 10, 40], {
      baseline: 10,
      methods: ['baseline'],
    });
    expect(r.count).toBe(1);
    expect(r.items[0].method).toBe('baseline');
    expect(r.items[0].direction).toBe('high');
    expect(r.items[0].riskLevel).toBe('alert');
    expect(r.overall).toBe('alert');
  });

  it('正常数据：无明显离群，整体 ok', () => {
    const r = detectAnomalies([5, 6, 5, 7, 6, 5, 6, 7, 6, 5]);
    expect(r.count).toBe(0);
    expect(r.overall).toBe('ok');
  });

  it('输出描述与建议：提示风险而非下因果结论', () => {
    const r = detectAnomalies([10, 10, 10, 10, 10, 10, 10, 10, 10, 80]);
    expect(r.items[0].description).toContain('离群信号');
    expect(r.items[0].suggestion).toContain('风险前置提示');
    expect(r.items[0].suggestion).toContain('不代表因果判断');
  });

  it('自定义 z 阈值：更窄的预警阈值捕获更多点', () => {
    const r = detectAnomalies([10, 10, 10, 10, 10, 10, 10, 10, 10, 80], {
      zWarnThreshold: 1.5,
    });
    expect(r.count).toBe(1);
    expect(r.items[0].riskLevel).toBe('warning');
  });
});
