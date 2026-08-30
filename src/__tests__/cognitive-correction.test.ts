import { cognitiveCorrection } from '@/lib/career-paths/engine/cognitive_correction';

describe('cognitiveCorrection 已知专业命中', () => {
  it('计算机科学与技术 → 命中 IT-计算机', () => {
    const r = cognitiveCorrection('计算机科学与技术');
    expect(r.isKnown).toBe(true);
    expect(r.fallback).toBe(false);
    expect(r.subCategory).toBe('IT-计算机');
    expect(r.category).toBe('IT');
    expect(r.categoryLabel).toBe('计算机');
    expect(r.coreCourses.length).toBeGreaterThan(0);
    expect(r.derivedSkills.length).toBeGreaterThan(0);
    expect(r.jobDirections.length).toBeGreaterThan(0);
    expect(r.summary).toContain('其实不是只能做一件事');
  });

  it('软件工程 → 命中 IT-软件', () => {
    const r = cognitiveCorrection('软件工程');
    expect(r.isKnown).toBe(true);
    expect(r.subCategory).toBe('IT-软件');
    expect(r.categoryLabel).toBe('软件工程');
  });
});

describe('cognitiveCorrection 复合专业 byMajor 优先匹配', () => {
  it('市场营销 → coveredMajors 精确命中', () => {
    const r = cognitiveCorrection('市场营销');
    expect(r.isKnown).toBe(true);
    expect(r.fallback).toBe(false);
    expect(r.categoryLabel).toBe('市场营销');
  });
});

describe('cognitiveCorrection 未知专业兜底', () => {
  it('完全未知专业 → 不崩，归入其他兜底', () => {
    const r = cognitiveCorrection('完全未知专业xyz');
    expect(r.isKnown).toBe(false);
    expect(r.fallback).toBe(true);
    expect(r.subCategory).toBe('其他');
    expect(r.category).toBe('其他');
    expect(r.jobDirections[0].job).toBe('待确认方向');
    expect(r.jobDirections[0].matchLevel).toBe('需发力');
    expect(r.summary).toContain('没能识别出');
  });
});

describe('cognitiveCorrection 分年级行动建议', () => {
  it('大一大二 → 先修核心课程、积累实习', () => {
    const r = cognitiveCorrection('计算机科学与技术', '大一');
    expect(r.actions[0]).toContain('核心课程');
  });
  it('大四/毕业 → 优先投递对口岗位', () => {
    const r = cognitiveCorrection('计算机科学与技术', '大四');
    expect(r.actions[0]).toContain('高度对口');
  });
  it('中间年级 → 确定主攻方向', () => {
    const r = cognitiveCorrection('计算机科学与技术', '大三');
    expect(r.actions[0]).toContain('主攻方向');
  });
  it('无年级 → 先确认专业大类', () => {
    const r = cognitiveCorrection('计算机科学与技术');
    expect(r.actions[0]).toContain('专业所属大类');
  });
});
