// 职途星能力翻译 + 叙事权重引擎 · A3
// 核心命题：学生口语经历 ↔ 企业 JD 语言 之间隔着「能力翻译」鸿沟。
// 本引擎做「把经历翻译成企业看得懂的表述 + 按岗位权重分配叙事优先级」。
// 判断力 ≠ 打分：给出翻译建议 + 该重点放在哪 + 为什么。
//
// 用法：analyzeNarrative(experience, targetJob?) → NarrativeReport
//
// 三层能力结构（来自能力翻译词典）：
//   行业知识(30%)：该行业术语/流程/产品形态
//   硬技能(40%)：岗位独有工具/方法论/证书
//   软技能(30%)：问题解决/沟通/数据驱动等跨岗位底层能力
//
// 叙事权重 = 这段经历在目标岗位眼里「值多少分」+「该不该重点写」

export type SkillLayer = 'industry' | 'hard' | 'soft';

export interface LayerScore {
  layer: SkillLayer;
  label: string;
  /** 0-100 当前体现程度 */
  score: number;
  /** 岗位权重 */
  weight: number;
  /** 命中信号列表 */
  signals: string[];
  /** 缺口提示 */
  gap: string;
}

export interface TranslationSuggestion {
  /** 原始口语描述 */
  original: string;
  /** 企业 JD 语言改写版本 */
  translated: string;
  /** 改写依据（翻译公式三段） */
  rationale: string;
}

export interface NarrativeReport {
  input: string;
  targetJob?: string;
  /** 突出项——最有价值、应重点写的经历侧重点 */
  emphasis: {
    /** 0-100 这段经历对目标岗位的整体价值 */
    value: number;
    /** 高价值侧重点描述 */
    focus: string;
    /** 建议在简历里排第几段/是否重点 */
    placement: string;
  };
  layers: LayerScore[];
  translations: TranslationSuggestion[];
  summary: string;
}

// ============================================================
// 能力翻译词典核心数据（Heuristic，纯本地词库）
// 扩展策略：岗位属行业不同 → 换术语词库；底层能力通用。
// ============================================================

/** 通用底层能力信号（软技能，跨行业阈值最高） */
const SOFT_SIGNALS: Record<string, string> = {
  沟通: '跨部门沟通与协作',
  协调: '跨部门/多方协调推进',
  数据: '基于数据分析做决策',
  分析: '问题分析与归因',
  解决: '问题闭环解决能力',
  文档: '方案/文档撰写表达',
  汇报: '向上/对外汇报表达',
  复盘: '项目复盘与经验沉淀',
  抗压: '多任务并行与抗压',
  学习: '快速学习与迁移',
};

/** 常见硬技能信号（岗位独有工具/方法） */
const HARD_SIGNALS: Record<string, string> = {
  Excel: 'Excel 数据处理',
  SQL: 'SQL 数据查询',
  Python: 'Python 数据处理',
  R: 'R 统计分析',
  BI: 'BI 看板制作',
  PRD: 'PRD 需求文档',
  Axure: 'Axure 原型设计',
  Photoshop: 'Photoshop 设计',
  CAD: 'CAD 制图',
  SolidWorks: 'SolidWorks 建模',
  MATLAB: 'MATLAB 建模分析',
  SPC: 'SPC 统计过程控制',
  DOE: 'DOE 实验设计',
  '8D': '8D 问题解决法',
  PFMEA: 'PFMEA 失效分析',
  SEO: 'SEO 优化',
  Hrbp: 'HRBP 业务伙伴',
  招聘: '招聘全流程',
  面试: '面试评估',
  HRIS: 'HRIS 系统',
  ATS: 'ATS 招聘系统',
};

/** 行业知识信号（随行业变化） */
const INDUSTRY_SIGNALS: Record<string, string> = {
  供应链: '供应链流程认知',
  生产: '生产/制造流程认知',
  质检: '质检/质量流程认知',
  客户: '客户/客服流程认知',
  市场: '市场营销流程认知',
  合规: '合规/风控流程认知',
  数据: '数据/业务分析流程认知',
};

const TRANSLATION_TEMPLATE = {
  weak: '做了X，但没体现方法/结果，需补「做了什么事+用了什么方法+结果影响」',
  mid: '有方法论，但缺结果影响，补一个可核算的结果',
  strong: '方法+结果都有，表达已经很企业化，可直接用',
};

/**
 * 从一段经历文本中提取某层能力信号
 */
function extractSignals(text: string, dict: Record<string, string>): string[] {
  const found: string[] = [];
  for (const [key, label] of Object.entries(dict)) {
    // 大小写不敏感匹配
    if (text.toLowerCase().includes(key.toLowerCase())) {
      found.push(label);
    }
  }
  return found;
}

/**
 * 判断一段经历的「信号深度」：弱/中/强
 * 依据：是否同时具备 方法+结果（企业面试语言三段式）
 */
function signalDepth(text: string): 'weak' | 'mid' | 'strong' {
  const hasMethod = /用|通过|基于|借助|采用|做了|实现|完成|负责|主导|运用|DOE|8D|SPC|SQL|分析|优化|搭建|推动|把关|管理/.test(text);
  const hasResult = /率|量|额|个|倍|次|元|人|%|提升|下降|降低|节省|增长|达成|入职|入选|中标|上线|从.{0,6}(到|降|升)/.test(text);
  const hasQuant = /[0-9]+/.test(text);
  if (hasMethod && hasResult && hasQuant) return 'strong';
  if (hasMethod || hasResult) return 'mid';
  return 'weak';
}

/**
 * 能力翻译：把口语经历改写成企业 JD 语言
 * 公式：[做了什么事] + [用了什么方法/工具] + [结果是什么/影响是什么]
 * 铁律：不编造数据。没有量化结果就写过程与方法。
 */
function translateExperience(original: string): TranslationSuggestion {
  const depth = signalDepth(original);
  let translated = original.trim();
  let rationale = '';

  if (depth === 'strong') {
    // 已经有方法+结果，只做表达规范化
    translated = original
      .replace(/我/g, '')
      .replace(/^参与/gi, '参与')
      .replace(/协助/gi, '参与')
      .trim();
    rationale = TRANSLATION_TEMPLATE.strong;
  } else if (depth === 'mid') {
    // 有方法或结果之一，补全缺失要素的提示
    const hasMethod = /用|通过|基于|借助|采用|做了|实现|完成|负责|主导|运用|分析|优化|搭建|推动/.test(original);
    if (!hasMethod) {
      rationale = '已有结果，但缺「用了什么方法/工具」。补上方法论让表达更可信：例如「用DOE/SPC/数据分析」把模糊动作变成可核验的专业动作。';
    } else {
      rationale = '已有方法，但缺「结果是什么/影响是什么」。补一个可核算的结果：例如「不良率降至2%」「响应时间缩短30%」。没有真实数字就删掉结果句，避免编造。';
    }
    // 给一个规范化改写框架（只重组结构，不编数据）
    translated = original.replace(/参与|协助/g, '独立负责').replace(/^我/g, '');
  } else {
    rationale = '这是「弱信号」——能说清做了什么事，但没体现方法论和结果，企业眼里值不了高分。改写方向：把「协助处理异常」→「参与产线异常根因分析，用DOE验证XX对Y的影响，不良率下降X%」。先补真实方法，再补真实结果。';
    // 把「参与/协助 + 主体」改成更明确的第一人称动作，避免「参与了工程师」这种不通顺
    translated = original
      .replace(/协助[\u4e00-\u9fa5A-Za-z]+处理|参与[\u4e00-\u9fa5A-Za-z]+处理/g, '参与处理')
      .replace(/我(参与了|协助了|参与了)/g, '协助')
      .replace(/^我/g, '')
      .trim();
  }

  return { original: original.trim(), translated, rationale };
}

/**
 * A3 主入口：能力翻译 + 叙事权重分析
 */
export function analyzeNarrative(experience: string, targetJob?: string): NarrativeReport {
  const input = (experience || '').trim();
  if (!input) {
    return {
      input,
      targetJob,
      emphasis: { value: 0, focus: '', placement: '' },
      layers: [],
      translations: [],
      summary: '未提供经历描述，无法分析。',
    };
  }

  const softSignals = extractSignals(input, SOFT_SIGNALS);
  const hardSignals = extractSignals(input, HARD_SIGNALS);
  const industrySignals = extractSignals(input, INDUSTRY_SIGNALS);

  const depth = signalDepth(input);

  // 用工厂构造各层得分
  const makeLayer = (layer: SkillLayer, label: string, signals: string[], weight: number, gapDefault: string, base: number) => {
    const count = signals.length;
    const depthBonus = depth === 'strong' ? 20 : depth === 'mid' ? 10 : 0;
    const score = Math.min(100, base + count * 10 + depthBonus);
    return { layer, label, score, weight, signals, gap: count === 0 ? gapDefault : '' } as LayerScore;
  };

  const layers: LayerScore[] = [
    makeLayer('industry', '行业知识', industrySignals, 30, '没有体现该行业术语/流程，企业会觉得你「不懂行」。例：锂电工艺要说「电芯/化成/涂布」，HRTech要说「ATS/招聘漏斗」。', 45),
    makeLayer('hard', '硬技能', hardSignals, 40, '没有体现岗位独有工具/方法论。例：工艺工程师要有 DOE/8D/SPC；产品经理要有 PRD/Axure/SQL。', 40),
    makeLayer('soft', '软技能', softSignals, 30, '没有体现底层能力（数据/沟通/问题解决）。这是跨行业通用，最容易被忽视但权重稳定。', 50),
  ];

  // 叙事权重：整段经历对目标岗位的价值（0-100）
  const weightedValue = Math.round(
    layers.reduce((acc, l) => acc + (l.score * l.weight) / 100, 0),
  );
  const value = Math.min(100, weightedValue);

  // 高价值侧重点：按「权重×得分」综合价值排序（权重=岗位看重度，得分=当前体现程度）
  const valuePerLayer = layers.map((l) => ({
    layer: l,
    value: (l.weight / 100) * l.score,
  }));
  valuePerLayer.sort((a, b) => b.value - a.value);
  const topV = valuePerLayer[0];
  const topLayer = topV?.layer;

  const focus = topLayer && topLayer.signals.length > 0
    ? `这段经历最该突出的是「${topLayer.label}」：${topLayer.signals.slice(0, 3).join('、')}。企业最看重这层（权重 ${topLayer.weight}%），而你已体现 ${topLayer.score}/100，是这段经历的价值主峰。`
    : depth === 'strong'
      ? '这段经历方法+结果都到位，是企业最爱看的「强信号」，建议作为简历重点段落。'
      : '这段经历目前偏弱，需要补「方法+结果」，尤其是目标岗位权重最高的硬技能（40%）层。';

  const placement = value >= 70
    ? '高价值，放简历前 1-2 段，作为主推经历'
    : value >= 50
      ? '中等价值，放中段，配合有量化的经历使用'
      : '低价值，建议放后段或改写成强信号后再放前面';

  const translation = translateExperience(input);

  return {
    input,
    targetJob,
    emphasis: { value, focus, placement },
    layers,
    translations: [translation],
    summary: `这段经历${
      targetJob ? `面向「${targetJob}」` : ''
    }叙事价值约 ${value}/100。${focus}`,
  };
}
