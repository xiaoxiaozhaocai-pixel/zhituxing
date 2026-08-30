import { encodeMajor, getSubCategoryLabel } from '@/lib/career-paths/engine/major_mapping';

describe('encodeMajor 专业→二级分类映射', () => {
  it('计算机科学与技术 → IT-计算机', () => {
    expect(encodeMajor('计算机科学与技术')).toBe('IT-计算机');
  });

  it('软件工程 → IT-软件', () => {
    expect(encodeMajor('软件工程')).toBe('IT-软件');
  });

  it('人工智能 → IT-人工智能', () => {
    expect(encodeMajor('人工智能')).toBe('IT-人工智能');
  });

  it('通信工程 → EE-通信', () => {
    expect(encodeMajor('通信工程')).toBe('EE-通信');
  });

  it('电气工程及其自动化 → ME-电气', () => {
    expect(encodeMajor('电气工程及其自动化')).toBe('ME-电气');
  });

  it('自动化 → ME-自动化', () => {
    expect(encodeMajor('自动化')).toBe('ME-自动化');
  });

  it('电子商务 → MGMT-电商（防被电子截胡）', () => {
    expect(encodeMajor('电子商务')).toBe('MGMT-电商');
  });

  it('人力资源管理 → MGMT-HR', () => {
    expect(encodeMajor('人力资源管理')).toBe('MGMT-HR');
  });

  it('视觉传达设计 → ART-设计', () => {
    expect(encodeMajor('视觉传达设计')).toBe('ART-设计');
  });

  it('未匹配专业 → 其他', () => {
    expect(encodeMajor('核物理')).toBe('其他');
  });

  it('去除首尾空白干扰', () => {
    expect(encodeMajor(' 计算机科学与技术 ')).toBe('IT-计算机');
  });
});

describe('getSubCategoryLabel 二级分类中文标签', () => {
  it('已知子类返回中文标签', () => {
    expect(getSubCategoryLabel('IT-计算机')).toBe('计算机');
    expect(getSubCategoryLabel('MGMT-HR')).toBe('人力资源管理');
    expect(getSubCategoryLabel('ART-设计')).toBe('设计');
  });

  it('未知子类原样返回', () => {
    expect(getSubCategoryLabel('UNKNOWN')).toBe('UNKNOWN');
  });
});
