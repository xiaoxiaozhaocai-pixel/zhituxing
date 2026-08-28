// =====================================================================
// B3 职业路径规划建模：从「这一步」推「下一步」，做成成长路线
// 核心命题：学生不知道「我现在该干什么、做成什么样、下一步去哪」。
// 输出「当前阶段该做什么 + 完成标准 + 下一步」，不是打分，是可落地的路线。
// 纯本地启发式，零模型成本；守四真，只给方向与动作，不替用户编造经历。
// =====================================================================

import { encodeMajor } from '@/lib/career-paths/engine/major_mapping';

export type CareerPlanStage = 'foundation' | 'explore' | 'develop' | 'push' | 'hunt' | 'onboard';
export type CareerTrackKey = 'dev' | 'data' | 'hardware' | 'manufacture' | 'business' | 'hrfin';

export interface StageStep {
  stage: CareerPlanStage;
  stageLabel: string;
  focus: string;       // 这一阶段的核心命题
  actions: string[];   // 关键动作（可量化）
  milestone: string;   // 这一步做完的标志
  nextHint: string;    // 推下一步
}

export interface PathPlanReport {
  input: string;
  matchedMajor?: string;
  majorCategory?: string;
  trackKey: CareerTrackKey;
  trackLabel: string;
  jobDirections: string[];   // 具体岗位方向
  currentStageLabel: string; // 当前所处阶段
  roadmap: StageStep[];      // 从当前阶段起的路线
  summary: string;
  needsMoreInfo?: boolean;
}

export interface PathPlanInput {
  major?: string;
  grade?: string;
  direction?: string;
  skills?: string;
}

// ---- 阶段档位（统一 6 阶） ----
const STAGE_ORDER: CareerPlanStage[] = ['foundation', 'explore', 'develop', 'push', 'hunt', 'onboard'];
const STAGE_LABEL: Record<CareerPlanStage, string> = {
  foundation: '大一·基础期',
  explore: '大二·探索期',
  develop: '大三·发力期',
  push: '大四·冲刺期',
  hunt: '毕业·求职期',
  onboard: '入职·站稳期',
};

// ---- 方向 key → 中文名 & 岗位方向 ----
const TRACK_META: Record<CareerTrackKey, { label: string; jobDirections: string[] }> = {
  dev: { label: '软件开发', jobDirections: ['后端/全栈开发', '前端开发', '测试/运维', '技术支持'] },
  data: { label: '数据/算法', jobDirections: ['数据分析师', 'BI工程师', '数据运营', '算法/机器学习'] },
  hardware: { label: '电子/硬件', jobDirections: ['嵌入式工程师', '硬件工程师', '通信工程师', 'PCB/单片机'] },
  manufacture: { label: '智能制造/工艺', jobDirections: ['工艺工程师', '设备工程师', '品质工程师', '供应链采购'] },
  business: { label: '产品/运营/市场', jobDirections: ['产品经理', '产品运营', '市场营销', '销售/商务'] },
  hrfin: { label: 'HR/行政/财务', jobDirections: ['HR专员', '行政专员', '财务/会计', '招聘/培训'] },
};

// ---- 方向别名（用户输入 direction 时识别） ----
export const TRACK_ALIASES: Record<string, CareerTrackKey> = {
  开发: 'dev', 软件: 'dev', 前端: 'dev', 后端: 'dev', 全栈: 'dev', 编程: 'dev', 代码: 'dev',
  java: 'dev', python: 'data', js: 'dev', 测试: 'dev', 运维: 'dev',
  算法: 'data', 数据分析: 'data', 大数据: 'data', ai: 'data', 机器学习: 'data', 数据: 'data', 人工智能: 'data',
  电子: 'hardware', 硬件: 'hardware', 嵌入式: 'hardware', 通信: 'hardware', 芯片: 'hardware', 电路: 'hardware',
  制造: 'manufacture', 机械: 'manufacture', 工艺: 'manufacture', 自动化: 'manufacture', 电气: 'manufacture', 设备: 'manufacture', 供应链: 'manufacture',
  产品: 'business', 运营: 'business', 市场: 'business', 销售: 'business', 营销: 'business', 电商: 'business', 新媒体: 'business',
  hr: 'hrfin', 行政: 'hrfin', 财务: 'hrfin', 会计: 'hrfin', 金融: 'hrfin', 人事: 'hrfin', 招聘: 'hrfin',
};

// ---- subCategory → 方向（专业推导） ----
const MAJOR_TRACK_HINTS: Record<string, CareerTrackKey> = {
  'IT-计算机': 'dev', 'IT-软件': 'dev', 'IT-网络': 'dev', 'IT-信安': 'dev', 'IT-物联网': 'dev',
  'IT-人工智能': 'data', 'IT-大数据': 'data',
  'EE-电子': 'hardware', 'EE-通信': 'hardware',
  'ME-机械': 'manufacture', 'ME-机电': 'manufacture', 'ME-电气': 'manufacture', 'ME-自动化': 'manufacture',
  'MGMT-HR': 'hrfin', 'MGMT-会计': 'hrfin', 'MGMT-电商': 'business', 'MGMT-工业工程': 'manufacture',
  'MGMT-工管': 'business',
};

// ---- 各方向成长路线（6 阶段模板） ----
const STAGE_ROADMAP: Record<CareerTrackKey, StageStep[]> = {
  // ============ 软件开发 ============
  dev: [
    { stage: 'foundation', stageLabel: STAGE_LABEL.foundation, focus: '先把一门语言和扎实的计算机基础打牢，别急着跟风。',
      actions: ['学好一门语言（C/Java/Python 任选）到能独立写小项目', '补扎实 数据结构与算法、计算机网络、操作系统、数据库 四门核心课', '每周至少 1 次 LeetCode 基础题练手感'],
      milestone: '能独立画出项目架构 + 讲清一个数据结构的复杂度，即可进入下一步。', nextHint: '大二顺着这个基础上手一个成型的项目。' },
    { stage: 'explore', stageLabel: STAGE_LABEL.explore, focus: '选定一个方向（后端/前端/测试），做一个能展示的完整项目。',
      actions: ['选定主攻方向，学对应技术栈（后端 Spring/Go、前端 Vue/React）', '独立做一个有业务闭环的小项目（如班级管理系统、个人博客），并 Docker 部署', '参加一次 CS 类比赛或开源贡献，攒这段经历'],
      milestone: '任何面试官问你「这个项目你做了什么、遇到什么坑」都能清楚回答。', nextHint: '大三把技能和经历对齐到目标岗位的 JD。' },
    { stage: 'develop', stageLabel: STAGE_LABEL.develop, focus: '用实习验证方向，简历从「学过」升级到「做过」。',
      actions: ['拿到 1 段开发实习（或高质量外包/开源项目）', '把项目经历按「背景-你负责-结果」写进简历，量化产出', '刷题+总结八股，形成自己的面试答题套路'],
      milestone: '简历上至少 1 段能被背调的主责经历 + 1 个可讲清楚的项目。', nextHint: '秋招季把重点从积累转向「投递 + 面试冲刺」。' },
    { stage: 'push', stageLabel: STAGE_LABEL.push, focus: '秋招春招全面进攻，用复盘代替盲目海投。',
      actions: ['按照目标岗位精准投递（结合学长内推），别只投大厂', '系统刷题 + 复盘每次面试被问住的点', '准备 2-3 段高相关项目的「故事化」讲解'],
      milestone: '至少进入 5+ 家面试流程，能稳定通过两轮技术面。', nextHint: '拿到 offer 后集中判断「平台+方向+成长」匹配度。' },
    { stage: 'hunt', stageLabel: STAGE_LABEL.hunt, focus: '在有限的 offer 里选对下一步，而不是只看薪资。',
      actions: ['盘点手里 offer 的平台、方向、技术栈、带教', '对不满意的 offer 评估是否值得再战春招/补录', '谈薪资前先摸清该岗位市场价，守住底线'],
      milestone: '做出一个不后悔的选 offer 决定，并确认了入职方向。', nextHint: '入职后第一年打磨「能独立交付」的核心能力。' },
    { stage: 'onboard', stageLabel: STAGE_LABEL.onboard, focus: '别急着证明自己，先站稳、看懂体系和成长路径。',
      actions: ['快速上手业务代码规范与协作流程（git/CI/评审）', '在带教指导下独立交付 1 个模块', '半年内复盘一次成长方向：技术深度 or 业务广度'],
      milestone: '能独立承接需求、被团队信任，形成自己的技术影响力。', nextHint: '往「能解决复杂问题」的资深方向持续沉淀。' },
  ],
  // ============ 数据/算法 ============
  data: [
    { stage: 'foundation', stageLabel: STAGE_LABEL.foundation, focus: '数学+编程+工具三件套先入门，数据这门手艺重积累。',
      actions: ['学好 线性代数、概率统计、Python 基础', '上手 SQL 和 Pandas，会做基础数据清洗与统计', '了解数据分析/机器学习的基本流程（获取-清洗-建模-呈现）'],
      milestone: '能独立用 SQL/Python 完成一份小数据集的分析并说明结论。', nextHint: '大二开始接触真实业务数据集和可视化。' },
    { stage: 'explore', stageLabel: STAGE_LABEL.explore, focus: '拿真实数据练手，学会「用数据讲故事」。',
      actions: ['用 Kaggle/DataSet 或校园数据做 1 个完整分析并写成报告', '掌握可视化（Tableau/Matplotlib/BI 工具）讲清一张图', '入门机器学习核心模型 + 会用 sklearn 跑通 pipeline'],
      milestone: '能产出一份「结论清晰、有依据」的数据分析报告。', nextHint: '大三把数据能力对准具体岗位（BI/分析/算法）去深入。' },
    { stage: 'develop', stageLabel: STAGE_LABEL.develop, focus: '用实习验证你对「业务数据」的理解，而不是只会工具。',
      actions: ['找一份数据分析/BI/运营数据实习，接触真实指标', '学习业务指标体系（漏斗/留存/转化），会拆解异常', '把分析项目按「业务问题-方法-洞察-建议」写进简历'],
      milestone: '能针对一个业务问题给出有洞察的分析结论与行动建议。', nextHint: '秋招把重点放到「项目故事 + 案例分析」的准备上。' },
    { stage: 'push', stageLabel: STAGE_LABEL.push, focus: '用业务敏感度+方法能力同时赢得面试。',
      actions: ['准备 1-2 段主导的数据项目，讲清「我发现了什么」', '刷常见面试题：指标设计、AB 实验、异动归因', '若冲算法岗，补机器学习/深度学习原理与手撕代码'],
      milestone: '面试能从容应对「给一个业务问题，你如何分析」的案例题。', nextHint: '选 offer 时关注数据的「业务深度」而非纯工具岗。' },
    { stage: 'hunt', stageLabel: STAGE_LABEL.hunt, focus: '选一个能让你数据能力持续增值的岗位。',
      actions: ['对比 offer 的数据分工（偏分析/偏建模/偏产品）', '确认团队是否有资深带教、数据质量是否够用', '谈薪前摸清数据岗市场区间，合理表达期望'],
      milestone: '选择到能积累「业务理解」而非纯粹搬数的岗位。', nextHint: '入职后强化「数据→决策」的落地能力。' },
    { stage: 'onboard', stageLabel: STAGE_LABEL.onboard, focus: '从会分析到能影响业务决策，是数据人的分水岭。',
      actions: ['吃透公司指标体系，能独立跟进一个业务模块的数据', '学会把分析结论转化为可落地的业务建议', '沉淀一套自己的分析框架/看板'],
      milestone: '你的分析被业务方采纳并产生实际动作，即站稳。', nextHint: '往「数据驱动业务/策略」的资深方向走。' },
  ],
  // ============ 电子/硬件 ============
  hardware: [
    { stage: 'foundation', stageLabel: STAGE_LABEL.foundation, focus: '电路+编程+数电模电基础，硬件是实打实的「设备活」。',
      actions: ['学好电路分析、数字/模拟电子技术、信号与系统', '会用 C 语言写单片机基本逻辑（GPIO/中断/串口）', '动手做 1 个小硬件实验（点灯/传感器/简单控制）'],
      milestone: '能独立完成一个单片机小项目并讲清原理。', nextHint: '大二把精力放到「板级+嵌入式」的具体方向上。' },
    { stage: 'explore', stageLabel: STAGE_LABEL.explore, focus: '选定嵌入式/硬件/通信细方向，动手做出实物。',
      actions: ['选主攻：嵌入式（STM32）、硬件（PCB 设计）、或通信', '完成 1 个有难度的实物项目（如智能小车/温控系统）', '掌握常用工具：Keil/Altium Designer/示波器'],
      milestone: '有 1 个能演示、能讲清架构的硬件项目。', nextHint: '大三去制造/电子企业实习，把项目对齐岗位需求。' },
    { stage: 'develop', stageLabel: STAGE_LABEL.develop, focus: '用实习补上「量产/工程化」的认知差距。',
      actions: ['找电子/半导体/通信相关实习（制造/研发/测试相宜）', '学习硬件全流程：设计-打样-调试-量产常见问题', '简历突出你独立负责的硬件模块与调试结果'],
      milestone: '理解「实验室能跑」和「量产稳定」之间的差距。', nextHint: '秋招把重点放在「项目实操+硬件原理」的双重准备。' },
    { stage: 'push', stageLabel: STAGE_LABEL.push, focus: '用扎实的原理+项目实操拿下面试。',
      actions: ['准备 1-2 个硬件项目的完整讲述（设计-调试-难点）', '复习高频原理：总线协议/中断/ADC/DAC/电源', '若冲刺设计类岗位，练画原理图+LAYOUT 能力'],
      milestone: '面试能就「你这个项目怎么做出来、遇到什么坑」讲透。', nextHint: '选 offer 关注「成熟体系+可接触核心硬件设计」。' },
    { stage: 'hunt', stageLabel: STAGE_LABEL.hunt, focus: '在平台与方向之间选一个能持续深耕的硬件岗。',
      actions: ['对比 offer 是做整机/板卡/芯片/测试/量产', '确认岗位是否能接触到核心设计而非只当螺丝钉', '评估公司规模与带教质量，别只看 title'],
      milestone: '选择到能积累核心硬件能力的岗位。', nextHint: '入职后把「调试与量产经验」沉淀成竞争力。' },
    { stage: 'onboard', stageLabel: STAGE_LABEL.onboard, focus: '从能调通到能设计，是硬件人成长的关键台阶。',
      actions: ['吃透公司产品硬件架构与设计规范', '独立负责 1 个模块的完整设计与调试', '积累质量管理/可靠性/成本等工程化经验'],
      milestone: '能独立带一个小模块到量产稳定，即迈上台阶。', nextHint: '往「资深硬件/架构」或「技术管理」方向发展。' },
  ],
  // ============ 智能制造/工艺 ============
  manufacture: [
    { stage: 'foundation', stageLabel: STAGE_LABEL.foundation, focus: '工程基础+识图+动手能力，制造业重「稳」。',
      actions: ['学好机械制图/工程力学/材料/电气基础', '掌握 CAD 制图与基础工艺认知（机加工/注塑/装配）', '有条件进一次工厂参观/实训，建立实感'],
      milestone: '能看懂图纸、理解一道工序从毛坯到成品的逻辑。', nextHint: '大二往「工艺/设备/质量」具体方向探索。' },
    { stage: 'explore', stageLabel: STAGE_LABEL.explore, focus: '选定工艺/设备/质量/供应链之一，动手攒项目。',
      actions: ['选主攻：工艺（SOP/产线）、设备（PLC/维护）、质量（QC）', '学相关工具：PLC 基础/SPC/QC 七大手法', '做 1 个产线改善/质量分析的小案例'],
      milestone: '能针对一个具体工序给出改善思路。', nextHint: '大三去制造名企实习，对准一线岗位。' },
    { stage: 'develop', stageLabel: STAGE_LABEL.develop, focus: '用一线实习理解「稳定、成本、效率」的工程逻辑。',
      actions: ['找制造企业实习（工艺/设备/质量/生产相宜）', '学习并跟进实际产线问题：良率/节拍/成本', '简历突出你改进的具体环节与量化收益'],
      milestone: '能独立跟进一段产线 improvement，并说清收益。', nextHint: '秋招把「现场+工具+改善」三条一起讲。' },
    { stage: 'push', stageLabel: STAGE_LABEL.push, focus: '企业对制造业候选人重「踏实+现场经验」，不重华丽。',
      actions: ['准备 1 段产线/车间经历的完整讲述', '复习 APQP/ISO9001/SPC/精益生产等体系名词', '若冲供应链，补采购/计划/物流基础'],
      milestone: '面试能就一个现场问题给出稳定可行的改善方案。', nextHint: '选 offer 关注「能下现场+有老带教」的成长型岗位。' },
    { stage: 'hunt', stageLabel: STAGE_LABEL.hunt, focus: '在工艺/设备/质量/供应链里选准能学到体系的岗位。',
      actions: ['对比岗位是偏研发还是偏现场落地', '确认企业平台与产线技术水平（比亚迪/富士康/冠宇等）', '评估成长路径：从技术到管理/精益专家的可能'],
      milestone: '选到能学到完整制造体系的岗位。', nextHint: '入职后把「现场问题解决能力」做成你的标签。' },
    { stage: 'onboard', stageLabel: STAGE_LABEL.onboard, focus: '从能干活到能解决产线瓶颈，是最快的升值路径。',
      actions: ['吃透所在产线的工艺/设备/质量全链条', '独立负责 1 个改善项目并拿到可量化成果', '学会跨部门协作（研发-生产-质量）'],
      milestone: '你能独立带起一段改善并拿到结果，即站稳。', nextHint: '往「精益工程师/工艺专家/生产管理」方向走。' },
  ],

  // ============ 产品/运营/市场 ============
  business: [
    { stage: 'foundation', stageLabel: STAGE_LABEL.foundation, focus: '先搞懂「商业逻辑」和「用户」，别只停留在兴趣。',
      actions: ['多拆解产品：为什么这个App这样做、它的用户是谁', '学基础工具：Excel/PPT/基础数据分析', '多看行业资讯与经典案例，建立商业感觉'],
      milestone: '能对一款产品讲出「用户-价值-模式」。', nextHint: '大二把认知落地到具体项目或运营实践。' },
    { stage: 'explore', stageLabel: STAGE_LABEL.explore, focus: '动手做一个可被验证的项目，比持有观点更重要。',
      actions: ['运营一个自媒体/社群/校园项目，拿真实数据', '学用户调研、竞品分析、A/B 测试基础', '参加商赛/创新创业赛，沉淀「操盘」经历'],
      milestone: '有一个拿得出手、能讲清结果的运营/项目案例。', nextHint: '大三把「业务结果」写进简历并去企业实习。' },
    { stage: 'develop', stageLabel: STAGE_LABEL.develop, focus: '用实习换「业务视角」，让项目经历有真实产出。',
      actions: ['找产品/运营/市场营销实习，接触真实用户与指标', '学会用数据复盘：拉新/活跃/转化/留存', '把实习产出写成「背景-动作-结果」的简历加分项'],
      milestone: '能用业务指标讲清楚你做的一个动作的增量。', nextHint: '秋招把重点放到「案例复盘 + 产品思维」的准备上。' },
    { stage: 'push', stageLabel: STAGE_LABEL.push, focus: '产品/运营岗重「洞察+落地」，面试靠案例说话。',
      actions: ['准备 2 段主导项目，讲清「我怎么发现问题+怎么做成」', '练案例分析：如何做产品优化/增长/竞品应对', '理解业务增长模型、用户分层、转化漏斗'],
      milestone: '面试能就一个业务目标给出结构化的落地方案。', nextHint: '选 offer 关注「业务体量+能否真正操盘」。' },
    { stage: 'hunt', stageLabel: STAGE_LABEL.hunt, focus: '产品/运营看重「业务判断」，选对赛道等于赢一半。',
      actions: ['对比 offer 的赛道（互联网/消费/制造/出海）', '确认岗位是否能真正负责一块业务而非打杂', '评估团队与上级是否愿意带教'],
      milestone: '选到能积累真实业务判断力的岗位。', nextHint: '入职后把「用户洞察」做成你的核心竞争力。' },
    { stage: 'onboard', stageLabel: STAGE_LABEL.onboard, focus: '从执行到能独立负责一块业务，是运营/产品人的台阶。',
      actions: ['吃透负责业务的数据与用户结构', '独立主导 1 个小项目的全流程并拿到结果', '学会向上管理、跨部门协作、推动落地'],
      milestone: '你负责的指标有明显增长，或独立跑通一条业务线。', nextHint: '往「业务负责人/资深产品/操盘手」方向走。' },
  ],
  // ============ HR/行政/财务 ============
  hrfin: [
    { stage: 'foundation', stageLabel: STAGE_LABEL.foundation, focus: '把专业底子打牢，职能岗更看重「细致+靠谱」。',
      actions: ['学好专业核心课（HR/财会/行政各按本专业）', '掌握 Office 高阶用法（Excel 函数/透视表、PPT）', '培养沟通、书面表达、时间管理能力'],
      milestone: '能独立完成一份规范文档/表格/汇报。', nextHint: '大二往「专业证书+实务」方向沉淀。' },
    { stage: 'explore', stageLabel: STAGE_LABEL.explore, focus: '用证书和实操补齐「专业含金量」。',
      actions: ['考相关证书（初级会计/人力资源师/证书视方向）', '做 1 份专业相关的实操项目（如做一份薪酬/预算方案）', '参加学生会/社团锻炼组织与沟通'],
      milestone: '有证书 + 有能体现专业能力的实操作品。', nextHint: '大三去对口企业实习，验证专业对口度。' },
    { stage: 'develop', stageLabel: STAGE_LABEL.develop, focus: '用实习理解企业职能真实运转，别只停留在课本。',
      actions: ['找 HR/行政/财务相关实习（企业或事务所）', '学习企业实际流程：招聘-入离职/报销-预算/做账', '简历突出你承担的具体职能与细致度'],
      milestone: '能独立处理一段真实职能事务并保证准确。', nextHint: '秋招把重点放在「专业能力+实务经验」上。' },
    { stage: 'push', stageLabel: STAGE_LABEL.push, focus: '职能岗重「稳定+胜任」，用专业能力赢得面试。',
      actions: ['准备证书+实操案例的完整讲述', '复习专业理论与实务：劳动法/会计准则、财税常识', '揣摩企业用人偏好：平台、规模、稳定性'],
      milestone: '面试能就职能专业问题讲清楚并给出可执行判断。', nextHint: '选 offer 关注「专业体系+成长通道」。' },
    { stage: 'hunt', stageLabel: STAGE_LABEL.hunt, focus: '选一个能让你专业持续增值的职能平台。',
      actions: ['对比 offer 是通用岗还是垂直专业岗', '确认是否有资深带教、职业证书支持', '评估公司规模与人才培养机制'],
      milestone: '选到专业能沉淀、不轻易被替代的岗位。', nextHint: '入职后把「专业+业务」结合，做不可替代的专家。' },
    { stage: 'onboard', stageLabel: STAGE_LABEL.onboard, focus: '从执行到能独立支撑一块职能，是最稳的成长。',
      actions: ['吃透负责职能的全流程与合规要求', '独立负责一个模块并做到准确、及时', '学会把职能经验沉淀成可复用的标准/流程'],
      milestone: '你负责的职能稳定可靠，被业务方信任。', nextHint: '往「专家/主管」或「职能+行业」复合方向走。' },
  ],
};

// ---- 年级 → 阶段 ----
export function gradeToStage(grade?: string): { stage: CareerPlanStage; label: string } {
  const g = (grade || '').replace(/\s+/g, '');
  const tests: Array<[RegExp, CareerPlanStage]> = [
    [/大一|一年级|freshman/i, 'foundation'],
    [/大二|二年级|sophomore/i, 'explore'],
    [/大三|三年级|junior/i, 'develop'],
    [/大四|四年级|senior|毕业年级|应届|秋招|春招/i, 'push'],
    [/毕业|求职|找工作|待业/i, 'hunt'],
    [/在职|入职|上班|工作/i, 'onboard'],
  ];
  for (const [re, s] of tests) if (re.test(g)) return { stage: s, label: STAGE_LABEL[s] };
  return { stage: 'develop', label: STAGE_LABEL.develop };
}

// ---- 专业名关键词 → 方向（最精确，优先于子类） ----
const SPECIAL_TO_TRACK: Array<[RegExp, CareerTrackKey]> = [
  [/数据|大数据|数据科学|人工智能|智能科学|机器学习|算法/i, 'data'],
  [/数字媒体/i, 'dev'],
  [/计算机|软件|网络|信安|物联网|信息安全/i, 'dev'],
  [/电子商务|电商/i, 'business'],
  [/电子|微电子|光电|通信|集成电路/i, 'hardware'],
  [/机械|机电|车辆|电气|自动化|测控|机器人/i, 'manufacture'],
  [/工业工程|物流|供应链|采购/i, 'manufacture'],
  [/人力资源|行政|公共事业/i, 'hrfin'],
  [/会计|财务|金融/i, 'hrfin'],
  [/市场|营销|工商|电子商务|电商|管理|旅游|信息管理与信息系统|经济|国贸|国际贸易|外贸/i, 'business'],
  [/设计|艺术|传播|新闻|外语|英语|翻译/i, 'business'],
];

// ---- 方向识别（用户 direction 优先，其次专业名/子类，再大类兜底） ----
function resolveTrack(input: PathPlanInput, subCat: string, majorName: string): { key: CareerTrackKey; matched: boolean; label: string } {
  const dir = (input.direction || '').trim().toLowerCase();
  // 1) 用户指定方向
  if (dir) {
    for (const kw of Object.keys(TRACK_ALIASES)) {
      if (dir.includes(kw)) {
        const key = TRACK_ALIASES[kw];
        return { key, matched: true, label: TRACK_META[key].label };
      }
    }
  }
  // 2) 专业名关键词（最精确）
  if (majorName) {
    for (const [re, key] of SPECIAL_TO_TRACK) {
      if (re.test(majorName)) return { key, matched: true, label: TRACK_META[key].label };
    }
  }
  // 3) subCategory 精确匹配
  if (subCat) {
    const key = MAJOR_TRACK_HINTS[subCat];
    if (key) return { key, matched: true, label: TRACK_META[key].label };
    // 4) 大类兜底
    if (subCat.startsWith('IT')) return { key: 'dev', matched: true, label: TRACK_META.dev.label };
    if (subCat.startsWith('EE')) return { key: 'hardware', matched: true, label: TRACK_META.hardware.label };
    if (subCat.startsWith('ME')) return { key: 'manufacture', matched: true, label: TRACK_META.manufacture.label };
    if (subCat.startsWith('MGMT')) return { key: 'business', matched: true, label: TRACK_META.business.label };
    if (subCat.startsWith('LA') || subCat.startsWith('ART')) return { key: 'business', matched: true, label: TRACK_META.business.label };
  }
  // 5) 兜底默认
  return { key: 'dev', matched: false, label: TRACK_META.dev.label };
}

/**
 * 主函数：从「这一步」推「下一步」的成长路线。
 * 输入可选 major/grade/direction/skills，输出结构化成长路线（解释+路径+建议）。
 */
export function planCareerPath(input: PathPlanInput): PathPlanReport {
  const { major, grade, direction, skills } = input;
  const cleanedMajor = (major || '').trim();
  const cleanedGrade = (grade || '').trim();

  // 专业 → subCategory（用于推导方向）
  let subCat = '';
  let majorCategory = '';
  if (cleanedMajor) {
    subCat = encodeMajor(cleanedMajor);
    if (subCat !== '其他' && subCat.includes('-')) {
      majorCategory = subCat.slice(0, subCat.indexOf('-'));
    } else if (subCat !== '其他') {
      majorCategory = subCat;
    }
  }

  const track = resolveTrack(input, subCat, cleanedMajor);
  const stageInfo = gradeToStage(cleanedGrade);

  // 从当前阶段起构建路线（无年级则给完整 6 阶段）
  const startIdx = cleanedGrade ? STAGE_ORDER.indexOf(stageInfo.stage) : 0;
  const full = STAGE_ROADMAP[track.key];
  let roadmap = full.slice(startIdx);
  // 保证至少从当前阶段起有路线
  if (roadmap.length === 0) roadmap = full;
  // 当前阶段 step
  const currentStep = full.find((s) => s.stage === (cleanedGrade ? stageInfo.stage : 'foundation')) || full[0];

  const needsMoreInfo = !cleanedMajor || !cleanedGrade;

  // summary：解释当前处境 + 方向 + 下一步
  let summary = '';
  if (!cleanedMajor && !cleanedGrade) {
    if (track.matched && direction) {
      summary = `你说了想往「${track.label}」走，还差专业和年级。告诉我专业和年级，我就能把路线切到你的档位；先给你一条「${track.label}」的完整成长路线做参照。`;
    } else if (track.matched) {
      summary = `我按你的情况先给了「${track.label}」这条路线做参照。要更准，告诉我你的专业和年级，我把路线切到你的档位。`;
    } else {
      summary = '告诉我你的专业和年级，我就能把路线切到你的档位。目前先给你一条软件开发方向的完整成长路线做参照（你要是别的方向，我随时换）。';
    }
  } else {
    const stageText = cleanedGrade ? `你大概在「${stageInfo.label}」` : '你还没告诉我年级';
    const dirText = track.matched ? `按你的情况，建议把方向定在「${track.label}」` : '你没给方向，我先按「软件开发」这个最大去向给你路线';
    const nextText = currentStep.nextHint;
    summary = `${stageText}。${dirText}。这一阶段的核心是：${currentStep.focus} 接下来：${nextText}`;
    if (skills) {
      summary += `（你提到的「${skills}」可以对应到路线里的动作，做完事即成。）`;
    }
  }

  return {
    input: [major, grade, direction, skills].filter(Boolean).join(' / '),
    matchedMajor: cleanedMajor || undefined,
    majorCategory: majorCategory || undefined,
    trackKey: track.key,
    trackLabel: track.label,
    jobDirections: TRACK_META[track.key].jobDirections,
    currentStageLabel: cleanedGrade ? stageInfo.label : '（未确认）待你补全年级后定位',
    roadmap,
    summary,
    needsMoreInfo,
  };
}

/** 供前端学习/下拉：列出全部方向及岗位方向 */
export function listTracks(): { key: CareerTrackKey; label: string; jobDirections: string[] }[] {
  return (Object.keys(TRACK_META) as CareerTrackKey[]).map((key) => ({
    key,
    label: TRACK_META[key].label,
    jobDirections: TRACK_META[key].jobDirections,
  }));
}
