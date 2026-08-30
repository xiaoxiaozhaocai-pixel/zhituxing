import {
  encodeDegree,
  encodeInternshipCount,
  encodeInternshipQuality,
  encodeSkillSet,
  encodeProfile,
} from '@/lib/career-paths/engine/condition_encoder';

describe('encodeDegree 学历编码', () => {
  it('本科 → 0.60', () => expect(encodeDegree('本科')).toBe(0.6));
  it('硕士 → 0.95', () => expect(encodeDegree('硕士')).toBe(0.95));
  it('研究生 → 0.95', () => expect(encodeDegree('研究生')).toBe(0.95));
  it('博士 → 0.95', () => expect(encodeDegree('博士')).toBe(0.95));
  it('大专 → 0.25', () => expect(encodeDegree('大专')).toBe(0.25));
  it('专科 → 0.25', () => expect(encodeDegree('专科')).toBe(0.25));
  it('未知学历默认本科 → 0.60', () => expect(encodeDegree('未知')).toBe(0.6));
  it('去空白干扰', () => expect(encodeDegree(' 硕士 ')).toBe(0.95));
});

describe('encodeInternshipCount 实习数量编码', () => {
  it('0段 → 0.05', () => expect(encodeInternshipCount(0)).toBe(0.05));
  it('1段 → 0.50', () => expect(encodeInternshipCount(1)).toBe(0.5));
  it('2段 → 0.75', () => expect(encodeInternshipCount(2)).toBe(0.75));
  it('3段 → 0.95', () => expect(encodeInternshipCount(3)).toBe(0.95));
  it('5段 → 0.95（封顶）', () => expect(encodeInternshipCount(5)).toBe(0.95));
  it('负数兜底 → 0.05', () => expect(encodeInternshipCount(-1)).toBe(0.05));
});

describe('encodeInternshipQuality 实习质量编码', () => {
  it('头部 → 0.95', () => expect(encodeInternshipQuality('头部大厂')).toBe(0.95));
  it('世界500强 → 0.95', () => expect(encodeInternshipQuality('世界500强')).toBe(0.95));
  it('字节 → 0.75', () => expect(encodeInternshipQuality('字节跳动')).toBe(0.75));
  it('腾讯 → 0.75', () => expect(encodeInternshipQuality('腾讯')).toBe(0.75));
  it('中厂 → 0.50', () => expect(encodeInternshipQuality('中厂')).toBe(0.5));
  it('上市公司 → 0.50', () => expect(encodeInternshipQuality('上市公司')).toBe(0.5));
  it('小厂 → 0.25', () => expect(encodeInternshipQuality('小厂')).toBe(0.25));
  it('普通公司 → 0.25', () => expect(encodeInternshipQuality('普通公司')).toBe(0.25));
  it('无 → 0.05', () => expect(encodeInternshipQuality('')).toBe(0.05));
});

describe('encodeSkillSet 技能数量编码', () => {
  it('无技能 → 0.25（兜底）', () => expect(encodeSkillSet([])).toBe(0.25));
  it('1项 → 0.25', () => expect(encodeSkillSet(['python'])).toBe(0.25));
  it('3项 → 0.50', () => expect(encodeSkillSet(['a', 'b', 'c'])).toBe(0.5));
  it('5项 → 0.75', () => expect(encodeSkillSet(['a', 'b', 'c', 'd', 'e'])).toBe(0.75));
  it('8项 → 0.95', () => expect(encodeSkillSet(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'])).toBe(0.95));
});

describe('encodeProfile 画像编码综合', () => {
  it('桂电+计算机+本科+2实习+大厂+3技能 → 分档', () => {
    const r = encodeProfile({
      school: '桂林电子科技大学',
      major: '计算机科学与技术',
      degree: '本科',
      internshipCount: 2,
      internshipQuality: '大厂',
      skills: ['python', 'js', 'sql'],
    });
    expect(r.SCH_TIER).toBe(0.5);      // 桂电
    expect(r.MAJ_CAT).toBe('IT-计算机'); // 计算机
    expect(r.DEG_LEV).toBe(0.6);       // 本科
    expect(r.INT_NUM).toBe(0.75);      // 2段
    expect(r.INT_QLT).toBe(0.75);      // 大厂
    expect(r.SKILL_SET).toBe(0.5);     // 3项
  });

  it('清华+软件+硕士+3实习+头部+8技能 → 高分档', () => {
    const r = encodeProfile({
      school: '清华大学',
      major: '软件工程',
      degree: '硕士',
      internshipCount: 3,
      internshipQuality: '头部',
      skills: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
    });
    expect(r.SCH_TIER).toBe(0.95);   // 清华
    expect(r.DEG_LEV).toBe(0.95);    // 硕士
    expect(r.INT_NUM).toBe(0.95);    // 3段
    expect(r.INT_QLT).toBe(0.95);    // 头部
    expect(r.SKILL_SET).toBe(0.95);  // 8项
  });
});
