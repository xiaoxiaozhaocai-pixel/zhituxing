import {
  GROUP_CASE_LIBRARY,
  ENGLISH_QUESTION_BANK,
  PRESSURE_FOLLOWUP_LIBRARY,
  buildModeKitBlock,
} from '@/lib/interview-mode-kits';
import { buildInterviewSystemPrompt } from '@/lib/interview-styles';

describe('interview_mode_kits P6 面试模式素材库', () => {
  it('群面案例库结构完整（每个 case 含 id/category/title/scenario/task/roles/evaluation）', () => {
    expect(GROUP_CASE_LIBRARY.length).toBeGreaterThanOrEqual(4);
    for (const c of GROUP_CASE_LIBRARY) {
      expect(c.id).toBeTruthy();
      expect(c.category).toBeTruthy();
      expect(c.title).toBeTruthy();
      expect(c.scenario.length).toBeGreaterThan(10);
      expect(c.task.length).toBeGreaterThan(5);
      expect(c.roles.length).toBeGreaterThanOrEqual(4);
      expect(c.evaluation.length).toBeGreaterThanOrEqual(3);
      // 每个角色必填 role/behavior/focus
      for (const r of c.roles) {
        expect(r.role).toBeTruthy();
        expect(r.behavior).toBeTruthy();
        expect(r.focus).toBeTruthy();
      }
    }
  });

  it('群面案例库包含四个类型（商业/资源/危机/开放）且有时计员/质疑者/支持者/总结者', () => {
    const categories = GROUP_CASE_LIBRARY.map((c) => c.category);
    expect(categories).toEqual(
      expect.arrayContaining(['商业策略', '资源排序', '危机处理', '开放辩论'])
    );
    const allRoles = GROUP_CASE_LIBRARY.flatMap((c) => c.roles.map((r) => r.role));
    for (const role of ['计时员', '质疑者', '支持者', '总结者']) {
      expect(allRoles).toContain(role);
    }
  });

  it('英文问法库结构完整（每个问题含 category/en/hint）', () => {
    expect(ENGLISH_QUESTION_BANK.length).toBeGreaterThanOrEqual(6);
    for (const q of ENGLISH_QUESTION_BANK) {
      expect(q.category).toBeTruthy();
      expect(q.en.length).toBeGreaterThan(5);
      expect(q.hint.length).toBeGreaterThan(10);
    }
    const categories = ENGLISH_QUESTION_BANK.map((q) => q.category);
    expect(categories).toEqual(expect.arrayContaining(['自我介绍', '行为面试', '技术/专业', '收尾反问']));
  });

  it('压力追问库结构完整（每个追问含 category/template）', () => {
    expect(PRESSURE_FOLLOWUP_LIBRARY.length).toBeGreaterThanOrEqual(8);
    for (const f of PRESSURE_FOLLOWUP_LIBRARY) {
      expect(f.category).toBeTruthy();
      expect(f.template.length).toBeGreaterThan(5);
    }
    const categories = PRESSURE_FOLLOWUP_LIBRARY.map((f) => f.category);
    expect(categories).toEqual(expect.arrayContaining(['质疑', '打断', '限时', '沉默施压']));
  });

  it('buildModeKitBlock 三种类型均返回非空且含对应关键词', () => {
    expect(buildModeKitBlock('group')).toContain('无领导群面参考案例库');
    expect(buildModeKitBlock('english')).toContain('英文面试高频问法库');
    expect(buildModeKitBlock('pressure')).toContain('压力面试追问库');
  });

  it('buildInterviewSystemPrompt 对 group/english/pressure 注入素材库，standard 不注入', () => {
    const group = buildInterviewSystemPrompt('group', 'warm', '');
    const english = buildInterviewSystemPrompt('english', 'strict', '');
    const pressure = buildInterviewSystemPrompt('pressure', 'pressure', '');
    const standard = buildInterviewSystemPrompt('standard', 'warm', '');
    expect(group).toContain('无领导群面参考案例库');
    expect(english).toContain('英文面试高频问法库');
    expect(pressure).toContain('压力面试追问库');
    expect(standard).not.toContain('参考案例库');
    expect(standard).not.toContain('英文面试高频问法库');
    expect(standard).not.toContain('压力面试追问库');
  });

  it('素材库守四真（不含「答辩」与夸大失真数字，判断力≠打分）', () => {
    const allText = [
      ...GROUP_CASE_LIBRARY.flatMap((c) => [
        c.title, c.scenario, c.task, ...c.roles.flatMap((r) => [r.role, r.behavior, r.focus]), ...c.evaluation,
      ]),
      ...ENGLISH_QUESTION_BANK.flatMap((q) => [q.category, q.en, q.hint]),
      ...PRESSURE_FOLLOWUP_LIBRARY.flatMap((f) => [f.category, f.template]),
    ].join(' ');
    expect(allText).not.toMatch(/答辩/);
    // 夸大失真数字红线（放行判断力因果层「1 万+」学生偏差认知示例属于内容库，这里素材库不应有夸大数字）
    expect(allText).not.toMatch(/(20000|10000|100000|27大行业|2万|5万|8万|10万)\+?/);
  });
});
