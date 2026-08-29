import { gradeToStage, planCareerPath, listTracks } from '@/lib/career-paths/engine/career_path_planner';

describe('gradeToStage 年级映射', () => {
  it('大一 → foundation', () => {
    expect(gradeToStage('大一').stage).toBe('foundation');
  });
  it('大四 → push', () => {
    expect(gradeToStage('大四').stage).toBe('push');
  });
  it('毕业 → hunt', () => {
    expect(gradeToStage('毕业').stage).toBe('hunt');
  });
  it('在职 → onboard', () => {
    expect(gradeToStage('在职').stage).toBe('onboard');
  });
  it('未知/空 → 默认 develop', () => {
    expect(gradeToStage('').stage).toBe('develop');
  });
});

describe('planCareerPath 无输入兜底', () => {
  it('空输入 → 给参照路线 + 待补全信息', () => {
    const r = planCareerPath({});
    expect(r.needsMoreInfo).toBe(true);
    expect(r.trackKey).toBe('dev');
    expect(r.roadmap.length).toBe(6);
    expect(r.currentStageLabel).toContain('待你补全年级');
    expect(r.summary).toContain('告诉我你的专业和年级');
  });
});

describe('planCareerPath 完整输入（专业+年级）', () => {
  it('计算机+大四 → 软件开发·冲刺期', () => {
    const r = planCareerPath({ major: '计算机科学与技术', grade: '大四' });
    const stageInfo = gradeToStage('大四');
    expect(r.needsMoreInfo).toBe(false);
    expect(r.trackKey).toBe('dev');
    expect(r.trackLabel).toBe('软件开发');
    expect(r.currentStageLabel).toBe(stageInfo.label);
    expect(r.roadmap[0].stage).toBe(stageInfo.stage);
    expect(r.majorCategory).toBe('IT');
    expect(r.jobDirections).toContain('后端/全栈开发');
    expect(r.summary).toContain('大四·冲刺期');
  });
});

describe('planCareerPath direction 别名识别', () => {
  it('数据分析 → data', () => {
    const r = planCareerPath({ direction: '数据分析' });
    expect(r.trackKey).toBe('data');
    expect(r.trackLabel).toBe('数据/算法');
  });
  it('工艺 → manufacture', () => {
    const r = planCareerPath({ direction: '工艺' });
    expect(r.trackKey).toBe('manufacture');
  });
  it('产品经理 → business', () => {
    const r = planCareerPath({ direction: '产品经理' });
    expect(r.trackKey).toBe('business');
  });
});

describe('listTracks 方向列表', () => {
  it('返回 6 个方向，结构完整', () => {
    const list = listTracks();
    expect(list.length).toBe(6);
    for (const t of list) {
      expect(t.key).toBeTruthy();
      expect(t.label).toBeTruthy();
      expect(Array.isArray(t.jobDirections)).toBe(true);
    }
  });
});
