/**
 * 行业地图 · 类型定义
 *
 * 数据来源：面经库 5 场真实面经（东恒/长青/作业帮/高途/腾讯腾佳），已作七节归档。
 * 守四真：真实发生、真实负责、真实可背调、不编造。
 * 合规红线：只展示聚合 + 脱敏信息（岗位/公司/高频问题/答题水平分布/通过趋势/宽泛标签），
 *           绝不显示个体姓名、完整回答原文或可反推身份的细节。
 */

/** 洞察成熟度（分析程度），语义化而非裸分数 */
export type AnalysisLevel = 1 | 2 | 3 | 4;

/** 某一场次的结果语义化归类 */
export type PassStatus =
  | 'pass' // 通过 / 获下一轮
  | 'pending' // 待反馈
  | 'mismatch' // 简历不匹配（机会不存在，非落榜）
  | 'na'; // 未明确 / 无明确结果

/** 通过趋势：单样本无趋势，一律 'na'（守四真，不编趋势） */
export type PassTrend = 'up' | 'flat' | 'down' | 'na';

/** 公司卡片（脱敏后对外展示） */
export interface CompanyCard {
  id: string;
  /** 展示简称 */
  name: string;
  /** 完整名称（公开可查） */
  fullName: string;
  /** 行业大类 */
  industry: string;
  /** 省份（与 china-provinces.json 的 name 对齐） */
  province: string;
  /** 城市 */
  city: string;
  /** 城市中心坐标 [lng, lat] */
  coords: [number, number];
  /** 面经数（真实归档场次） */
  interviewCount: number;
  /** 分析程度（语义化） */
  analysisLevel: AnalysisLevel;
  /** 岗位（来自真实面经） */
  positions: string[];
  /** 高频问题（来自真实问答实录，非编造） */
  hotQuestions: string[];
  /** 通过率说明（真实） */
  passRateLabel: string;
  /** 结果语义化 */
  passStatus: PassStatus;
  /** 宽泛标签（非个体） */
  tags: string[];
  /** 结果一句话（来自面经） */
  resultSummary: string;
  /** 数据来源（可背调） */
  source: string;
  /** 关联的场次 id */
  interviewIds: string[];
}

/** 答题水平分布桶（来自面经「复盘自评评分」，仅聚合，不落到个体） */
export interface AnswerBucket {
  label: '表现强' | '中等' | '待打磨';
  count: number;
}

/** 岗位 · 面经聚合（脱敏） */
export interface PositionAggregate {
  companyId: string;
  position: string;
  interviewCount: number;
  /** 该岗位高频问题（真实纪录） */
  questions: string[];
  /** 答题水平分布（自评评分聚合；样本不足时为空 + note 说明） */
  answerLevelDistribution: AnswerBucket[];
  /** 通过趋势（单样本一律 na） */
  passTrend: PassTrend;
  /** 数据完整度说明（守四真：不足以支撑某视图时如实说明） */
  note: string;
}

/** 省份聚合（地图气泡按量级渲染） */
export interface ProvinceCluster {
  province: string;
  type: 'province';
  count: number;
  companies: string[]; // company ids
  centroid: [number, number]; // [lng, lat]
}

/** 行业地图聚合数据包 */
export interface IndustryMapPayload {
  companies: CompanyCard[];
  positions: PositionAggregate[];
  provinces: ProvinceCluster[];
  /** 数据完整度声明（前端可展示给用户） */
  meta: {
    totalInterviews: number;
    totalCompanies: number;
    sampleNote: string;
    lastUpdated: string;
  };
}
