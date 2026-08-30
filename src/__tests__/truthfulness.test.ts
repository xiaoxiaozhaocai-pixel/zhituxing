import { walkTruthfulness } from '@/lib/career-paths/engine/truthfulness';

describe('walkTruthfulness 四真红线引擎', () => {
  it('空输入返回 verifiable 且无风险', () => {
    const r = walkTruthfulness('');
    expect(r.verdict).toBe('verifiable');
    expect(r.riskCount).toBe(0);
    expect(r.highCount).toBe(0);
    expect(r.risks).toHaveLength(0);
  });

  it('干净真实表述不触发风险（第一人称+具体职责+成果）', () => {
    const r = walkTruthfulness('我负责招聘模块，完成简历筛选500份，产出录用15人。');
    expect(r.verdict).toBe('verifiable');
    expect(r.riskCount).toBe(0);
  });

  it('模糊「参与」且无职责词时触发 VAGUE_OWNERS', () => {
    const r = walkTruthfulness('参与了公司项目开发。');
    expect(r.risks.length).toBeGreaterThan(0);
    expect(r.risks.some((x) => x.rule === 'VAGUE_OWNERS')).toBe(true);
  });

  it('「参与」但已有职责词/第一人称时豁免（防误伤）', () => {
    const r = walkTruthfulness('我参与了公司项目开发，负责其中简历模块。');
    expect(r.risks.some((x) => x.rule === 'VAGUE_OWNERS')).toBe(false);
  });

  it('「主导/独立」无成果触发 LEAD_WITHOUT_PROOF 且高险', () => {
    const r = walkTruthfulness('我独立主导了公司后台系统建设。');
    expect(r.risks.some((x) => x.rule === 'LEAD_WITHOUT_PROOF')).toBe(true);
    expect(r.verdict).toBe('high_risk');
  });

  it('学生课设场景下的「主导」豁免（防误伤）', () => {
    const r = walkTruthfulness('我独立主导了课程设计的系统建设。');
    expect(r.risks.some((x) => x.rule === 'LEAD_WITHOUT_PROOF')).toBe(false);
  });

  it('数字无来源触发 UNSUPPORTED_NUMBER', () => {
    const r = walkTruthfulness('我提升了转化率30%。');
    expect(r.risks.some((x) => x.rule === 'UNSUPPORTED_NUMBER')).toBe(true);
  });

  it('数字已给出口径/来源时豁免', () => {
    const r = walkTruthfulness('我提升了转化率30%，数据来自系统导出。');
    expect(r.risks.some((x) => x.rule === 'UNSUPPORTED_NUMBER')).toBe(false);
  });

  it('营销词触发 MARKETING_PHRASE（medium 级）', () => {
    const r = walkTruthfulness('我赋能了团队业务。');
    const m = r.risks.find((x) => x.rule === 'MARKETING_PHRASE');
    expect(m).toBeDefined();
    expect(m!.level).toBe('medium');
  });

  it('团队成果无个人份额触发 TEAM_AS_OWN', () => {
    const r = walkTruthfulness('我们团队获得了年度第一的奖项。');
    expect(r.risks.some((x) => x.rule === 'TEAM_AS_OWN')).toBe(true);
  });

  it('团队成果已标明个人份额时豁免', () => {
    const r = walkTruthfulness('我们团队获得一等奖，我负责其中数据模块。');
    expect(r.risks.some((x) => x.rule === 'TEAM_AS_OWN')).toBe(false);
  });

  it('在校期间大额成果触发 TIMELINE_MISMATCH 且高险', () => {
    const r = walkTruthfulness('在校期间我拿下了国家级重大项目。');
    expect(r.risks.some((x) => x.rule === 'TIMELINE_MISMATCH')).toBe(true);
    expect(r.verdict).toBe('high_risk');
  });

  it('高险计数与 risks 中 high 级别一致', () => {
    const r = walkTruthfulness('我独立主导了公司后台系统建设。');
    expect(r.highCount).toBe(r.risks.filter((x) => x.level === 'high').length);
    expect(r.highCount).toBeGreaterThan(0);
  });

  it('风险项含四真解释与收敛建议（判断力≠打分）', () => {
    const r = walkTruthfulness('我独立主导了公司后台系统建设。');
    const lead = r.risks.find((x) => x.rule === 'LEAD_WITHOUT_PROOF');
    expect(lead!.why.length).toBeGreaterThan(0);
    expect(lead!.fix.length).toBeGreaterThan(0);
    expect(lead!.fix).toContain('证据');
  });
});
