import { buildMatchBreakdown } from '@/lib/employer-match-breakdown';

describe('employer-match-breakdown', () => {
  it('技能命中率正确计算，并产出解释层字段', () => {
    const bd = buildMatchBreakdown(
      { hard_skills: ['Java', 'MySQL', 'Git'], soft_skills: [] },
      { required_hard_skills: ['Java', 'Spring', 'MySQL'], target_industry: null, target_cities: [] }
    );
    const skills = bd.dimensions.find((d) => d.key === 'skills')!;
    expect(skills.enabled).toBe(true);
    expect(skills.weight).toBe(40);
    // 命中 Java、MySQL 共2项 / 3项 => 26.7
    expect(skills.gained).toBe(27);
    expect(bd.summary).toContain('综合匹配度');
    expect(bd.dimensions).toHaveLength(5);
  });

  it('岗位未设置行业/城市/技能时，对应维度 enabled=false 且不计分', () => {
    const bd = buildMatchBreakdown(
      { hard_skills: [], soft_skills: [] },
      { required_hard_skills: [], target_industry: null, target_cities: [] }
    );
    const skills = bd.dimensions.find((d) => d.key === 'skills')!;
    const industry = bd.dimensions.find((d) => d.key === 'industry')!;
    expect(skills.enabled).toBe(false);
    expect(industry.enabled).toBe(false);
    expect(skills.gained).toBe(0);
  });

  it('行业匹配命中得20分，错位得0分', () => {
    const post = { required_hard_skills: [], target_industry: '半导体', target_cities: [] };
    const hit = buildMatchBreakdown({ target_industry: '集成电路/半导体' }, post);
    const miss = buildMatchBreakdown({ target_industry: '消费电子' }, post);
    expect(hit.dimensions.find((d) => d.key === 'industry')!.gained).toBe(20);
    expect(miss.dimensions.find((d) => d.key === 'industry')!.gained).toBe(0);
  });

  it('城市覆盖命中得15分', () => {
    const post = { required_hard_skills: [], target_industry: null, target_cities: ['深圳', '广州'] };
    const hit = buildMatchBreakdown({ target_cities: ['深圳', '东莞'] }, post);
    const miss = buildMatchBreakdown({ target_cities: ['南宁', '桂林'] }, post);
    expect(hit.dimensions.find((d) => d.key === 'city')!.gained).toBe(15);
    expect(miss.dimensions.find((d) => d.key === 'city')!.gained).toBe(0);
  });

  it('画像完整度与测评分按比例计分', () => {
    const bd = buildMatchBreakdown(
      { portrait_completeness_score: 80, assessment_overall_score: 60 },
      { required_hard_skills: [], target_industry: null, target_cities: [] }
    );
    const completeness = bd.dimensions.find((d) => d.key === 'completeness')!;
    const assessment = bd.dimensions.find((d) => d.key === 'assessment')!;
    expect(completeness.gained).toBe(12); // 80/100*15
    expect(assessment.gained).toBe(6); // 60/100*10
  });

  it('全维度达成时给出优势与建议（无短板）', () => {
    const bd = buildMatchBreakdown(
      { hard_skills: ['Java', 'Spring', 'MySQL'], target_industry: '半导体', target_cities: ['深圳'], portrait_completeness_score: 90, assessment_overall_score: 85 },
      { required_hard_skills: ['Java', 'Spring', 'MySQL'], target_industry: '半导体', target_cities: ['深圳'] }
    );
    expect(bd.shortfalls).toHaveLength(0);
    expect(bd.strengths.length).toBeGreaterThan(0);
    expect(bd.advice).toContain('优先联系');
  });

  it('存在短板时给出针对性建议', () => {
    const bd = buildMatchBreakdown(
      { hard_skills: ['Java'], target_industry: '消费电子', target_cities: ['南宁'], portrait_completeness_score: 40, assessment_overall_score: 30 },
      { required_hard_skills: ['Java', 'Spring', 'MySQL'], target_industry: '半导体', target_cities: ['深圳'] }
    );
    expect(bd.shortfalls.length).toBeGreaterThan(0);
    expect(bd.advice).toContain('人工');
    expect(bd.advice).toContain('参考信号');
  });

  it('输入含 undefined/null 时安全（不抛异常）', () => {
    const bd = buildMatchBreakdown({}, {});
    expect(bd.dimensions).toHaveLength(5);
    expect(bd.dimensions.every((d) => !d.enabled)).toBe(true);
  });
});
