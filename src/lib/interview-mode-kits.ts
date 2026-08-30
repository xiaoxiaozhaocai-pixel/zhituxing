// lib/interview-mode-kits.ts
// P6 面试模式增强 —— 零模型成本本地素材库
// 给「无领导群面 / 英文面试 / 压力面试」三种类型提供结构化参考素材，
// 注入 system prompt 后提升小职模拟面试的一致性与深度，不额外增加 LLM 调用。
// 守四真：均为通用面试方法论与真实高频场景，不编造具体企业数据。

// ===========================
// 1. 无领导小组讨论 案例库
// ===========================
export interface GroupRole {
  role: string;
  behavior: string;
  focus: string;
}

export interface GroupCase {
  id: string;
  category: string;
  title: string;
  scenario: string;
  task: string;
  roles: GroupRole[];
  evaluation: string[];
}

export const GROUP_CASE_LIBRARY: GroupCase[] = [
  {
    id: 'group_biz_growth',
    category: '商业策略',
    title: '某连锁餐饮外卖订单下滑，如何设计增长方案',
    scenario:
      '你是一个三人小组，正在为一家连锁餐饮品牌做咨询。近三个月该品牌的外卖订单量持续下滑，门店客流尚可但外卖占比快速下降。',
    task: '请小组在讨论中给出 3 条可落地、可衡量的增长动作，并说明优先级排序理由。',
    roles: [
      { role: '计时员', behavior: '负责把控每环节时间，提示「个人陈述还剩 30 秒」「自由讨论收尾」。', focus: '时间管理、流程推进' },
      { role: '质疑者', behavior: '对大家提出的方案立刻挑刺，如「外卖下滑也可能是平台规则变了，凭什么是产品问题？」', focus: '逻辑勘误、多角度验证' },
      { role: '支持者', behavior: '帮发言者把观点讲完整，如「刚才你说的留存是结果，那能不能往前挖到品类和复购？」', focus: '深化观点、结构补全' },
      { role: '总结者', behavior: '把零散观点收敛成结构，如「我们最终聚焦 3 条：挽回老客复购、优化外卖定价、提高出餐效率」。', focus: '收敛共识、结构化汇报' },
    ],
    evaluation: ['能否先拆维度再谈方案（产品/定价/渠道/运营）', '能否用数据说话而非空谈', '冲突时能否协调并推进共识'],
  },
  {
    id: 'group_resource_priority',
    category: '资源排序',
    title: '公司预算有限，四个新项目只能重点投入一个',
    scenario:
      '公司年度预算有限，四个候选项目只能重点投入一个，其余暂缓。每人都代表一种立场，需要在讨论中达成一致。',
    task: '给出你们小组最终选定的项目、选择依据，以及落选项目的处理建议。',
    roles: [
      { role: '计时员', behavior: '提醒讨论节奏，避免陷入单一项目纠缠。', focus: '节奏与效率' },
      { role: '质疑者', behavior: '对「选赚钱的」这类直觉判断追问：「短期现金流重要，但战略卡位和团队能力对得上吗？」', focus: '风险与战略权衡' },
      { role: '支持者', behavior: '帮大家把不同项目的隐性价值补全，避免只比数字。', focus: '维度补全' },
      { role: '总结者', behavior: '用统一标准（如现金流/战略匹配/团队胜任）收敛出排序，并说明落选项目的留观方式。', focus: '标准共识、结论收敛' },
    ],
    evaluation: ['能否建立可比较的统一标准', '能否平衡理性与直觉', '落选项目是否有善后方案'],
  },
  {
    id: 'group_crisis_handle',
    category: '危机处理',
    title: '产品上线前夜发现重大安全漏洞，怎么办',
    scenario:
      '某线上产品明早 8 点正式发布，今晚 22 点测试组发现一个可能影响用户数据安全的重大漏洞，修复预计需要 6 小时。',
    task: '小组需要在讨论中给出处理决策：是否延期发布、如何修复、如何对外沟通。',
    roles: [
      { role: '计时员', behavior: '明确「必须在 20 分钟内出方向」的紧迫感。', focus: '紧迫感、决策时限' },
      { role: '质疑者', behavior: '戳穿「先上线再补」的侥幸：「用户数据已经可能泄露，这个风险你承担得起吗？」', focus: '责任与底线' },
      { role: '支持者', behavior: '帮大家把「延期」的连锁影响（市场窗口、竞品节奏、KPI）摆全。', focus: '影响面评估' },
      { role: '总结者', behavior: '收敛为「决定延期 + 分步修复 + 内部/外部沟通预案」。', focus: '决策收敛、责任划分' },
    ],
    evaluation: ['能否守住用户安全底线而非投机', '能否评估延期/上线的双向代价', '沟通预案是否完整'],
  },
  {
    id: 'group_open_debate',
    category: '开放辩论',
    title: 'AI 短期内会不会大规模替代产品经理',
    scenario:
      '小组就「AI 会不会在 3 年内大规模替代产品经理这一岗位」展开讨论。每人观点可以不一致，但需互相补充与反驳。',
    task: '小组最终给出一个相对共识的判断，并说明支撑这个判断的核心理由。',
    roles: [
      { role: '计时员', behavior: '控制发言轮次，避免一人垄断。', focus: '发言均衡' },
      { role: '质疑者', behavior: '对「AI 什么都能做」泼冷水：「产品判断、跨部门协调、背锅负责，AI 能替代吗？」', focus: '反方视角' },
      { role: '支持者', behavior: '对「AI 只是工具」补充：「但工具能改变岗位的结构，初级执行可能被压缩」。', focus: '辩证延展' },
      { role: '总结者', behavior: '收敛为「短期替代的是执行环节、而非判断与协调，岗位内涵会变」。', focus: '辩证收敛、边界清晰' },
    ],
    evaluation: ['能否辩证看待而非站队', '能否区分「工具替代」与「岗位消亡」', '判断是否有依据'],
  },
];

// ===========================
// 2. 英文面试 高频问法库
// ===========================
export interface EnglishQuestion {
  category: string;
  en: string;
  hint: string;
}

export const ENGLISH_QUESTION_BANK: EnglishQuestion[] = [
  {
    category: '自我介绍',
    en: 'Tell me about yourself. / Walk me through your resume.',
    hint: '用 60-90 秒，结构为「现在（岗位/身份）→ 过去（关键经历与成果）→ 未来（为什么想来这家公司/这个岗位）」。避免照读简历。',
  },
  {
    category: '自我介绍',
    en: 'What are your strengths and weaknesses?',
    hint: '优点给一个具体例子，缺点说一个真实但可改进的点并给出正在采取的行动，避免说「完美主义」这类万能回答。',
  },
  {
    category: '行为面试',
    en: 'Tell me about a time you faced a challenge. How did you handle it?',
    hint: '用 STAR：Situation（背景）→ Task（任务）→ Action（你做了什么）→ Result（结果，尽量量化）。',
  },
  {
    category: '行为面试',
    en: 'Describe a time you worked under pressure or with a tight deadline.',
    hint: '突出你在压力下的优先级判断与行动步骤，结果最好有可量化的完成情况。',
  },
  {
    category: '行为面试',
    en: 'Why do you want to join our company?',
    hint: '把公司业务/文化/发展阶段与你自己的目标结合，避免只说「公司很好/平台大」。',
  },
  {
    category: '技术/专业',
    en: 'How would you approach {a real work problem}?',
    hint: '先复述问题确认理解 → 拆解思路 → 给出步骤 → 说明你如何验证结果。展示逻辑而非背答案。',
  },
  {
    category: '技术/专业',
    en: 'Tell me about a project you are most proud of.',
    hint: '讲清你负责的部分、技术/业务难点、你的贡献、以及最终结果。不要只讲团队整体。',
  },
  {
    category: '收尾反问',
    en: 'Do you have any questions for us?',
    hint: '准备好 1-2 个有质量的反问，如「这个岗位最看重的核心能力是什么」「团队目前最大的挑战是什么」。',
  },
];

// ===========================
// 3. 压力面试 追问库
// ===========================
export interface PressureFollowUp {
  category: string;
  template: string;
}

export const PRESSURE_FOLLOWUP_LIBRARY: PressureFollowUp[] = [
  { category: '质疑', template: '这真的是你独立完成的吗？听起来更像团队成果，你具体负责哪一部分？' },
  { category: '质疑', template: '你说的「效果很好」，具体好在哪里？用什么指标衡量？' },
  { category: '质疑', template: '你刚才的话前后矛盾——前面说 A，后面又说 B，你确定你清楚自己在做什么？' },
  { category: '打断', template: '等等，你刚才提到 XX，先别往下讲，把这个点说清楚。' },
  { category: '打断', template: '打断一下，你说的这个和你简历上写的不一致，怎么解释？' },
  { category: '限时', template: '给你 30 秒，用最简单的话把这个项目的核心逻辑讲清楚。' },
  { category: '限时', template: '现在只剩一分钟，请把最重要的三条经验说出来。' },
  { category: '沉默施压', template: '（沉默 3-5 秒后）你确定这是你最好的回答吗？要不要再想一下？' },
  { category: '沉默施压', template: '（盯着用户）如果你是我，你会录用一个连自己经历都讲不清楚的人吗？' },
];

// 把素材库拼接成供系统提示词注入的文本块
export function buildModeKitBlock(interviewType: 'group' | 'english' | 'pressure'): string {
  if (interviewType === 'group') {
    const cases = GROUP_CASE_LIBRARY.map(
      (c) =>
        `【${c.category}｜${c.title}】\n场景：${c.scenario}\n任务：${c.task}\n小组角色话术参考：\n${c.roles
          .map((r) => `  - ${r.role}（${r.focus}）：${r.behavior}`)
          .join('\n')}\n评分关注：${c.evaluation.join('；')}`
    ).join('\n\n');
    return `\n--- 无领导群面参考案例库（可据此出题，也可参考角色话术推进讨论） ---\n${cases}\n--- 群面案例库结束 ---`;
  }

  if (interviewType === 'english') {
    const questions = ENGLISH_QUESTION_BANK.map(
      (q) => `【${q.category}】${q.en}\n  → 作答提示：${q.hint}`
    ).join('\n');
    return `\n--- 英文面试高频问法库（可覆盖这些常见问题，并按提示引导用户） ---\n${questions}\n--- 英文问法库结束 ---`;
  }

  const followups = PRESSURE_FOLLOWUP_LIBRARY.map(
    (f) => `- [${f.category}] ${f.template}`
  ).join('\n');
  return `\n--- 压力面试追问库（可穿插使用，注意不要连续高压到用户无法作答） ---\n${followups}\n--- 压力追问库结束 ---`;
}
