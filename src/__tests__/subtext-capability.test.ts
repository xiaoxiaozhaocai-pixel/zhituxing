import { decodeSubtext, listSubtextGlossary } from '@/lib/career-paths/engine/subtext_dictionary';
import { analyzeCapabilityGap } from '@/lib/career-paths/engine/capability_dictionary';

describe('decodeSubtext 潜台词解码', () => {
  it('空输入 → needsMoreInfo 且不崩', () => {
    const r = decodeSubtext('');
    expect(r.needsMoreInfo).toBe(true);
    expect(r.items).toEqual([]);
    expect(r.summary).toContain('发我');
  });

  it('有输入 → 返回原文与词条数组', () => {
    const r = decodeSubtext('要有抗压能力');
    expect(r.input).toBe('要有抗压能力');
    expect(Array.isArray(r.items)).toBe(true);
    expect(typeof r.summary).toBe('string');
  });

  it('自动去除首尾空白', () => {
    const r = decodeSubtext(' 抗压 ');
    expect(r.input).toBe('抗压');
  });
});

describe('listSubtextGlossary 潜台词词典', () => {
  it('返回非空词条，每条结构完整', () => {
    const list = listSubtextGlossary();
    expect(list.length).toBeGreaterThan(0);
    for (const e of list) {
      expect(e.phrase).toBeTruthy();
      expect(e.category).toBeTruthy();
      expect(e.categoryLabel).toBeTruthy();
      expect(e.meaning).toBeTruthy();
      expect(['low', 'medium', 'high']).toContain(e.risk);
      expect(e.advice).toBeTruthy();
    }
  });
});

describe('analyzeCapabilityGap 能力差距诊断', () => {
  it('已知岗位 → 命中并给出对标', () => {
    const r = analyzeCapabilityGap({ targetJob: '工艺工程师' });
    expect(r.known).toBe(true);
    expect(r.matchedJob).toBe('工艺工程师');
    expect(r.layers.length).toBeGreaterThan(0);
    expect(r.summary).toContain('能力对标');
  });

  it('未知岗位 → 通用兜底不崩', () => {
    const r = analyzeCapabilityGap({ targetJob: 'zzzz未知岗位xyz' });
    expect(r.known).toBe(false);
    expect(r.matchedJob).toBe('zzzz未知岗位xyz');
    expect(r.summary).toContain('还没细化到行业级');
  });
});
