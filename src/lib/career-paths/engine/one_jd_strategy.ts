/**
 * C8 一岗一策 · JD反向定制策略引擎（纯规则，零LLM成本）
 *
 * 输入：目标JD文本（必填）+ 简历文本（可选）
 * 输出：三段式报告 ①JD解码 ②简历改写点 ③投递策略
 *
 * 数据底座：A3潜台词库（decodeSubtext）+ A4能力词典（analyzeCapabilityGap）
 * 定位：判断力路线——帮学生"投得准"，不做代投递（与UP求职类执行层产品差异化）
 */

import { decodeSubtext } from './subtext_dictionary';
import { analyzeCapabilityGap, CapabilityReport } from './capability_dictionary';

// ---------- 类型 ----------

export interface JdSignals {
  jobTitle: string;
  hardSkills: string[];
  yearsRequired: string | null;
  degreeRequired: string | null;
  softSignals: string[];
}

export interface RewritePoint {
  jdRequirement: string;
  rewriteAdvice: string;
  priority: 'high' | 'medium' | 'low';
}

export interface OneJdStrategyReport {
  jdTitle: string;
  decoded: {
    summary: string;
    subtextItems: Array<{
      phrase: string;
      surface: string;
      meaning: string;
      risk: 'low' | 'medium' | 'high';
      advice: string;
    }>;
    hiddenRequirements: string[];
  };
  rewrite: {
    matchScore: number;
    matchedJob: string;
    knownDictionary: boolean;
    advantages: string[];
    rewritePoints: RewritePoint[];
    gaps: Array<{ skill: string; gap: string; path: string }>;
  } | null;
  applyStrategy: {
    verdict: string;
    matchAssessment: string;
    differentiators: string[];
    timing: string;
    riskWarnings: string[];
  };
}

// ---------- JD信号提取（纯正则） ----------

const HARD_SKILL_KEYWORDS = [
  'Python', 'Java', 'C++', 'C#', 'Go', 'SQL', 'MySQL', 'PostgreSQL', 'Redis',
  'Excel', 'PPT', 'Word', 'Tableau', 'Power BI', 'SPSS', 'Stata',
  'MATLAB', 'CAD', 'SolidWorks', 'UG', 'CATIA', 'PLC', '西门子', '三菱',
  'FMEA', 'SPC', 'Minitab', '六西格玛', 'Lean', 'Figma', 'Axure',
  'React', 'Vue', 'Next.js', 'TypeScript', 'JavaScript', 'Node',
  'Linux', 'Docker', 'Kubernetes', 'Git', 'Hadoop', 'Spark', 'Hive',
  '机器学习', '深度学习', 'NLP', '大模型', 'RAG', 'Prompt', '数据分析',
  '数据挖掘', '爬虫', '北森', 'Moka', '薪事力', '飞书', '钉钉', '企业微信',
  'SAP', '用友', '金蝶', '泛微', '新媒体运营', '短视频', '直播',
  'SEO', 'SEM', '私域', '用户增长', '财务模型', '尽调', '审计',
];

const DEGREE_RULES: Array<[RegExp, string]> = [
  [/硕士(?:及以上|学历|研究生)|研究生(?:及以上|学历)/, '硕士及以上'],
  [/本科(?:及以上|学历)|全日制本科/, '本科及以上'],
  [/大专(?:及以上|学历)|专科(?:及以上|学历)/, '大专及以上'],
  [/学历不限|专业不限/, '学历不限'],
];

const SOFT_SIGNAL_RULES: Array<[RegExp, string]> = [
  [/抗压能力强|能承受(?:较大)?(?:工作)?压力|快节奏/, 'JD强调抗压——面试时问清团队真实节奏与人员流动情况'],
  [/能?适应出差|接受出差|短期出差|长期出差/, '含出差要求——问清出差频率与常驻地点'],
  [/驻场|外派/, '可能驻场/外派——确认实际工作地点与归属团队'],
  [/轮班|倒班|夜班/, '含轮班/倒班——确认班制、频率与对应补贴'],
  [/996|大小周|加班/, '出现加班相关表述——面试反问加班频率与补偿机制'],
  [/高压|高强度/, '工作强度信号——评估自身接受度，问到岗后的真实工作量'],
];

const TITLE_SUFFIX = '(?:工程师|专员|经理|主管|总监|助理|顾问|分析师|设计师|运营|产品经理|管培生|实习生|教师|编辑|记者|翻译|会计|审计|研究员|技术员|工艺员|操作工|文员|客服)';

/** 抓取残留/页面导航行：gxrc 等模板把「注册/登录\n职位\n{真实标题}\n急\n7-11K…」压进正文首部（真实JD试跑 2026-09-10 P0-1） */
const NAV_LINE_RE = /^(?:注\s*册\s*[/／|｜]\s*登\s*录|职位|急聘?|热招|顶|收藏职位|立即投递|面议|新|分享|举报|微信扫一扫|扫码(?:投递|应聘)?|薪资(?:待遇)?[:：].*|薪资(?:待遇)?|[\d.]+\s*[Kk千万Ww]?\s*[-~到至]\s*[\d.]+\s*[Kk千万Ww]?(?:元)?(?:·\s*\d{1,2}薪)?|[^|]{1,30}\|[^|]*学历)$/;

/** 章节标题行：是板块标题不是岗位名，标题提取时整行跳过（P1-4） */
const SECTION_LINE_RE = /^(?:岗位职责|工作职责|职位职责|职位描述|岗位描述|工作内容|任职要求|岗位要求|职位要求|任职资格|录用条件|福利待遇|薪资福利|薪酬福利|公司介绍|公司简介|关于我们|工作地点|工作地址|工作时间|加入我们|联系方式|晋升(?:空间|通道)|培训(?:体系|发展))/;

/** 句子性前缀：以这些词开头的行大概率是正文句不是标题行（P1-5，如「作为TI的工艺工程师…」） */
const SENTENCE_PREFIX_RE = /^(?:作为|负责|担任|我们|你|如果|期待|欢迎|亲爱的|熟悉|精通|了解|具备|熟练|能够|参与|协助)/;

function cleanTitle(s: string): string {
  return s
    .trim()
    .replace(/^【?(?:急聘|诚聘|高薪聘请|急招|招聘)】?\s*/, '')
    .replace(/[（(]\s*急(?:聘|招)?\s*[)）]\s*$/, '')
    .replace(/[（(]\s*[A-Za-z]{1,6}\d{3,8}\s*[)）]\s*$/, '');
}

function extractJobTitle(jd: string): string {
  const explicit = jd.match(/(?:岗位名称|职位名称|招聘岗位|岗位|职位)[：:]\s*([^\n，,。；;]{2,25})/);
  if (explicit) return cleanTitle(explicit[1]);

  // 标题搜索区：前10行；先剔除导航残留行与章节标题行，避免兜底/扫描抓到残留（P0-1/P1-4）
  const lines = jd.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 10)
    .filter((l) => !NAV_LINE_RE.test(l) && !SECTION_LINE_RE.test(l));
  const lineTitleRe = new RegExp('[^\\n，,。；;]{2,20}?' + TITLE_SUFFIX);
  const lineIsolatedRe = new RegExp('(?:^|[^\\n，,。；;])' + TITLE_SUFFIX + '$');

  for (const line of lines) {
    const bareLine = line.replace(/^[•·●○◆\-—–]+\s*/, '');
    // 孤词标题行通道：gxrc 模板「职位\n会计\n急」中标题独立成行（≤6字且以岗位后缀词收尾，P2-6）
    if (bareLine.length <= 6 && lineIsolatedRe.test(bareLine)) return cleanTitle(bareLine);
    const m = line.match(lineTitleRe);
    if (m && !SENTENCE_PREFIX_RE.test(bareLine)) return cleanTitle(m[0].replace(/^[•·●○◆\-—–]+\s*/, ''));
  }

  // 兜底：搜索区第一条有效行；去项目符号/序号；句子性内容不硬编标题（P1-4）
  const fallback = (lines[0] || '').replace(/^[•·●○◆\-—–]+\s*/, '').replace(/^[0-9一二三四五六七八九十]+[、.．)）]\s*/, '');
  if (!fallback || SENTENCE_PREFIX_RE.test(fallback)) return '未识别岗位';
  // 标题行常带逗号卖点尾巴（「文员，大小周，早九晚六3000」）：头部以岗位后缀词收尾时取头部
  const head = fallback.match(/^([^，,：:（(]{2,8})[，,：:（(]/);
  if (head && new RegExp(TITLE_SUFFIX + '$').test(head[1])) return cleanTitle(head[1]);
  if (fallback.length <= 20) return cleanTitle(fallback);
  const win = fallback.slice(0, 20);
  const cutIdx = Math.max(...['，', ',', '。', '；', ';', '：', ':', '（', '('].map((c) => win.lastIndexOf(c)));
  return cutIdx >= 4 ? cleanTitle(win.slice(0, cutIdx)) : '未识别岗位';
}

function extractSignals(jd: string): JdSignals {
  const lower = jd.toLowerCase();
  const hardSkills = HARD_SKILL_KEYWORDS.filter((k) => lower.includes(k.toLowerCase())).slice(0, 8);

  let yearsRequired: string | null = null;
  const ym = jd.match(/(\d)\s*[-~到至]\s*\d?\s*年(?:以上)?(?:相关)?(?:工作)?经验|(\d)\s*年(?:以上)?(?:相关)?(?:工作)?经验/);
  if (ym) yearsRequired = ym[0].replace(/相关|工作|经验/g, '').trim() + '经验';

  let degreeRequired: string | null = null;
  for (const [re, label] of DEGREE_RULES) {
    if (re.test(jd)) { degreeRequired = label; break; }
  }

  const softSignals = SOFT_SIGNAL_RULES.filter(([re]) => re.test(jd)).map(([, advice]) => advice).slice(0, 3);

  return { jobTitle: extractJobTitle(jd), hardSkills, yearsRequired, degreeRequired, softSignals };
}

// ---------- 报告合成 ----------

function computeMatchScore(cap: CapabilityReport, highRiskCount: number): number {
  let score = 55;
  score += Math.min(cap.advantages.length, 3) * 8;
  score -= Math.min(cap.gaps.length, 4) * 7;
  if (cap.known) score += 5;
  if (highRiskCount >= 2) score -= 6;
  return Math.max(30, Math.min(92, Math.round(score)));
}

function buildVerdict(score: number, opts: { hasResume: boolean; knownDict: boolean }): string {
  if (score >= 75) {
    return opts.hasResume
      ? '值得投，建议主攻——你的背景与这份JD重合度高，把简历按第②段改写点对齐后尽早投。'
      : '值得投，建议主攻——这份JD的大方向与常见优质背景重合度高，对照第①段隐性门槛自查后尽早投。';
  }
  if (score >= 60) {
    return opts.hasResume
      ? '值得投，但要补课——核心要求你能够到，先按第②段改写点补齐2-3个短板关键词再投，命中机筛概率更高。'
      : '值得投，但要补课——核心要求大方向你能够到，对照第①段隐性门槛与点名的硬技能自查短板，每项准备一个实例再投。';
  }
  if (score >= 45) {
    return opts.knownDict
      ? '谨慎投，作练手或备选——差距项偏多，除非你有强相关作品/经历可以直接证明，否则优先级放低。'
      : '谨慎投，作参考——该岗位暂缺行业词典，以上按通用四层框架评估，参考价值有限；若你有对口经历或作品，仍值得一投。';
  }
  return '不建议投入主要精力——硬性要求与目标方向重合度低，把时间花在匹配度更高的岗位上，这份留作行业情报。';
}

/**
 * 主入口：一键生成「一岗一策」报告
 * @throws jdText 过短时抛错，由调用方（API层）转 400
 */
export function buildOneJdStrategy(input: { jdText: string; resumeText?: string }): OneJdStrategyReport {
  const jdText = (input.jdText || '').trim();
  const resumeText = (input.resumeText || '').trim();

  if (jdText.length < 40) {
    throw new Error('JD文本太短（至少40字）——请贴完整的岗位职责+任职要求');
  }

  const signals = extractSignals(jdText);
  const subtextRaw = decodeSubtext(jdText);
  // JD场景过滤简历类词条：「负责/熟练/良好…」是简历场景(category='resume')，对JD用户会输出
  // 「你简历这么写会被质疑」的错位建议且挤占top5（真实JD试跑 2026-09-10 P1-2）
  const subtextItems = subtextRaw.items.filter((it) => it.category !== 'resume');
  const subtext = {
    ...subtextRaw,
    items: subtextItems,
    summary:
      subtextItems.length === subtextRaw.items.length
        ? subtextRaw.summary
        : '这份JD共解码出 ' + subtextItems.length + ' 处值得留意的表述。',
  };
  const cap = analyzeCapabilityGap({
    targetJob: signals.jobTitle,
    experience: resumeText || undefined,
  });

  // ① JD解码
  const topSubtexts = subtext.items.slice(0, 5).map((it) => ({
    phrase: it.phrase,
    surface: it.surface,
    meaning: it.meaning,
    risk: it.risk,
    advice: it.advice,
  }));
  const hiddenRequirements: string[] = [];
  if (signals.yearsRequired) hiddenRequirements.push('隐性门槛：' + signals.yearsRequired + '（应届生可用项目/实习等价经历对冲）');
  if (signals.degreeRequired && signals.degreeRequired !== '学历不限') hiddenRequirements.push('学历要求：' + signals.degreeRequired);
  if (signals.hardSkills.length) hiddenRequirements.push('JD点名的硬技能：' + signals.hardSkills.join(' / ') + '——简历里没有的，用最接近的经历关键词对齐');
  hiddenRequirements.push(...signals.softSignals.slice(0, 2));

  // ② 简历改写点（有简历才生成）
  const highRiskCount = topSubtexts.filter((it) => it.risk === 'high').length;
  let rewrite: OneJdStrategyReport['rewrite'] = null;
  if (resumeText) {
    const rewritePoints: RewritePoint[] = [];
    cap.gaps.slice(0, 3).forEach((g, i) => {
      rewritePoints.push({
        jdRequirement: g.layerLabel + '层要求「' + g.skill + '」',
        rewriteAdvice: '简历中尚缺这个关键词。补法：' + g.path + '。改写动作：把最接近的课程/项目/实习往「' + g.skill + '」上重写一句，给出可量化的产出（数字/结果/工具名）。',
        priority: i <= 1 ? 'high' : 'medium',
      });
    });
    cap.advantages.slice(0, 2).forEach((a) => {
      rewritePoints.push({
        jdRequirement: '你的优势项「' + a + '」',
        rewriteAdvice: '这条是命中项——把它前置到简历对应板块的前1/3位置，并加一句与该岗位直接相关的量化描述，让机筛和HR第一眼看到。',
        priority: 'low',
      });
    });
    rewrite = {
      matchScore: computeMatchScore(cap, highRiskCount),
      matchedJob: cap.matchedJob,
      knownDictionary: cap.known,
      advantages: cap.advantages.slice(0, 4),
      rewritePoints,
      gaps: cap.gaps.slice(0, 4).map((g) => ({ skill: g.skill, gap: g.gap, path: g.path })),
    };
  }

  // ③ 投递策略
  const differentiators: string[] = [];
  cap.advantages.slice(0, 2).forEach((a) => differentiators.push('主打「' + a + '」——这是你与典型竞争者拉开差距的点，面试自我介绍里也放进去'));
  if (signals.hardSkills.length) {
    differentiators.push('面试前把「' + signals.hardSkills.slice(0, 3).join('、') + '」各准备一个具体使用场景的故事（STAR：情境-任务-动作-结果）');
  }
  differentiators.push('投递前用小职过一遍这份JD的高风险潜台词（本报告第①段），面试反问环节直接用上，展现判断力');

  const score = rewrite ? rewrite.matchScore : computeMatchScore(cap, highRiskCount);
  const riskWarnings = topSubtexts.filter((it) => it.risk === 'high').slice(0, 3).map((it) => '「' + it.phrase + '」：' + it.meaning);

  return {
    jdTitle: signals.jobTitle,
    decoded: {
      summary: subtext.summary || '这份JD共解码出 ' + topSubtexts.length + ' 处值得留意的表述。',
      subtextItems: topSubtexts,
      hiddenRequirements: hiddenRequirements.slice(0, 5),
    },
    rewrite,
    applyStrategy: {
      verdict: buildVerdict(score, { hasResume: Boolean(resumeText), knownDict: cap.known }),
      matchAssessment: cap.known
        ? '已按「' + cap.matchedJob + '」能力词典逐层比对' + (resumeText ? '你的简历' : '（未提供简历，按通用框架评估）') + '。'
        : '「' + cap.matchedJob + '」还没进行业词典，用的是通用四层框架（行业认知/硬技能/软实力/信号项），建议补充行业+岗位名获得更准的拆解。',
      differentiators: differentiators.slice(0, 4),
      timing: '投递时机：网申开放后前3天内投（机筛压力小、HR刚启动筛简历）；工作日上午9-11点投递触达率最高；若走内推/邮箱渠道，邮件标题带「岗位名+学校+姓名」。',
      riskWarnings,
    },
  };
}
