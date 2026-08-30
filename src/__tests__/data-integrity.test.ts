import { JUDGMENT_CAUSAL_LAYER } from '@/lib/career-paths/engine/judgment_layer';
import { JOBS, listCapabilityJobs } from '@/lib/career-paths/engine/capability_dictionary';
import { ALL_INDUSTRY_RADAR, interviewRadar, listIndustryRadars } from '@/lib/career-paths/engine/interview_radar';

describe('judgment_layer 因果层数据完整性', () => {
  it('因果层非空且每条字段完整', () => {
    expect(JUDGMENT_CAUSAL_LAYER.length).toBeGreaterThan(0);
    for (const item of JUDGMENT_CAUSAL_LAYER) {
      expect(item.id).toBeTruthy();
      expect(item.title).toBeTruthy();
      expect(item.premise).toBeTruthy();
      expect(item.inference).toBeTruthy();
      expect(item.conclusion).toBeTruthy();
      expect(item.source).toBeTruthy();
      expect(item.sourceUrl).toMatch(/^https?:\/\//);
      expect(['HIGH', 'MEDIUM', 'LOW']).toContain(item.confidence);
    }
  });

  it('因果层 id 唯一', () => {
    const ids = JUDGMENT_CAUSAL_LAYER.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('capability_dictionary 能力词典数据完整性', () => {
  it('JOBS 非空，每条 job 字段完整', () => {
    expect(JOBS.length).toBeGreaterThan(0);
    for (const job of JOBS) {
      expect(job.id).toBeTruthy();
      expect(job.name).toBeTruthy();
      expect(job.category).toBeTruthy();
      expect(Array.isArray(job.layers)).toBe(true);
      expect(job.layers.length).toBeGreaterThan(0);
    }
  });

  it('JOBS id 唯一', () => {
    const ids = JOBS.map((j) => j.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('listCapabilityJobs 返回与 JOBS 数量一致', () => {
    const list = listCapabilityJobs();
    expect(list.length).toBe(JOBS.length);
    for (const j of list) {
      expect(j.id).toBeTruthy();
      expect(j.name).toBeTruthy();
      expect(j.category).toBeTruthy();
    }
  });
});

describe('interview_radar 行业雷达数据完整性', () => {
  it('雷达非空，每条字段完整', () => {
    expect(ALL_INDUSTRY_RADAR.length).toBeGreaterThan(0);
    for (const r of ALL_INDUSTRY_RADAR) {
      expect(r.key).toBeTruthy();
      expect(r.label).toBeTruthy();
      expect(r.blurb).toBeTruthy();
      expect(Array.isArray(r.focus)).toBe(true);
      expect(Array.isArray(r.questions)).toBe(true);
      expect(Array.isArray(r.redFlags)).toBe(true);
      expect(Array.isArray(r.prepTips)).toBe(true);
    }
  });

  it('雷达 key 唯一', () => {
    const keys = ALL_INDUSTRY_RADAR.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('listIndustryRadars 返回与雷达数量一致', () => {
    const list = listIndustryRadars();
    expect(list.length).toBe(ALL_INDUSTRY_RADAR.length);
  });

  it('interviewRadar 空输入 → needsMoreInfo 且不崩', () => {
    const r = interviewRadar();
    expect(r.needsMoreInfo).toBe(true);
    expect(r.radar).toBeDefined();
  });

  it('interviewRadar 未识别行业 → 通用兜底不崩', () => {
    const r = interviewRadar('zzzzzzzzzz');
    expect(r.radar).toBeDefined();
    expect(r.summary).toBeTruthy();
  });
});
