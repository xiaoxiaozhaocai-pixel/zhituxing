import {
  parseSalaryRange,
  calculateCompetencyPercentile,
  parseJobSkills,
  extractUserSkillsFromAbilityBackground,
  parseUserSkillsFromText,
} from '@/lib/matching-algorithm';

describe('parseSalaryRange 薪资区间解析', () => {
  it('中文单位：千-万 / 万-万 / 千-千', () => {
    expect(parseSalaryRange('8千-1.2万')).toEqual({ min: 8000, max: 12000 });
    expect(parseSalaryRange('1万-2万')).toEqual({ min: 10000, max: 20000 });
    expect(parseSalaryRange('8千-15千')).toEqual({ min: 8000, max: 15000 });
  });

  it('k 格式：8k-12k / 8K-12K / 10-15k', () => {
    expect(parseSalaryRange('8k-12k')).toEqual({ min: 8000, max: 12000 });
    expect(parseSalaryRange('8K-12K')).toEqual({ min: 8000, max: 12000 });
    expect(parseSalaryRange('10-15k')).toEqual({ min: 10000, max: 15000 });
  });

  it('纯数字与带/月后缀', () => {
    expect(parseSalaryRange('8000-12000')).toEqual({ min: 8000, max: 12000 });
    expect(parseSalaryRange('8k-12k/月')).toEqual({ min: 8000, max: 12000 });
  });

  it('无法解析时返回 null', () => {
    expect(parseSalaryRange('')).toBeNull();
    expect(parseSalaryRange('面议')).toBeNull();
  });
});

describe('calculateCompetencyPercentile 竞争力百分位', () => {
  it('无竞争者时用户为第1名、百分位100', () => {
    const r = calculateCompetencyPercentile(80, []);
    expect(r.rank).toBe(1);
    expect(r.percentileRank).toBe(100);
    expect(r.totalPeers).toBe(1);
    expect(r.statistics.medianScore).toBe(80);
  });

  it('常规排名：用户80分在[60,70,90,100]中排第3、百分位50', () => {
    const peers = [60, 70, 90, 100].map((s, i) => ({ userId: `u${i}`, matchScore: s }));
    const r = calculateCompetencyPercentile(80, peers);
    expect(r.totalPeers).toBe(5);
    expect(r.rank).toBe(3);
    expect(r.percentileRank).toBe(50);
    expect(r.statistics.averageScore).toBe(80);
    expect(r.statistics.medianScore).toBe(80);
    expect(r.statistics.topDecileScore).toBe(100);
  });

  it('同分取最高百分位', () => {
    const r = calculateCompetencyPercentile(80, [{ userId: 'u1', matchScore: 80 }]);
    expect(r.rank).toBe(1);
    expect(r.percentileRank).toBe(100);
  });
});

describe('parseJobSkills 岗位技能解析', () => {
  it('编号列表格式', () => {
    const r = parseJobSkills('1. Java；2. Spring；3. MySQL');
    expect(r.map((s) => s.name)).toEqual(['Java', 'Spring', 'MySQL']);
    expect(r.every((s) => s.required)).toBe(true);
  });

  it('逗号/顿号分隔格式', () => {
    const r = parseJobSkills('Java, Python，Go、Rust');
    expect(r.map((s) => s.name)).toEqual(['Java', 'Python', 'Go', 'Rust']);
  });

  it('空输入返回空数组', () => {
    expect(parseJobSkills('')).toEqual([]);
    expect(parseJobSkills('   ')).toEqual([]);
  });
});

describe('extractUserSkillsFromAbilityBackground 能力背景提取', () => {
  it('coreSkills/officeSkills/certificates 按各自等级提取', () => {
    const r = extractUserSkillsFromAbilityBackground({
      coreSkills: ['招聘配置'],
      officeSkills: ['Excel'],
      certificates: ['人力资源管理师'],
      languages: [{ language: '英语', level: 'CET-6' }],
    });
    expect(r.find((s) => s.name === '招聘配置')).toMatchObject({ level: 3, proficiency: '基础' });
    expect(r.find((s) => s.name === 'Excel')).toMatchObject({ level: 2, proficiency: '入门' });
    expect(r.find((s) => s.name === '人力资源管理师')).toMatchObject({ level: 3, proficiency: '持证' });
    expect(r.find((s) => s.name === '英语')).toMatchObject({ level: 4, proficiency: 'CET-6' });
  });

  it('null/非对象输入返回空数组', () => {
    expect(extractUserSkillsFromAbilityBackground(null)).toEqual([]);
    expect(extractUserSkillsFromAbilityBackground(undefined)).toEqual([]);
  });
});

describe('parseUserSkillsFromText 技能文本解析', () => {
  it('多分隔符混合', () => {
    const r = parseUserSkillsFromText('Java，Python；React|SQL\nExcel');
    expect(r.map((s) => s.name)).toEqual(['Java', 'Python', 'React', 'SQL', 'Excel']);
    expect(r[0]).toMatchObject({ level: 3, proficiency: '基础' });
  });

  it('空输入返回空数组', () => {
    expect(parseUserSkillsFromText(null)).toEqual([]);
    expect(parseUserSkillsFromText('')).toEqual([]);
  });
});
