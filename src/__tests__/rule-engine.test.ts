import {
  runEngine,
  getMatchReport,
  FIELD_WEIGHT,
} from '@/lib/career-paths/engine/rule_engine';
import { CONFIG } from '@/lib/career-paths/engine/config_routes';
import { EncodedProfile } from '@/lib/career-paths/types';

// IT 强画像：985 CS 硕士 + 3段头部实习 + 8项技能
const strongIT: EncodedProfile = {
  SCH_TIER: 0.95,
  MAJ_CAT: 'IT-计算机',
  DEG_LEV: 0.95,
  INT_NUM: 0.95,
  INT_QLT: 0.95,
  SKILL_SET: 0.95,
};

// 弱画像：非相关专业 + 无实习/基础技能
const weakProfile: EncodedProfile = {
  SCH_TIER: 0.25,
  MAJ_CAT: '其他',
  DEG_LEV: 0.25,
  INT_NUM: 0.05,
  INT_QLT: 0.05,
  SKILL_SET: 0.25,
};

describe('runEngine 匹配引擎（结构不变量）', () => {
  const report = runEngine(strongIT);

  it('遍历全部配置路由', () => {
    expect(report.routes.length).toBe(CONFIG.routes.length);
    expect(report.summary.total_routes).toBe(CONFIG.routes.length);
  });

  it('routes 按匹配率降序排列', () => {
    for (let i = 0; i < report.routes.length - 1; i++) {
      expect(report.routes[i].match_rate).toBeGreaterThanOrEqual(report.routes[i + 1].match_rate);
    }
  });

  it('各 verdict 计数之和等于总路由数', () => {
    const s = report.summary;
    const sum = s.strong_match + s.match + s.partial_match + s.no_match;
    expect(sum).toBe(s.total_routes);
  });

  it('best_route 指向排序首位', () => {
    expect(report.summary.best_route).toBe(report.routes[0].route_id);
  });

  it('match_rate 落在 [0,1] 区间', () => {
    for (const r of report.routes) {
      expect(r.match_rate).toBeGreaterThanOrEqual(0);
      expect(r.match_rate).toBeLessThanOrEqual(1);
    }
  });

  it('getMatchReport 返回同一画像', () => {
    const r2 = getMatchReport(strongIT);
    expect(r2.profile).toEqual(strongIT);
  });
});

describe('runEngine 强弱画像对比', () => {
  it('强画像 strong_match 不少于弱画像', () => {
    const strong = runEngine(strongIT).summary;
    const weak = runEngine(weakProfile).summary;
    expect(strong.strong_match).toBeGreaterThanOrEqual(weak.strong_match);
  });

  it('弱画像 no_match 不少于强画像', () => {
    const strong = runEngine(strongIT).summary;
    const weak = runEngine(weakProfile).summary;
    expect(weak.no_match).toBeGreaterThanOrEqual(strong.no_match);
  });
});

describe('runEngine 定点：IT-DEV-A1 后端/全栈路径', () => {
  it('强 IT 画像三条件全满足 → strong_match', () => {
    const report = runEngine(strongIT);
    const dev = report.routes.find((r) => r.route_id === 'IT-DEV-A1');
    expect(dev).toBeDefined();
    expect(dev!.match_rate).toBe(1);
    expect(dev!.verdict).toBe('strong_match');
  });

  it('弱画像三条件皆不满足 → no_match', () => {
    const report = runEngine(weakProfile);
    const dev = report.routes.find((r) => r.route_id === 'IT-DEV-A1');
    expect(dev).toBeDefined();
    expect(dev!.match_rate).toBe(0);
    expect(dev!.verdict).toBe('no_match');
  });
});
describe('runEngine 加权匹配与可解释合成（块2）', () => {
  it('FIELD_WEIGHT 核心字段权重更高（专业对口 > 学校档次）', () => {
    expect(FIELD_WEIGHT.MAJ_CAT).toBeGreaterThan(FIELD_WEIGHT.SCH_TIER);
    expect(FIELD_WEIGHT.INT_QLT).toBeGreaterThan(FIELD_WEIGHT.INT_NUM);
  });

  it('field_details 含 weight/contribution 且贡献和约为 1', () => {
    const report = runEngine(strongIT);
    for (const r of report.routes) {
      expect(r.field_details.length).toBeGreaterThan(0);
      const totalContrib = r.field_details.reduce((s, d) => s + d.contribution, 0);
      expect(Math.abs(totalContrib - 1)).toBeLessThan(0.05);
      for (const d of r.field_details) {
        expect(d.weight).toBeGreaterThan(0);
        expect(d.contribution).toBeGreaterThanOrEqual(0);
        expect(d.contribution).toBeLessThanOrEqual(1);
      }
    }
  });

  it('weighted_explanation 非空且含加权匹配率', () => {
    const report = runEngine(strongIT);
    for (const r of report.routes) {
      expect(r.weighted_explanation).toBeTruthy();
      expect(r.weighted_explanation).toContain('加权匹配率');
    }
  });

  it('命中 MAJ_CAT 的贡献占比最大（IT 强画像三条件全命中）', () => {
    const report = runEngine(strongIT);
    const dev = report.routes.find((r) => r.route_id === 'IT-DEV-A1');
    expect(dev).toBeDefined();
    const maj = dev!.field_details.find((d) => d.field === 'MAJ_CAT');
    const skill = dev!.field_details.find((d) => d.field === 'SKILL_SET');
    expect(maj).toBeDefined();
    expect(skill).toBeDefined();
    expect(maj!.contribution).toBeGreaterThan(skill!.contribution);
  });
});