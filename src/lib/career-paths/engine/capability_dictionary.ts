// 职途星能力翻译词典引擎
// 把学生经历翻译成企业语言 + 量化与目标岗位的差距 + 给出补课路径。
// 判断力 ≠ 打分：输出「解释 + 路径 + 建议」，不输出单一分数，守四真（不编造）。
//
// 与 A3 narrative.ts（单段经历翻译+叙事权重）、B3 career_path_planner.ts（纵向下一步）互补：
//   本引擎做「横向岗位对标 + 差距诊断」——给出目标岗位 L1-L4 能力要求，对照学生经历输出已有/差距/补课。
//
// 用法：analyzeCapabilityGap({ targetJob?, experience? }) → CapabilityReport
//
// 数据来源：能力翻译词典_锂电完整版.md / 能力翻译词典_框架草案.md，转写为 TS 常量，不新编造。

export type CapLayer = 'industry' | 'hard' | 'soft' | 'signal';

export interface CapabilityLayer {
  layer: CapLayer;
  label: string;
  weight: number;
  /** 该层核心要求列表 */
  items: string[];
}

export interface GapAdvice {
  skill: string;
  layerLabel: string;
  /** 缺什么 */
  gap: string;
  /** 补课路径 + 周期 */
  path: string;
}

export interface CapabilityReport {
  matchedJob: string;
  matchedCategory: string;
  /** 是否命中内置词典（false = 通用兜底框架，该岗位词典待扩充） */
  known: boolean;
  layers: CapabilityLayer[];
  /** 已有优势（学生经历已覆盖的要求） */
  advantages: string[];
  /** 关键差距 + 补课路径 */
  gaps: GapAdvice[];
  /** 推荐投递 */
  recommendations: string[];
  summary: string;
}

interface JobEntry {
  id: string;
  name: string;
  category: string;
  aliases: string[];
  layers: CapabilityLayer[];
  recommendCompanies: string[];
  /// skill → 补课路径
  studyPaths: Record<string, string>;
}

// ============================================================
// 薪资/术语不设新值；词典内容从既有 md 转写。
// ============================================================

const JOBS: JobEntry[] = [
  {
    id: 'lithium_process_engineer',
    name: '工艺工程师',
    category: '锂电/新能源',
    aliases: ['工艺', '工艺工程师', '制程工程师', '工艺技术', '锂电工艺'],
    layers: [
      {
        layer: 'industry', label: '行业知识', weight: 20,
        items: [
          '锂电产品形态（软包/圆柱/方形/刀片）',
          '电芯制造全流程（匀浆→涂布→辊压→分切→卷绕/叠片→焊接→封装→化成→分容）',
          '关键术语（面密度/压实密度/对齐度/K值/OCV/SEI膜/A品率/CPK/NMP）',
        ],
      },
      {
        layer: 'hard', label: '硬技能', weight: 40,
        items: [
          'DOE 实验设计（全因子/响应曲面）',
          '8D 报告（根因分析/永久纠正）',
          'SPC 控制（CPK≥1.67/GRR<10%/判异准则）',
          'PFMEA / CP / SOP 编写',
          'Minitab / JMP 数据分析',
          'MES 系统工艺参数采集',
        ],
      },
      {
        layer: 'soft', label: '软技能', weight: 25,
        items: [
          '问题解决（定位根因→方案验证→效果量化）',
          '数据驱动（用数据说话，不是"感觉"）',
          '跨部门沟通（产线/设备/品质/研发协调）',
          '抗压（高产节奏+倒班适应）',
        ],
      },
      {
        layer: 'signal', label: '经验信号', weight: 15,
        items: [
          '独立主导改善项目，有量化结果（良率X%→Y%）',
          '编写 SOP/CP/PFMEA（有方法论迭代痕迹）',
          'DOE 掌握到能说全因子/部分因子/响应曲面',
        ],
      },
    ],
    recommendCompanies: ['冠宇电池', 'ATL', '珠海鹏辉', '亿纬锂能', '比亚迪（弗迪）'],
    studyPaths: {
      'DOE': '学 Minitab + 做一个 DOE 案例（约1周）',
      '8D': '看3个 8D 案例 + 写一个模拟 8D 报告（约3天）',
      'SPC': '做 Xbar-R 控制图 + 掌握判异准则（约2天）',
      'PFMEA': '主导一次 PFMEA 会议，会 RPN 评分（约1周）',
      'Minitab': '学假设检验/方差分析，输出一个分析报告（约2周）',
    },
  },
  {
    id: 'lithium_equipment_engineer',
    name: '设备工程师',
    category: '锂电/新能源',
    aliases: ['设备', '设备工程师', '设备技术', '设备维护', '锂电设备'],
    layers: [
      {
        layer: 'industry', label: '行业知识', weight: 20,
        items: [
          '前段设备（涂布机/辊压机/分切机/激光模切机）',
          '中段设备（卷绕机/叠片机/激光焊接机/注液机/封装机）',
          '后段设备（化成柜/分容柜/OCV测试机/K值测试机）',
          '关键参数（张力/对齐度/焊接良率/注液精度/温度均匀性）',
        ],
      },
      {
        layer: 'hard', label: '硬技能', weight: 40,
        items: [
          'PLC 编程（西门子/三菱/欧姆龙，能独立改程序调试）',
          '设备调试 FAT/qualify/量产全流程',
          'OEE 综合效率改善',
          '异常排查（报警→台账→根因→整改）',
          '通讯协议（EtherCAT/Profinet/Modbus）',
          'CCD 视觉 / 机器人编程',
        ],
      },
      {
        layer: 'soft', label: '软技能', weight: 25,
        items: [
          '动手能力（能拆能装，不只是看屏幕）',
          '预防思维（保养计划/备件管理/故障预防）',
          '维修 vs 设备工程师思维（改设备/预防/降本）',
          '跨部门联动（懂工艺联动，知道调设备影响哪些参数）',
        ],
      },
      {
        layer: 'signal', label: '经验信号', weight: 15,
        items: [
          '独立负责产线设备导入/改造/OEE 提升（有量化）',
          'PLC 编程 + 设备维护 + 异常处理',
          '降本案例（备件平替/效率提升，带量化数据）',
        ],
      },
    ],
    recommendCompanies: ['冠宇电池', 'ATL', '孚能科技', '亿纬锂能', '中创新航'],
    studyPaths: {
      'PLC': '学西门子 S7 基础 + 做一个自动控制案例（约2周）',
      'OEE': '学会算 OEE + 做一个系统性改善案例（约1周）',
      '通讯协议': '学 EtherCAT/Profinet 基础并动手接线调试（约1周）',
      'CCD': '了解基恩士/海康视觉基础（约3天）',
    },
  },
  {
    id: 'hrtech_product',
    name: '产品经理',
    category: 'HRTech/互联网',
    aliases: ['产品', '产品经理', '产品岗', 'HR产品', 'HRTech产品'],
    layers: [
      {
        layer: 'industry', label: '行业知识', weight: 20,
        items: [
          'HR SaaS 产品格局（北森/Moka/飞书招聘/DarwinBox）',
          'HR 业务场景（招聘/绩效/薪酬/组织/人才盘点）',
          'AI 在 HR 场景的应用（简历解析/智能匹配/聊天机器人）',
        ],
      },
      {
        layer: 'hard', label: '硬技能', weight: 40,
        items: [
          '产品设计（PRD/原型/Figma/Axure）',
          '需求分析（用户调研/痛点挖掘/优先级排序）',
          '数据分析（SQL/埋点/AARRR 漏斗）',
          'AI 产品/大模型应用理解',
        ],
      },
      {
        layer: 'soft', label: '软技能', weight: 25,
        items: [
          '业务理解力（能跟 HRBP 同频对话）',
          '跨部门推动（产研/业务/销售协调）',
          '用户同理心（用户访谈/可用性测试）',
        ],
      },
      {
        layer: 'signal', label: '经验信号', weight: 15,
        items: [
          '从0到1 产品落地经验',
          '数据驱动的产品迭代案例',
          'HRTech 领域实习/项目经验',
        ],
      },
    ],
    recommendCompanies: ['北森', 'Moka', '飞书招聘', '薪事力', '众安（AI+HR）'],
    studyPaths: {
      'PRD': '学 Axure/Figma 两周速通 + 产出 1 份 PRD（约2周）',
      '需求分析': '拆 3 个 HR SaaS 产品的功能链路（约1周）',
      '数据分析': '学 SQL 基础 + 做一次 AARRR 漏斗分析（约2周）',
      'AI产品': '用自然语言描述 AI 功能边界，读 2 篇大模型应用案例（约1周）',
    },
  },
];

const EMPTY_LAYER_ITEMS: CapabilityLayer[] = [
  { layer: 'industry', label: '行业知识', weight: 20, items: ['该行业的基础术语/流程/产品形态'] },
  { layer: 'hard', label: '硬技能', weight: 40, items: ['该岗位独有的工具/方法论/证书'] },
  { layer: 'soft', label: '软技能', weight: 25, items: ['问题解决/沟通/数据驱动等底层能力'] },
  { layer: 'signal', label: '经验信号', weight: 15, items: ['独立/主导/量化/方法论 的经验信号'] },
];

/** 从岗位名/文本匹配 JobEntry，支持别名模糊匹配 */
function matchJob(target: string): JobEntry | undefined {
  const t = (target || '').toLowerCase().trim();
  if (!t) return undefined;
  for (const job of JOBS) {
    if (job.name.toLowerCase() === t) return job;
    if (job.aliases.some((a) => a.toLowerCase() === t)) return job;
    if (job.name.toLowerCase().includes(t) || t.includes(job.name.toLowerCase())) return job;
  }
  // 别名部分包含
  for (const job of JOBS) {
    if (job.aliases.some((a) => t.includes(a.toLowerCase()) || a.toLowerCase().includes(t))) return job;
  }
  return undefined;
}

/** 从经历文本里提取「已覆盖的要求」——用信号关键词匹配 */
function extractCovered(experience: string, layers: CapabilityLayer[]): string[] {
  if (!experience) return [];
  const exp = experience.toLowerCase();
  const covered: string[] = [];
  for (const layer of layers) {
    for (const item of layer.items) {
      // 拆成短语片段，任一命中即视为提到该要求
      const fragmentMatches = item.match(/[\u4e00-\u9fa5A-Za-z]{2,8}/g) || [];
      const hit = fragmentMatches.some((frag) => frag.length >= 2 && exp.includes(frag.toLowerCase()));
      if (hit) {
        covered.push(`${layer.label}｜${item}`);
      }
    }
  }
  return covered;
}

/** 主入口：能力翻译词典差距诊断 */
export function analyzeCapabilityGap(input: {
  targetJob?: string;
  experience?: string;
}): CapabilityReport {
  const job = matchJob(input.targetJob || '');
  const jobName = job?.name || input.targetJob || '';
  const category = job?.category || '';

  if (!job) {
    // 通用兜底框架：提示该岗位词典待扩充，但给出 L1-L4 通用结构
    const covered = extractCovered(input.experience || '', EMPTY_LAYER_ITEMS);
    return {
      matchedJob: jobName,
      matchedCategory: category,
      known: false,
      layers: EMPTY_LAYER_ITEMS,
      advantages: covered,
      gaps: [],
      recommendations: [],
      summary: `「${jobName || '这个岗位'}」的能力词典还没细化到行业级。先用通用四层框架帮你对照：你提到的经历覆盖了 ${covered.length} 处要求。想要更准的行业级拆解，告诉我具体行业和岗位（如：锂电工艺工程师 / HRTech 产品经理）。`,
    };
  }

  const covered = extractCovered(input.experience || '', job.layers);

  // 差距诊断：只在「学生经历有缺失」时给关键差距 + 补课路径
  // 注：无经历输入时，不硬造差距，而是引导补经历；否则给「核心硬技能」推荐路径。
  const gaps: GapAdvice[] = [];
  const hardLayer = job.layers.find((l) => l.layer === 'hard');
  if (hardLayer && input.experience) {
    const coveredHard = extractCovered(input.experience || '', [hardLayer]);
    // 未覆盖的硬技能 → 差距 + 补课
    for (const item of hardLayer.items) {
      const isCovered = coveredHard.some((c) => c.includes(item));
      if (!isCovered) {
        const skillKey = Object.keys(job.studyPaths).find((k) => item.includes(k));
        gaps.push({
          skill: item,
          layerLabel: hardLayer.label,
          gap: `你目前没体现「${item}」`,
          path: (skillKey && job.studyPaths[skillKey]) || '系统学习该技能 + 做一个可验证的小案例',
        });
      }
    }
  }

  const summary = `「${job.name}」(${category}) 的能力对标：你已有的经历覆盖 ${covered.length} 处要求，核心硬技能存在 ${
    gaps.length
  } 项缺口。${gaps.length > 0 ? '先补最薄的 1-2 项，就能显著提升投递竞争力。' : '硬技能基本覆盖，建议把经历用数据量化后直接投。'}`;

  return {
    matchedJob: job.name,
    matchedCategory: job.category,
    known: true,
    layers: job.layers,
    advantages: covered,
    gaps,
    recommendations: job.recommendCompanies,
    summary,
  };
}

/** 岗位列表（供前端/GET 展示） */
export function listCapabilityJobs(): { id: string; name: string; category: string }[] {
  return JOBS.map((j) => ({ id: j.id, name: j.name, category: j.category }));
}
