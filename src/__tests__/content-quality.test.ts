import { SUBTEXT_GLOSSARY } from '@/lib/career-paths/engine/subtext_dictionary';
import { ALL_INDUSTRY_RADAR } from '@/lib/career-paths/engine/interview_radar';
import { ALL_COGNITIVE_KNOWLEDGE } from '@/lib/career-paths/engine/cognitive_knowledge';
import { JOBS, listCapabilityJobs } from '@/lib/career-paths/engine/capability_dictionary';
import { JUDGMENT_CAUSAL_LAYER } from '@/lib/career-paths/engine/judgment_layer';

/**
 * Phase 4 · 内容品质契约（零模型成本，静态红线扫描）
 * 把「守四真 / 禁答辩 / 判断力≠打分」三条硬约束固化为可自动运行、
 * 可持续回归的内容品质门禁，防止内容底座在后续扩充时悄悄引入
 * 夸大失真数字、答辩等红线词，或产出「只打分不解释」的劣质内容。
 */

const GLOSSARY = Object.entries(SUBTEXT_GLOSSARY).map(([key, e]) => ({
  phrase: key,
  surface: e.surface,
  meaning: e.meaning,
  risk: e.risk,
  advice: e.advice,
}));

/** 全量序列化所有内容底座，便于一次红线扫描 */
function serializeAllContent(): string {
  return [
    ...GLOSSARY.map((e) => `${e.phrase}|${e.surface}|${e.meaning}|${e.advice}`),
    ...ALL_INDUSTRY_RADAR.map(
      (r) =>
        `${r.key}|${r.label}|${r.blurb}|${JSON.stringify(r.focus)}|${JSON.stringify(
          r.questions,
        )}|${JSON.stringify(r.redFlags)}|${JSON.stringify(r.prepTips)}`,
    ),
    ...ALL_COGNITIVE_KNOWLEDGE.flatMap((c) =>
      [
        `${c.subCategory}|${c.label}|${c.category}|${c.coreCourses.join()}|${c.derivedSkills.join()}`,
        ...c.jobDirections.map((d) => `${d.job}|${d.jobs.join()}|${d.matchLevel}|${d.why}`),
      ],
    ),
    ...JOBS.map((j) => `${j.id}|${j.name}|${j.category}|${JSON.stringify(j.layers)}`),
    ...JUDGMENT_CAUSAL_LAYER.map((x) => `${x.title}|${x.premise}|${x.inference}|${x.conclusion}`),
  ].join('\n');
}

describe('内容品质 · 守四真（禁夸大失真数字）', () => {
  const all = serializeAllContent();

  it('全量内容不含「20000+/10000+/100000+」等夸大岗位/行业数字', () => {
    expect(all).not.toMatch(/20000\+|10,?000\+|100000\+|10000\+岗位/);
  });

  it('全量内容不含「覆盖27大行业/27大行业」等失真行业数', () => {
    expect(all).not.toMatch(/覆盖\s*27\s*大行业|27\s*大行业|27个行业/);
  });

  it('全量内容不含「2万+/1万+真实JD」等夸大 JD 量', () => {
    // 「1 万+」在判断力因果层用于描述「毕业就该 1 万+」的学生偏差认知，属合理示例，需放行；
    // 但「2万+」「5万+」这类对外宣传性夸大表述禁止出现。
    expect(all).not.toMatch(/2\s*万\+|5\s*万\+|8\s*万\+|10\s*万\+/);
  });
});

describe('内容品质 · 禁答辩（SOUL 内容红线）', () => {
  const all = serializeAllContent();

  it('全量内容不含「答辩」红线词', () => {
    expect(all).not.toMatch(/答辩/);
  });
});

describe('内容品质 · 判断力≠打分（每条都给出解释+路径+建议）', () => {
  it('词条库每条都有 surface/meaning/advice（解释+潜台词+应对建议）', () => {
    expect(GLOSSARY.length).toBeGreaterThan(0);
    for (const e of GLOSSARY) {
      expect(e.surface.length).toBeGreaterThan(0);
      expect(e.meaning.length).toBeGreaterThan(0);
      expect(e.advice.length).toBeGreaterThan(0);
    }
  });

  it('行业雷达每条都有 blurb/focus/questions/redFlags/prepTips（含路径与建议）', () => {
    expect(ALL_INDUSTRY_RADAR.length).toBeGreaterThan(0);
    for (const r of ALL_INDUSTRY_RADAR) {
      expect(r.blurb.length).toBeGreaterThan(0);
      expect(r.focus.length).toBeGreaterThan(0);
      expect(r.questions.length).toBeGreaterThan(0);
      expect(r.redFlags.length).toBeGreaterThan(0);
      expect(r.prepTips.length).toBeGreaterThan(0);
    }
  });

  it('认知库每条 jobDirection 都有为什么(why)与匹配度(matchLevel)，非纯打分', () => {
    expect(ALL_COGNITIVE_KNOWLEDGE.length).toBeGreaterThan(0);
    for (const c of ALL_COGNITIVE_KNOWLEDGE) {
      expect(c.jobDirections.length).toBeGreaterThan(0);
      for (const d of c.jobDirections) {
        expect(d.why.length).toBeGreaterThan(0);
        expect(['高度对口', '中等对口', '需发力']).toContain(d.matchLevel);
      }
    }
  });

  it('能力词典每条都含 4 类能力层（行业/硬技能/软技能/经验信号）+ 补课路径', () => {
    expect(JOBS.length).toBeGreaterThan(0);
    const jobs = listCapabilityJobs();
    expect(jobs.length).toBe(JOBS.length);
    for (const j of JOBS) {
      const layers = j.layers as unknown as { key?: string; items?: string[] }[];
      expect(layers.length).toBeGreaterThan(0);
    }
  });

  it('判断力因果层每条都有 premise→inference→conclusion（推理链，非单点结论）', () => {
    expect(JUDGMENT_CAUSAL_LAYER.length).toBeGreaterThan(0);
    for (const x of JUDGMENT_CAUSAL_LAYER) {
      expect(x.premise.length).toBeGreaterThan(0);
      expect(x.inference.length).toBeGreaterThan(0);
      expect(x.conclusion.length).toBeGreaterThan(0);
    }
  });
});
