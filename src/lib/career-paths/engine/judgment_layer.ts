// 职途星判断力因果层 · 求职判断的学术/实证依据
// 核心命题：学生「不知道自己能投什么」不只是信息问题，更是判断问题。
// 本层把「专业→岗位」的因果逻辑讲清楚，用可背调的学术与实证素材支撑判断力，
// 而非停留在静态对照表。全部条目守四真：真实发生、真实可背调、标注来源与置信度。
//
// 用法：公开内容阵地 /insights 渲染，作为判断力内容底座的「因果层」。
// 数据口径说明：麦可思数据为「毕业生毕业半年后」跟踪口径（2026-06-11 发布，连续第18年）。

export interface JudgmentCausalItem {
  id: string;            // 条目号（J1-J6）
  title: string;         // 判断标题（一句话结论）
  premise: string;       // 前提（学术/实证依据）
  inference: string;     // 推理（因果链）
  conclusion: string;    // 结论（落地判断）
  source: string;        // 来源说明（可背调）
  sourceUrl: string;     // 参考链接（一手/官方优先）
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export const JUDGMENT_CAUSAL_LAYER: JudgmentCausalItem[] = [
  {
    id: 'J1',
    title: '专业不决定岗位，可迁移能力才决定转化成功率',
    premise:
      '生涯建构理论认为职业人格是动态过程、是「动词而非名词」，聚焦「个体在工作中能成为什么」而非「工作前是什么」；可迁移能力与就业质量显著正相关（r=0.837，N=208）。',
    inference:
      '既然专业只提供起点、不封顶方向，而就业结果更由「可迁移能力」这一中介变量驱动，那么「专业→岗位」能否转化成功，关键在能力能否跨域迁移，而非专业标签。',
    conclusion:
      '认知库不应把专业当天花板，而应把专业当起点，用「能力翻译」把专业课程显式映射为可迁移能力，从而拓展岗位可能性空间。',
    source: 'Savickas 生涯建构理论；赵婕《大学生可迁移能力与就业质量关系的实证研究》（Y大学，2024）',
    sourceUrl: 'https://www.marksavickas.com/files/1_Savickas_bio/Interviews/Savickas%20Publications/Encyclopedia%20Entries/Carer_Construction_Theory.pdf',
    confidence: 'HIGH',
  },
  {
    id: 'J2',
    title: '生涯适应力 4C 是学生「敢不敢投、能不能转」的心理开关',
    premise:
      '生涯适应力是可改变的交易性胜任力，核心四资源为「关注/控制/好奇/信心」；社会认知职业理论（SCCT）认为职业选择由「自我效能 × 结果预期」驱动「兴趣→目标→行动」。',
    inference:
      '四资源中「控制、好奇、信心」直接对应学生面对陌生/冷门岗位时的自主性、探索意愿与自我效能；自我效能不足时，学生「知道能投」也不会真正行动。',
    conclusion:
      '认知库在给出「该投什么」之外，必须提升信心/自我效能（如学长替代经验、权威岗位确认、可量化能力清单），才能真正驱动投递行动。',
    source: 'Savickas & Porfeli 生涯适应力量表；SCCT 社会认知职业理论（北森生涯）',
    sourceUrl: 'https://createyourwhy.ai/files/1_Savickas_bio/Interviews/Savickas%20Publications/Papers%20and%20Published%20Abstracts/Career_Adapt-Abilities.pdf',
    confidence: 'HIGH',
  },
  {
    id: 'J3',
    title: '学生高估热门岗、低估冷门岗，源于过度自信三态，需分状态校准',
    premise:
      'Moore & Healy（2008）指出「过度自信」非单一构念，而是三种可分离且方向相反的现象：高估自己（难任务最强）、优越感（易任务最强）、过度精确（普遍且顽固）。',
    inference:
      '学生对热门岗「我也能进」来自优越感/高估自己（低估真实门槛）；对冷门岗「我不配投」来自信息缺失的高估偏差；对薪资「毕业就该 1 万+」来自过度精确（区间过窄）。',
    conclusion:
      '认知库应对不同偏差分状态处理——用真实就业竞争/门槛数据压高估，用冷门岗真实机会纠正低配，用实际薪资分布校准过度的「高薪想象」。',
    source: 'Moore & Healy 过度自信三态；本土佐证：光明日报《大学生择业心理》',
    sourceUrl: 'https://www.gmw.cn/01gmrb/2008-06/16/content_791246.htm',
    confidence: 'HIGH',
  },
  {
    id: 'J4',
    title: '专家直觉只在「高效度环境 + 及时明确反馈」下可靠，职业判断需增强效度与反馈',
    premise:
      'Kahneman & Klein（2009）指出可靠直觉需满足两个条件：环境高效度（规律可学习）+ 决策者有长期、及时、明确、与决策相关的反馈练习。',
    inference:
      '学生对陌生岗位的「直觉」多在低效度、无反馈的环境形成，因此不可靠；提升判断准确度→把环境「增强效度」（真实就业结构）+ 提供「及时反馈」（模拟投递/对照真实数据）。',
    conclusion:
      '认知库把「提供高效度信息」与「提供校准反馈」作为提升学生判断准确度的核心机制，与校准训练研究（绩效/结果反馈可降低过度自信）一致。',
    source: 'Kahneman & Klein（2009）；Applied Cognitive Psychology（2024）校准训练综述',
    sourceUrl: 'https://onlinelibrary.wiley.com/doi/full/10.1002/acp.4236',
    confidence: 'HIGH',
  },
  {
    id: 'J5',
    title: '专业对口率随行业周期/技术冲击剧烈变化，职业判断需「概率思维」',
    premise:
      '麦可思《2026 中国本科生就业报告》显示：计算机科学与技术对口率 2020 届 76% → 2024 届 62%，计算机程序员就业占比 2021 届 1.9% → 2025 届 1.0%；建筑学 2020 届 92% → 2024 届 62%。',
    inference:
      '既然昔日「高壁垒、高对口」的专业对口率能因 AI 冲击与地产收缩在四年内大幅下滑，「专业→岗位」是受产业周期/技术影响的动态概率，而非静态确定映射。',
    conclusion:
      '认知库应把「专业→岗位」表述为带概率与区间的判断（如「该专业对口率近年下降，但需结合行业景气与能力扩展」），而非静态对照表，避免用个别成功案例误导确定性。',
    source: '麦可思《2026 中国本科生就业报告》（2026-06-11 发布，未来网转载）',
    sourceUrl: 'http://m.edu.k618.cn/gaoxiao/202606/t20260611_20033721.html',
    confidence: 'HIGH',
  },
  {
    id: 'J6',
    title: '「红黄绿牌 + 高薪榜」交叉是专业就业安全度的量化分层框架',
    premise:
      '2026 红黄绿牌专业显示绿牌全为工科、计算机集体退出；2025 届高薪前十中电子信息占 4 席、微电子 7814 元居首；新质生产力领域十大工科月收入均超 7000、电气相关度 94%。',
    inference:
      '绿牌（就业安全、薪资高、对口率高）与高薪榜高度重合于「集成电路、高端装备、智能制造、新能源」工科，与红牌（文/艺/管理、饱和）形成明确分化梯度。',
    conclusion:
      '认知库可用「红黄绿牌 + 高薪榜 + 对口率」交叉，把专业就业安全度做成量化分层；并提示高对口率专业仍可能有准入门槛（电气要考国网、微电子卷到硕士），避免「绿牌=保险」误读。',
    source: '麦可思 2026 红黄绿牌（教育在线）；2026 高薪专业榜（辽宁日报）；新质生产力工科（人民网）',
    sourceUrl: 'http://www.eol.cn/kaoshi/gaokao/bkzn/202608/t20260811_2764405.shtml',
    confidence: 'HIGH',
  },
];
