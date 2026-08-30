import {
  classifyJobRole,
  getJobRoleInfo,
  buildWeightedBreakdown,
  type JobRoleKey,
} from '@/lib/matching-algorithm';

const ALL_ROLE_KEYS: JobRoleKey[] = [
  'data_ai',
  'technology',
  'manufacturing',
  'design',
  'finance',
  'function_admin',
  'marketing',
  'general',
];

describe('岗位加权评分 + 可解释合成（判断力 · 块2）', () => {
  it('岗位角色分类按关键词命中', () => {
    expect(classifyJobRole('数据分析师', '互联网')).toBe('data_ai');
    expect(classifyJobRole('工艺工程师', '制造业')).toBe('manufacturing');
    expect(classifyJobRole('UI设计师', '互联网')).toBe('design');
    expect(classifyJobRole('财务专员', '金融')).toBe('finance');
    expect(classifyJobRole('人事助理', '企业')).toBe('function_admin');
    expect(classifyJobRole('市场运营', '')).toBe('marketing');
    expect(classifyJobRole('前端开发工程师', 'IT')).toBe('technology');
    expect(classifyJobRole('销售代表', '零售')).toBe('marketing');
  });

  it('未识别岗位回退通用权重', () => {
    expect(classifyJobRole('某种小众岗位', '')).toBe('general');
    expect(classifyJobRole('', '')).toBe('general');
    expect(classifyJobRole(undefined, undefined)).toBe('general');
  });

  it('每个岗位角色权重和恒为 1', () => {
    for (const key of ALL_ROLE_KEYS) {
      const { weights } = getJobRoleInfo(key);
      const sum =
        weights.skill +
        weights.education +
        weights.major +
        weights.location +
        weights.experience +
        weights.salary;
      expect(sum).toBeCloseTo(1, 5);
    }
  });

  it('技术岗技能权重最高，且各角色加权理由非空', () => {
    const { weights, rationale } = getJobRoleInfo('technology');
    expect(weights.skill).toBeGreaterThan(weights.major);
    expect(rationale.length).toBeGreaterThan(0);
  });

  it('buildWeightedBreakdown 计算各维度贡献并求和', () => {
    const role = getJobRoleInfo('technology');
    const breakdown = buildWeightedBreakdown(
      { skill: 100, education: 80, major: 60, location: 100, experience: 60, salary: 80 },
      role
    );
    expect(breakdown.breakdown).toHaveLength(6);
    const totalFromDim = breakdown.breakdown.reduce((s, d) => s + d.contribution, 0);
    expect(breakdown.totalScore).toBe(Math.round(totalFromDim));
    for (const d of breakdown.breakdown) {
      expect(d.contribution).toBe(Math.round(d.score * d.weight));
    }
    // skill=100 weight=0.5 贡献 50 为最大
    expect(breakdown.strongest.dimension).toBe('skill');
    expect(breakdown.advice).toContain('建议');
    expect(breakdown.advice).toContain(role.label);
  });

  it('分档建议随分数变化', () => {
    const role = getJobRoleInfo('general');
    const high = buildWeightedBreakdown(
      { skill: 100, education: 100, major: 100, location: 100, experience: 100, salary: 100 },
      role
    );
    expect(high.advice).toContain('较契合');
    const low = buildWeightedBreakdown(
      { skill: 10, education: 10, major: 10, location: 10, experience: 10, salary: 10 },
      role
    );
    expect(low.advice).toContain('偏弱');
  });
});
