// 职途星面试行业雷达 · B1
// 核心命题：学生提前知道「我会被问什么」。很多学生海投却在面试时被问懵，
// 不是能力不行，而是不知道目标行业/公司会从哪些角度考察自己。
// 本引擎按「行业 → 考察重点 → 典型问题 → 潜台词 → 准备建议」拆解，
// 让学生能提前瞄准，而不是临时抱佛脚。
//
// 判断力 ≠ 打分：输出「解释 + 路径 + 建议」，学生知道自己该补哪、会踩哪些坑。
// 纯本地 heuristic 知识底座，不调模型，零模型成本。
//
// 用法：interviewRadar(industry?, major?) → InterviewRadarReport

export interface RadarFocusItem {
  /** 考察模块名，如 专业知识 / 项目实操 / 行为面 */
  module: string;
  /** 该模块在面试中的权重占比（0-100） */
  weight: number;
  /** 该模块会怎么被考察 */
  how: string;
  /** 该模块的典型问题 */
  questions: string[];
}

export interface RadarQuestion {
  /** 问题原文 */
  question: string;
  /** 这道题背后的潜台词/考察点 */
  subtext: string;
  /** 回答该题的建议要点 */
  tip: string;
}

export interface IndustryRadar {
  /** 行业 key */
  key: string;
  /** 行业中文名 */
  label: string;
  /** 一句话行业画像 */
  blurb: string;
  /** 考察重点（按权重降序） */
  focus: RadarFocusItem[];
  /** 高频问题 + 潜台词 */
  questions: RadarQuestion[];
  /** 该行业面试的「红线/雷区」 */
  redFlags: string[];
  /** 面向该行业学生的准备建议 */
  prepTips: string[];
}

export interface InterviewRadarReport {
  input: string;
  matchedIndustry: string;
  matchedKey: string;
  /** 是否需要追问行业（输入无法判断时） */
  needsMoreInfo?: boolean;
  /** 雷达主体 */
  radar: IndustryRadar;
  /** 针对专业的个性化准备建议 */
  majorImplication?: string;
  /** 一句话结论 */
  summary: string;
}

/**
 * 行业雷达知识底座。
 * key 用于匹配与索引，label 是展示名。
 * 覆盖桂电学生主要会投递的行业方向。
 */
export const ALL_INDUSTRY_RADAR: IndustryRadar[] = [
  {
    key: 'software',
    label: '互联网/软件开发',
    blurb: '看重「能不能独立解决问题」+「工程素养」，考的是基本功和项目实作，不是八股背诵。',
    focus: [
      {
        module: '编程/算法基础',
        weight: 40,
        how: '出编码题、问数据结构和算法复杂度，考察能否写出能跑的代码、边界处理是否严谨。',
        questions: ['手写一道算法题并讲思路', '这个 list 你为什么会用这个结构', '如何优化这段代码的性能'],
      },
      {
        module: '项目/实习实作',
        weight: 30,
        how: '深挖简历里的项目，看你是否真的做过、能否讲清技术选型和踩坑。',
        questions: ['这个项目你做了哪部分', '上线后遇到的最大问题是什么', '如果重做你会怎么改'],
      },
      {
        module: '业务理解/沟通',
        weight: 15,
        how: '考察你能否从程序思维理解业务需求，以及团队协作表达。',
        questions: ['你怎么和产品对齐需求', '如果需求经常变怎么办', '如何向非技术同事解释你的方案'],
      },
      {
        module: '学习能力/潜力',
        weight: 15,
        how: '抛出新技术或系统设计题，看学习曲线和思维模型。',
        questions: ['看你没接触过XX，给你10分钟你怎么上手', '设计一个高并发场景的方案'],
      },
    ],
    questions: [
      { question: '你最有成就感的一个项目是什么？', subtext: '看你是否真的主导过、能否量化价值。', tip: '用 STAR 讲清背景-任务-动作-结果，突出可核算的数据。' },
      { question: '你这个功能为什么这么设计？', subtext: '考设计取舍，而非背方案。', tip: '讲清约束+权衡，别只背最优解。' },
      { question: '线上出故障你怎么排查？', subtext: '看排障思路和冷静度。', tip: '从现象→定位→修复→复盘讲完整链路。' },
    ],
    redFlags: ['简历项目一问三不知', '只会背八股说不会实战', '把团队成果说成自己独立完成'],
    prepTips: ['把项目里的数据量化成可核查结果', '复习核心数据结构与算法', '准备1-2个能讲深的项目做主打'],
  },
  {
    key: 'semiconductor',
    label: '电子/半导体/芯片',
    blurb: '桂电主场。看中的是「硬功底」——电路、信号、器件这些必修核心，考察是否真扎实。',
    focus: [
      {
        module: '专业硬知识',
        weight: 45,
        how: '问电路原理、信号与系统、数模电、器件物理，考察专业地基。',
        questions: ['解释一下这个电路工作原理', 'MOS 管和三极管的区别', '如何设计一个稳压电路'],
      },
      {
        module: '工具/动手',
        weight: 25,
        how: '问画板、仿真、示波器、版图等实际操作。',
        questions: ['你用EDA画过什么板子', '遇到信号失真你怎么查', '做过哪些调试的经历'],
      },
      {
        module: '项目/竞赛',
        weight: 20,
        how: '深挖学科竞赛、课程设计、毕设，看完整度与解决真问题的能力。',
        questions: ['这个设计解决了什么实际问题', '你在团队里负责哪块', '哪一步最难、怎么突破'],
      },
      {
        module: '岗位匹配度',
        weight: 10,
        how: '看专业与岗位方向是否对口、是否愿意长期深耕。',
        questions: ['你对芯片/嵌入式这个方向怎么看', '为什么选我们行业'],
      },
    ],
    questions: [
      { question: '你做过最复杂的一个电路设计是什么？', subtext: '验证动手深度与独立解决问题能力。', tip: '讲清设计目标→关键选型→遇到的坑→最终参数。' },
      { question: '你专业核心课哪门最弱？', subtext: '看自我认知真实度，是否避重就轻。', tip: '坦诚加补强计划，别编造。' },
      { question: '你愿意从基础岗位做起吗？', subtext: '测稳定性和投入度。', tip: '表达长期深耕意愿，结合行业前景。' },
    ],
    redFlags: ['核心专业课一问即溃', '项目里没有数据支撑', '把团队作品说成自己独立设计'],
    prepTips: ['重点复习数模电、信号、电路，这是本行业地基', '准备1个完整项目能讲清参数与调试', '可考相关证书/竞赛作为背书'],
  },
  {
    key: 'automotive',
    label: '汽车/新能源车',
    blurb: '三电、整车、工艺是关键词，新能源赛道更看重电子/软件+制造的复合背景。',
    focus: [
      {
        module: '整车/三电知识',
        weight: 35,
        how: '问电动化（电池/电机/电控）、底盘、智能座舱等，考察对整个产业的理解。',
        questions: ['解释一下三电系统', '电池热管理怎么设计', '你了解整车开发流程吗'],
      },
      {
        module: '工艺/制造',
        weight: 25,
        how: '问产线、工艺、质量、零部件，适合偏制造方向。',
        questions: ['一个工件的工艺流程图', '如何做质量管控', '你了解哪些制造工艺'],
      },
      {
        module: '电子/软件能力',
        weight: 25,
        how: '问嵌入式、控制、软件，适合偏智驾/座舱/电子方向。',
        questions: ['CAN 总线通信原理', '你做过哪些单片机/嵌入式项目', '自动驾驶的感知-决策链路'],
      },
      {
        module: '项目/实习',
        weight: 15,
        how: '看是否有车企/零部件企业相关项目或实习。',
        questions: ['你做过哪些汽车相关项目', '你在实习里解决过什么问题'],
      },
    ],
    questions: [
      { question: '你对新能源车行业怎么看？', subtext: '考察行业认知与真实兴趣。', tip: '结合产业链、政策、竞争格局谈，别只喊口号。' },
      { question: '你接触过整车或零部件哪个环节？', subtext: '判断你是否真的了解，还是纸上谈兵。', tip: '讲你亲身接触过的环节，突出细节。' },
      { question: '质量出了问题你怎么办？', subtext: '考问题解决与责任意识。', tip: '从排查→根因→纠正→预防讲闭环。' },
    ],
    redFlags: ['对行业只有口号没有认知', '三电/工艺一问三不知', '无相关经历却硬凹'],
    prepTips: ['补三电/整车/工艺的结构化知识', '了解主流新能源车企与技术路线', '有相关课程设计/竞赛可重点准备'],
  },

  {
    key: 'finance',
    label: '金融/银行/证券',
    blurb: '看重专业硬知识 + 合规风险意识 + 抗压力，面试常考宏微观和市场敏感度。',
    focus: [
      {
        module: '专业金融知识',
        weight: 40,
        how: '问宏微观、公司理财、会计、股票/债券，考察金融基本功。',
        questions: ['解释一下复利与现值', '宏观经济如何影响股市', '你如何给一家公司估值'],
      },
      {
        module: '数据/工具',
        weight: 25,
        how: '问 Excel、Python、Wind/同花顺等工具和数据能力。',
        questions: ['你用什么工具做数据分析', '如何做财务比率分析', '给你一份财报你怎么看'],
      },
      {
        module: '合规风控',
        weight: 20,
        how: '考察风险意识、合规底线、职业道德。',
        questions: ['遇到客户要求违规操作怎么办', '你如何控制投资风险', '说说你了解的反洗钱'],
      },
      {
        module: '行为/抗压',
        weight: 15,
        how: '金融行业压力大，考察稳定性与抗压。',
        questions: ['你能接受加班和业绩压力吗', '你如何应对客户投诉'],
      },
    ],
    questions: [
      { question: '你对我们公司/岗位了解多少？', subtext: '考察是否做足了功课，还是海投。', tip: '提前研究公司业务、产品、近期动作。' },
      { question: '你怎么判断一只股票值不值得投？', subtext: '看分析框架而非标准答案。', tip: '从基本面+估值+风险讲逻辑。' },
      { question: '最近关注的经济热点是什么？', subtext: '看日常积累与市场敏感度。', tip: '说1-2个并讲清对你/行业的影响。' },
    ],
    redFlags: ['对行业一知半解就来面', '合规意识弱、答非所问', '把风险说得轻描淡写'],
    prepTips: ['补宏微观、金融工具、财报分析基本功', '关注近期市场热点', '强调合规底线与抗压心态'],
  },
  {
    key: 'hr',
    label: '人力资源/HR',
    blurb: '桂电学生常投的职能岗。看重「人性洞察 + 沟通 + 流程管理」，面试本身就是一场考察。',
    focus: [
      {
        module: 'HR专业/流程',
        weight: 35,
        how: '问招聘、培训、绩效、薪酬、员工关系等HR六大模块。',
        questions: ['招聘一个岗位的完整流程', '如何做绩效评估', '员工流失率高怎么办'],
      },
      {
        module: '沟通/洞察',
        weight: 30,
        how: '考察共情、倾听、说服、识别候选人素质的能力。',
        questions: ['你如何判断一个人是否适合岗位', '遇到难沟通的部门怎么协调', '你怎么看00后的管理'],
      },
      {
        module: '数据/工具',
        weight: 20,
        how: '问 Excel、HR系统、数据分析、人才画像等。',
        questions: ['如何用数据做招聘分析', '你会用哪些人才测评工具'],
      },
      {
        module: '行为/价值观',
        weight: 15,
        how: 'HR本身要守职业操守，考察公平意识与同理心。',
        questions: ['你如何处理员工隐私', '你会为员工争取权益吗'],
      },
    ],
    questions: [
      { question: '你为什么要做HR？', subtext: '看是否有真实动机，还是随便投的。', tip: '结合性格与助人意愿，讲真实理由。' },
      { question: '你怎么留住一个想走的优秀员工？', subtext: '考HR的解决的全局观。', tip: '从了解诉求→对症→留人通道讲。' },
      { question: '你怎么看待公平？', subtext: 'HR的价值观试金石。', tip: '强调制度+透明+尊重个体。' },
    ],
    redFlags: ['对HR六大模块无概念', '缺乏同理心和沟通技巧', '把HR当轻松岗位，无价值理解'],
    prepTips: ['系统了解HR六大模块', '练好听与说的沟通表达', '准备1个与人打交道的真实经历'],
  },
  {
    key: 'ecommerce',
    label: '电商/新媒体/运营',
    blurb: '看重「结果导向 + 数据敏感 + 用户洞察」，注重你是否能带来增长。',
    focus: [
      {
        module: '运营/增长',
        weight: 40,
        how: '问拉新、留存、转化、活动、内容运营，考察增长逻辑。',
        questions: ['一个新品你怎么做冷启动', '如何提升复购率', '做过哪些运营项目'],
      },
      {
        module: '数据/分析',
        weight: 25,
        how: '问数据指标、漏斗、A/B测试、GMV等。',
        questions: ['你关注哪些核心数据指标', '如何判断一次活动成功', '给你数据你会怎么分析'],
      },
      {
        module: '内容/创意',
        weight: 20,
        how: '问文案、选题、短视频、直播、内容爆款。',
        questions: ['你写过哪些引流内容', '一个选题你怎么定', '你了解哪些平台规则'],
      },
      {
        module: '市场/用户',
        weight: 15,
        how: '考察用户画像、竞品、营销策略。',
        questions: ['你怎么定位目标用户', '这个竞品你如何应对'],
      },
    ],
    questions: [
      { question: '你有没有自己运营过账号？', subtext: '看是否真的动手，还是理论派。', tip: '讲真实运营数据与复盘。' },
      { question: '一个数据下滑你怎么分析？', subtext: '考数据归因与决策。', tip: '从维度拆解→定位根因→行动。' },
      { question: '你对内容创作怎么看？', subtext: '看创意思维与网感。', tip: '结合案例讲你理解的好内容逻辑。' },
    ],
    redFlags: ['只讲理论无实操数据', '不懂数据指标', '内容空洞、缺乏网感'],
    prepTips: ['自己动手运营1个渠道积累数据', '学常见运营指标与漏斗', '关注平台规则与热点玩法'],
  },
  {
    key: 'data',
    label: '数据分析/BI',
    blurb: '看重「从数据找问题、给决策」的能力，工具是手段，业务洞察才是核心。',
    focus: [
      {
        module: '工具/技术',
        weight: 35,
        how: '问 SQL、Python、Excel、BI可视化、统计基础。',
        questions: ['写个SQL做数据筛选', '你会哪些数据清洗', '用BI做过什么看板'],
      },
      {
        module: '业务洞察',
        weight: 35,
        how: '考能否把数据转成业务判断与建议，而非只做表。',
        questions: ['这份数据的结论是什么', '你如何判断一个指标异常', '给业务方一个你建议的动作'],
      },
      {
        module: '统计/模型',
        weight: 20,
        how: '问统计概念、AB测试、简单建模。',
        questions: ['解释一下置信区间', '你怎么做AB测试', '用回归做过什么预测'],
      },
      {
        module: '表达/协作',
        weight: 10,
        how: '能否把复杂数据讲给非技术的人。',
        questions: ['你怎么做一次数据汇报', '如何说服业务采纳你的建议'],
      },
    ],
    questions: [
      { question: '讲一个你做过最能代表能力的数据项目', subtext: '验证真实深度与业务价值。', tip: '用 问题-方法-结论-动作 讲。' },
      { question: '指标和维度怎么区分？', subtext: '考基础概念是否清晰。', tip: '用例子讲清，别背定义。' },
      { question: '数据和分析结论冲突怎么办？', subtext: '考数据诚信与坚持。', tip: '以数据为准，但讲清口径与局限。' },
    ],
    redFlags: ['只懂工具不懂业务', '编造数据结论', '说不清数据背后的业务含义'],
    prepTips: ['扎实练 SQL + Python 数据分析', '多看业务归因案例', '准备1个能讲业务价值的数据项目'],
  },
  {
    key: 'manufacturing',
    label: '制造/智能制造/机械',
    blurb: '看重「工艺、质量、现场改善」，桂电机械类对口，注重动手与精益。',
    focus: [
      {
        module: '工艺/专业知识',
        weight: 40,
        how: '问机械设计、材料、工艺、公差、CAM/CNC等。',
        questions: ['解释一下这个零件的加工工艺', '公差和配合怎么考虑', '你了解哪些材料'],
      },
      {
        module: '质量/改善',
        weight: 25,
        how: '问QC、六西格玛、精益、现场管理。',
        questions: ['你怎么做质量管控', '一个良率问题怎么排查', '你了解精益生产吗'],
      },
      {
        module: '项目/动手',
        weight: 25,
        how: '问课程设计、竞赛、实习里的制造项目。',
        questions: ['你做过哪些机械/结构设计', '你的设计解决什么问题', '用CAD/三维软件做过什么'],
      },
      {
        module: '稳定性/心态',
        weight: 10,
        how: '制造业偏现场，考察是否愿意扎根一线。',
        questions: ['你愿意下车间/倒班吗', '你的职业规划是什么'],
      },
    ],
    questions: [
      { question: '你实习/项目里最难的工艺问题是什么？', subtext: '验证是否真在现场解决过问题。', tip: '讲清背景→分析→改善→效果。' },
      { question: '你对产线优化有什么想法？', subtext: '看工程思维与改善意识。', tip: '结合精益/自动化讲可行性方案。' },
      { question: '你能适应工厂环境吗？', subtext: '测稳定性和吃苦意愿。', tip: '坦露真实心态，别勉强许诺。' },
    ],
    redFlags: ['不懂工艺绘图、材料', '只讲理论无现场经验', '对工厂环境排斥却硬投'],
    prepTips: ['熟悉机械设计/材料/工艺图纸', '了解QC与精益基础', '有实习/竞赛项目重点讲'],
  },
];

/** 行业关键词 → 匹配用别名表，用于识别用户输入的行业 */
const INDUSTRY_ALIASES: Record<string, string[]> = {
  software: ['互联网', '软件', '开发', '程序员', '前端', '后端', 'java', 'python', '代码', 'it', '工程师'],
  semiconductor: ['电子', '半导体', '芯片', '集成电路', 'ic', '嵌入式', '硬件', '器件', '电路', '微电子'],
  automotive: ['汽车', '新能源车', '整车', '三电', '智能座舱', '自动驾驶', '汽配'],
  finance: ['金融', '银行', '证券', '投行', '保险', '理财', '基金', '券商'],
  hr: ['人力', 'hr', '招聘', '人事', '行政', '人力资源'],
  ecommerce: ['电商', '新媒体', '运营', '直播', '短视频', '内容', '市场', '营销'],
  data: ['数据', 'bi', '分析', '数据科学', '数据仓库'],
  manufacturing: ['制造', '机械', '智能制造', '工艺', '质量', '自动化', '机械设计', '机电'],
};

/** 专业 → 推荐行业的映射，用于生成个性化准备建议 */
const MAJOR_INDUSTRY_HINTS: Record<string, string[]> = {
  '计算机': ['software', 'data', 'semiconductor'],
  '软件': ['software', 'data'],
  '通信': ['software', 'semiconductor'],
  '电子': ['semiconductor', 'software', 'automotive'],
  '微电子': ['semiconductor'],
  '集成电路': ['semiconductor'],
  '机械': ['manufacturing', 'automotive'],
  '机电': ['manufacturing', 'automotive', 'semiconductor'],
  '车辆': ['automotive', 'manufacturing'],
  '金融': ['finance'],
  '会计': ['finance', 'hr'],
  '财务': ['finance', 'hr'],
  '人力': ['hr'],
  '工商': ['hr', 'ecommerce', 'finance'],
  '市营': ['ecommerce', 'hr'],
  '物流': ['ecommerce', 'manufacturing'],
  '电子商务': ['ecommerce'],
  '新媒体': ['ecommerce'],
  '数据': ['data', 'ecommerce'],
  '统计': ['data', 'finance'],
  '信管': ['data', 'ecommerce', 'finance'],
};

/** 识别行业 key */
function detectIndustryKey(input: string): { key: string | null; label: string | null } {
  const text = (input || '').toLowerCase();
  for (const key of Object.keys(INDUSTRY_ALIASES)) {
    for (const alias of INDUSTRY_ALIASES[key]) {
      if (text.includes(alias.toLowerCase())) {
        const radar = ALL_INDUSTRY_RADAR.find((r) => r.key === key);
        return { key, label: radar ? radar.label : alias };
      }
    }
  }
  return { key: null, label: null };
}

/** 根据专业生成推荐行业 + 一句话建议 */
function buildMajorImplication(major: string): { industryKeys: string[]; text: string } | undefined {
  if (!major) return undefined;
  for (const m of Object.keys(MAJOR_INDUSTRY_HINTS)) {
    if (major.includes(m)) {
      const keys = MAJOR_INDUSTRY_HINTS[m];
      const labels = keys
        .map((k) => ALL_INDUSTRY_RADAR.find((r) => r.key === k)?.label)
        .filter(Boolean);
      return {
        industryKeys: keys,
        text: `你的专业「${major}」更对口${labels.join('、')}，这些行业的面试，可以优先按雷达做针对性准备。`,
      };
    }
  }
  return undefined;
}

function buildSummary(radar: IndustryRadar, matchedMajor: string): string {
  const topFocus = radar.focus.slice(0, 2).map((f) => `${f.module}(${f.weight}%)`).join('、');
  return `你投「${radar.label}」方向，面试会重点考察 ${topFocus}。建议按雷达拆解，提前补齐短板、避开雷区${matchedMajor ? '，结合你的专业做个性化准备' : ''}。`;
}

/**
 * 面试行业雷达主引擎 · B1
 * @param industry 行业/岗位方向（可选，缺失则返回 needsMoreInfo）
 * @param major 学生专业（可选，用于个性化建议）
 */
export function interviewRadar(industry?: string, major?: string): InterviewRadarReport {
  const input = (industry || '').trim() || (major || '').trim() || '';

  // 若既没给行业也没给专业，追问
  if (!input) {
    return {
      input: '',
      matchedIndustry: '',
      matchedKey: '',
      needsMoreInfo: true,
      radar: ALL_INDUSTRY_RADAR[0],
      summary: '告诉我你想投的行业或你的专业，我帮你拆解这个行业面试会重点考察什么。',
    };
  }

  // 优先按行业识别
  let det = detectIndustryKey(industry || '');
  if (!det.key) {
    // 行业没识别出来，尝试用专业反推一个方向
    det = detectIndustryKey(major || '');
  }

  // 若仍无法识别具体行业，但仍给了输入（如专业），返回通用兜底并附专业建议
  const majorImplication = buildMajorImplication(major || '');

  // 若行业未直接识别，但专业能反推推荐方向，则按推荐的第一顺位行业出雷达
  if (!det.key && majorImplication && majorImplication.industryKeys.length > 0) {
    const suggestedKey = majorImplication.industryKeys[0];
    const radar = ALL_INDUSTRY_RADAR.find((r) => r.key === suggestedKey)!;
    return {
      input,
      matchedIndustry: radar.label,
      matchedKey: radar.key,
      radar,
      majorImplication: majorImplication.text,
      summary: `你没指定行业，但你的专业「${major}」对口 ${radar.label} 方向，我先按这个行业给你拆面试重点。`,
    };
  }

  // 完全无法识别时，返回通用兜底并附专业建议
  if (!det.key) {
    const radar = ALL_INDUSTRY_RADAR[0]; // 通用兜底：软件
    const fallbackRadar: IndustryRadar = {
      ...radar,
      label: '通用面试',
      blurb: '暂未识别到具体行业，以下给出通用面试考察框架，可结合你的目标岗位继续细化。',
    };
    return {
      input,
      matchedIndustry: '通用',
      matchedKey: 'general',
      radar: fallbackRadar,
      majorImplication: majorImplication?.text,
      summary: majorImplication?.text || '我暂未识别出具体行业，通用面试框架供你参考；请告诉我更明确的目标行业，我给你更精准的拆解。',
    };
  }

  const radar = ALL_INDUSTRY_RADAR.find((r) => r.key === det.key)!;
  return {
    input,
    matchedIndustry: det.label || '',
    matchedKey: det.key,
    radar,
    majorImplication: majorImplication?.text,
    summary: buildSummary(radar, major || ''),
  };
}

/** 输出：按行业列出全部可查询方向（供前端选择/展示） */
export function listIndustryRadars(): { key: string; label: string; blurb: string }[] {
  return ALL_INDUSTRY_RADAR.map((r) => ({ key: r.key, label: r.label, blurb: r.blurb }));
}
