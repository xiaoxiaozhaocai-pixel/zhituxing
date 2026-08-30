/**
 * 职途星 · 面试复盘 BARS（行为锚定量表）
 *
 * 方法来源：组织行为学成熟方法 BARS（Behaviorally Anchored Rating Scale）。
 * 目的：把「面试反馈的自由打分」升级为「锚定可观察行为的评分」，
 *       并强制输出「解释 + 路径 + 建议」（判断力 ≠ 打分）。
 *
 * 设计：
 *   - 每个维度 5 级（L1 最弱 → L5 最强），每级含：
 *       name   该级的行为特征名称
 *       band   对应 0-100 分数段
 *       anchors 可观察行为锚点（评分者据此判断，而非凭感觉打分）
 *   - 评分流程：列举观察到的具体行为 → 匹配到既定锚点级 → 在该级分数段内给分 → 说明理由 + 提升路径 + 建议
 *
 * 本文件为纯数据 + 纯函数，不依赖运行时，可直接被 tsconfig.engine.json 校验。
 */

export type BarsDimensionId = 'communication' | 'logic' | 'professionalism';

export interface BarsLevel {
  level: number;
  name: string;
  /** 分数段 [min, max] */
  band: [number, number];
  /** 该级别的可观察行为锚点 */
  anchors: string[];
}

export interface BarsDimension {
  id: BarsDimensionId;
  name: string;
  description: string;
  levels: BarsLevel[];
}

/** 面试复盘 BARS 锚点库（沟通力/逻辑力/专业度） */
export const INTERVIEW_BARS: BarsDimension[] = [
  {
    id: 'communication',
    name: '沟通力',
    description: '表达清晰度、条理性、语速节奏、情绪控制与倾听回应。',
    levels: [
      {
        level: 1,
        name: '混乱模糊',
        band: [0, 39],
        anchors: [
          '表述吞吞吐吐、语无伦次，听众难以抓住重点',
          '频繁使用「然后」「那个」等口头禅，缺少起承转合',
          '未回应面试官问题，答非所问，逻辑跳跃',
        ],
      },
      {
        level: 2,
        name: '表层应付',
        band: [40, 59],
        anchors: [
          '能答上问题但内容单薄，多为名词堆砌、无展开',
          '有开头但缺少结构，主线不清，容易跑题',
          '情绪紧张明显，语速过快或过慢，肢体语言僵硬',
        ],
      },
      {
        level: 3,
        name: '条理清楚',
        band: [60, 74],
        anchors: [
          '采用「首先/其次/最后」或 STAR 结构，层次分明',
          '能围绕问题展开，主线清楚，偶有冗余但可控',
          '语速节奏自然，情绪稳定，能与面试官正常互动',
        ],
      },
      {
        level: 4,
        name: '清晰有力',
        band: [75, 89],
        anchors: [
          '结构完整且重点突出，善于用事例支撑观点',
          '能主动复述或确认面试官意图，做到有来有回',
          '表达有感染力，节奏有起伏，情绪从容自信',
        ],
      },
      {
        level: 5,
        name: '稳健主导',
        band: [90, 100],
        anchors: [
          '表达精准简练，每一句都有信息量，无冗余',
          '能驾驭压力追问，临场组织语言，化被动为主动',
          '善于用结构化表达引导对话节奏，让面试官快速理解并产生好感',
        ],
      },
    ],
  },
  {
    id: 'logic',
    name: '逻辑力',
    description: '回答结构（STAR）、论证清晰度、因果关系、思维缜密度。',
    levels: [
      {
        level: 1,
        name: '散乱无章',
        band: [0, 39],
        anchors: [
          '回答无结构，想到哪说到哪，前后矛盾',
          '把事实和观点混为一谈，无因果链条',
          '给出的例子无法支撑结论，或与问题无关',
        ],
      },
      {
        level: 2,
        name: '偶有逻辑',
        band: [40, 59],
        anchors: [
          '能给出结论但缺少论证过程，理由单薄',
          '运用 STAR 但结构缺失（如无明确结果/反思）',
          '因果关系较浅，只能看到表面，缺乏推导',
        ],
      },
      {
        level: 3,
        name: '结构完整',
        band: [60, 74],
        anchors: [
          '能按 STAR 或「结论-论据-总结」组织，结构完整',
          '论证有因果链条，能区分主次，逻辑自洽',
          '遇到追问能顺着证据链继续推导，不轻易跑偏',
        ],
      },
      {
        level: 4,
        name: '论证缜密',
        band: [75, 89],
        anchors: [
          '结论明确，论据层层递进，因果关系清晰',
          '能主动识别潜在的反对观点并提前回应',
          '能提炼规律，把单点案例上升为可迁移的思考',
        ],
      },
      {
        level: 5,
        name: '洞察深刻',
        band: [90, 100],
        anchors: [
          '能构建多层论证框架，逻辑闭环无死角',
          '能对复杂问题做拆解，给出结构化、可验证的推理',
          '能指出表面问题背后的本质，展现出超出同龄人的判断力',
        ],
      },
    ],
  },
  {
    id: 'professionalism',
    name: '专业度',
    description: '行业认知深度、岗位理解准确性、数据支撑、专业术语使用。',
    levels: [
      {
        level: 1,
        name: '基础空白',
        band: [0, 39],
        anchors: [
          '对岗位/行业认知几乎空白，术语使用错误',
          '回答停留在教科书常识，无任何实践或数据支撑',
          '无法说出目标岗位的核心职责或关键能力要求',
        ],
      },
      {
        level: 2,
        name: '略有了解',
        band: [40, 59],
        anchors: [
          '了解岗位名称和基础职责，但认知浮于表面',
          '能提及个别术语，但无法解释其实际应用',
          '缺少具体案例、数据或行业现状支撑',
        ],
      },
      {
        level: 3,
        name: '基本掌握',
        band: [60, 74],
        anchors: [
          '对岗位核心能力和行业趋势有基本准确认知',
          '能用专业术语正确表达，并给出实践案例',
          '能结合自身经历说明与岗位的契合点',
        ],
      },
      {
        level: 4,
        name: '行业行家',
        band: [75, 89],
        anchors: [
          '对行业格局、头部公司与岗位价值有深入理解',
          '能引用具体数据或真实经历支撑观点，专业且可信',
          '能分析岗位的发展路径与所需能力进阶',
        ],
      },
      {
        level: 5,
        name: '深耕洞察',
        band: [90, 100],
        anchors: [
          '对行业前沿、竞争格局与人才需求有超前判断',
          '能把专业问题讲得深入浅出，体现真正的专业积累',
          '能给出有洞察力的行业/岗位判断，而非背诵知识点',
        ],
      },
    ],
  },
];

/** 找某个维度的 BARS 定义 */
export function getBarsDimension(id: BarsDimensionId): BarsDimension | undefined {
  return INTERVIEW_BARS.find((d) => d.id === id);
}

/** 根据分数反查命中锚点级（便于前端展示该分数对应的行为等级） */
export function scoreToBarsLevel(
  id: BarsDimensionId,
  score: number,
): BarsLevel | undefined {
  const dim = getBarsDimension(id);
  if (!dim) return undefined;
  return dim.levels.find((l) => score >= l.band[0] && score <= l.band[1]);
}

/**
 * 把 BARS 锚点库渲染成给 LLM 的提示词片段。
 * 评分者须先「列举观察到的具体行为」，再「匹配到锚点级」，再给分。
 */
export function buildBarsPrompt(): string {
  const lines: string[] = [];
  lines.push('【行为锚定量表 BARS 评分要求】');
  lines.push('不要凭感觉打分。请按以下行为锚点，逐维度进行「行为锚定评分」：');
  lines.push('步骤：① 从面试对话中列举该维度最关键的 2-3 个可观察行为；② 把这些行为匹配到下方最贴切的锚点级；③ 在该级的分数段内给分；④ 说明为什么是这个级（引用你列举的行为）；⑤ 给出提升到下一级的路径与具体建议。');
  lines.push('');
  for (const dim of INTERVIEW_BARS) {
    lines.push(`【${dim.name}（${dim.description}）】`);
    for (const lv of dim.levels) {
      lines.push(`  L${lv.level} ${lv.name}（${lv.band[0]}-${lv.band[1]}分）：`);
      for (const a of lv.anchors) {
        lines.push(`    - ${a}`);
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}
