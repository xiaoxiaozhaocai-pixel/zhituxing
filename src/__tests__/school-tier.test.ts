import { encodeSchool, getSchoolTier } from '@/lib/career-paths/engine/school_tier';

describe('encodeSchool 学校→编码值', () => {
  it('桂林电子科技大学 → 0.50（一本）', () => {
    expect(encodeSchool('桂林电子科技大学')).toBe(0.5);
  });

  it('桂电别名 → 0.50', () => {
    expect(encodeSchool('桂电')).toBe(0.5);
  });

  it('北京邮电大学 → 0.75（211）', () => {
    expect(encodeSchool('北京邮电大学')).toBe(0.75);
  });

  it('西电别名 → 0.75（211）', () => {
    expect(encodeSchool('西安电子科技大学')).toBe(0.75);
  });

  it('清华大学 → 0.95（985）', () => {
    expect(encodeSchool('清华大学')).toBe(0.95);
  });

  it('华中科技大学 → 0.95（985）', () => {
    expect(encodeSchool('华中科技大学')).toBe(0.95);
  });

  it('未匹配学校 → 0.25（默认二本）', () => {
    expect(encodeSchool('某普通高级中学')).toBe(0.25);
  });
});

describe('getSchoolTier 学校→档次标签', () => {
  it('桂林电子科技大学 → 一本', () => {
    expect(getSchoolTier('桂林电子科技大学')).toBe('一本');
  });

  it('西安电子科技大学 → 211', () => {
    expect(getSchoolTier('西安电子科技大学')).toBe('211');
  });

  it('华中科技大学 → 985', () => {
    expect(getSchoolTier('华中科技大学')).toBe('985');
  });

  it('未匹配学校 → 其他', () => {
    expect(getSchoolTier('某普通学校')).toBe('其他');
  });
});
