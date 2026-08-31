/**
 * 行业地图 · 数据层（真实面经驱动）
 *
 * 数据来源：面经库 5 场真实面经（东恒/长青/作业帮/高途/腾讯腾佳），
 *           均为「七节模板 + 台账」归档，字段可从面经文件逐一背调。
 *
 * 守四真：只记录面经中真实出现的公司/岗位/问题/结果/评分。
 *         不足以支撑的视图（如通过趋势、Top10 高频问题）以 note 声明「待数据积累」，
 *         绝不编造。样本目前为 5 场（1 家 1 场），地图气泡为点数级，属 MVP 初始原型。
 */
import type { CompanyCard, PositionAggregate, ProvinceCluster, PassStatus, PassTrend, IndustryMapPayload } from './types';

/* ============================================================
 * ① 公司卡片（5 家真实面经）
 * ============================================================ */

const COMPANIES: CompanyCard[] = [
  {
    id: 'dongheng',
    name: '东恒新能源',
    fullName: '福建东恒新能源集团有限公司',
    industry: '新能源 / 锂电（动力电池结构件）',
    province: '福建省',
    city: '宁德',
    coords: [119.55, 26.66],
    interviewCount: 1,
    analysisLevel: 2,
    positions: ['人事专员'],
    hotQuestions: [
      '怎么用扣子搭建招聘全流程？',
      '员工考勤周报怎么标准化产出？',
      '简历自动化筛选是否可行？',
    ],
    passRateLabel: '对方满意 · 用户暂不入职（情报场）',
    passStatus: 'pending',
    tags: ['制造业HR', 'AI落地', '懂AI的HR', '宁德时代供应商'],
    resultSummary: '从「被面试」打成「被请教」，验证制造业 HR 的 AI 落地痛点。',
    source: '面经库/面经_东恒新能源_20260817.md',
    interviewIds: ['dg-20260817'],
  },
  {
    id: 'evergreen',
    name: '长青集团',
    fullName: '广东长青（集团）股份有限公司（002616.SZ）',
    industry: '环保能源 / 燃气具 / 阀门制造',
    province: '广东省',
    city: '中山',
    coords: [113.39, 22.52],
    interviewCount: 1,
    analysisLevel: 3,
    positions: ['人事文员'],
    hotQuestions: [
      '北森系统问题的根因（系统 vs 管理）？',
      'HR 是成本中心，老板不愿投 AI 你怎么看？',
      '你是想做 AI 工程师，还是懂 AI 的 HR？',
      '甲乙方视角有哪些差异？',
    ],
    passRateLabel: '面试已完成 · 待反馈',
    passStatus: 'pending',
    tags: ['A股上市', '传统制造业HR', '重管理流程', '中山'],
    resultSummary: '50 分钟深聊证明能力被看见，但三个深题暴露「技术脑快于管理脑」。',
    source: '面经库/面经_长青集团_20260817.md',
    interviewIds: ['eg-20260817'],
  },
  {
    id: 'zuoyebang',
    name: '作业帮',
    fullName: '作业帮（K12 在线教育 / 学习工具，总部北京）',
    industry: '在线教育 / 互联网',
    province: '北京市',
    city: '北京',
    coords: [116.4, 39.9],
    interviewCount: 1,
    analysisLevel: 2,
    positions: ['产研·校招招聘（算法 / 教研）', '面试邀约'],
    hotQuestions: [
      '招聘自动化现状如何？',
      '到底干不干 HR？（职业拷问）',
      '招聘漏斗如何优化？',
      '为何校招方向却无转正？',
    ],
    passRateLabel: '面试官满意 · 获下一轮 · 无转正',
    passStatus: 'pass',
    tags: ['K12在线教育', '招聘自动化', '面试邀约', '数据分析'],
    resultSummary: '拿到下一轮的同时，面试官给了一课——HR 靠本职，AI/数据分析是本职之上的增值。',
    source: '面经库/面经_作业帮_20260825.md',
    interviewIds: ['zyb-20260825'],
  },
  {
    id: 'gaotu',
    name: '高途',
    fullName: '高途（NYSE：GOTU，原跟谁学，总部北京）',
    industry: '在线教育 / 教培',
    province: '北京市',
    city: '北京',
    coords: [116.4, 39.9],
    interviewCount: 1,
    analysisLevel: 2,
    positions: ['HR / 招聘方向（对方主招运营 / 销售）'],
    hotQuestions: [
      '锂电行业离职率高，HR 怎么分层归因？',
      '职途星（AI 求职平台）是你自己做的？',
      '人力资源专业是自己选还是调剂？',
      '为什么不投北京互联网大厂？',
    ],
    passRateLabel: '简历不匹配 · 婉拒（机会不存在）',
    passStatus: 'mismatch',
    tags: ['教培', '简历不匹配', '行业+岗位双维错位', '北京实习行情'],
    resultSummary: '优秀 ≠ 匹配——是行业（教培 vs 新能源）+ 岗位（运营销售 vs 算法研发）双维错位，非话术问题。',
    source: '面经库/面经_高途_20260826.md',
    interviewIds: ['gg-20260826'],
  },
  {
    id: 'tengjia',
    name: '腾讯（腾佳）',
    fullName: '深圳市腾佳管理咨询有限公司（腾讯集团全资子公司）',
    industry: '互联网（招聘 / 猎头 / RPO）',
    province: '广东省',
    city: '深圳',
    coords: [114.06, 22.54],
    interviewCount: 1,
    analysisLevel: 2,
    positions: ['AI明星产品高端人才招聘（群面 / 无领导小组）'],
    hotQuestions: [
      'AI 明星产品高端人才招聘存在问题，如何排序与给出方案？',
    ],
    passRateLabel: '结果未明确 · 自评表现一般',
    passStatus: 'na',
    tags: ['腾讯系', '猎头/RPO', 'AI高端人才', '深圳南山'],
    resultSummary: '群面更像「行业探针」——确认腾讯把招聘放进腾佳子公司，AI 高端人才是核心痛点。',
    source: '面经库/面经_腾讯腾佳_20260824.md',
    interviewIds: ['tj-20260824'],
  },
];

/* ============================================================
 * ② 答题水平分布（来自面经「复盘自评评分」，聚合桶，不落到个体）
 *    仅对评分真实存在的场次聚合；样本不足则空 + note 说明。
 * ============================================================ */

const SCORE_BUCKETS: Record<string, Record<string, number[]>> = {
  dongheng: { '人事专员': [4, 4, 3] },
  evergreen: { '人事文员': [4, 4, 2, 3, 3.5, 4, 3] },
  gaotu: { 'HR / 招聘方向': [5, 4, 5, 5, 4, 4, 4] },
  tengjia: { 'AI明星产品高端人才招聘': [2, 2] },
  // 作业帮：当场未保存转写，问答评分未记录 → 不参与分布
};

function bucketize(scores: number[]): { label: '表现强' | '中等' | '待打磨'; count: number }[] {
  const strong = scores.filter((s) => s >= 4).length;
  const mid = scores.filter((s) => s >= 3 && s < 4).length;
  const weak = scores.filter((s) => s < 3).length;
  const out: { label: '表现强' | '中等' | '待打磨'; count: number }[] = [];
  if (strong) out.push({ label: '表现强', count: strong });
  if (mid) out.push({ label: '中等', count: mid });
  if (weak) out.push({ label: '待打磨', count: weak });
  return out;
}

/* ============================================================
 * ③ 岗位面经聚合（脱敏）
 * ============================================================ */

function buildPositions(): PositionAggregate[] {
  const list: PositionAggregate[] = [];
  for (const c of COMPANIES) {
    for (const pos of c.positions) {
      const scores = SCORE_BUCKETS[c.id]?.[pos] || [];
      const dist = bucketize(scores);
      list.push({
        companyId: c.id,
        position: pos,
        interviewCount: c.interviewCount,
        questions: c.hotQuestions,
        answerLevelDistribution: dist,
        passTrend: 'na',
        note:
          c.id === 'zuoyebang'
            ? '该场次未保存转写，问答评分未记录，答题水平分布暂无法统计。'
            : dist.length === 0
              ? '该岗位样本仅 1 场，答题水平分布样本不足，待数据积累。'
              : '答题水平分布基于面经「复盘自评评分」聚合，样本为单场，仅供参考，待数据积累。',
      });
    }
  }
  return list;
}

/* ============================================================
 * ④ 省份聚合（地图气泡量级）
 * ============================================================ */

function buildProvinces(): ProvinceCluster[] {
  const map = new Map<string, ProvinceCluster>();
  for (const c of COMPANIES) {
    const existing = map.get(c.province);
    if (existing) {
      existing.count += 1;
      existing.companies.push(c.id);
    } else {
      map.set(c.province, {
        province: c.province,
        type: 'province',
        count: 1,
        companies: [c.id],
        centroid: c.coords,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

/* ============================================================
 * 导出聚合数据包
 * ============================================================ */

export const INDUSTRY_MAP: IndustryMapPayload = {
  companies: COMPANIES,
  positions: buildPositions(),
  provinces: buildProvinces(),
  meta: {
    totalInterviews: COMPANIES.reduce((s, c) => s + c.interviewCount, 0),
    totalCompanies: COMPANIES.length,
    sampleNote:
      '当前为行业地图 MVP 初始原型，样本为 5 场真实面经（每家公司 1 场）。' +
      '高频问题、答题水平分布等仅基于单场记录，尚未形成 Top10 排名与通过趋势；' +
      '相关视图将真实标注为「待数据积累」，可持续扩展。',
    lastUpdated: '2026-08-31',
  },
};
