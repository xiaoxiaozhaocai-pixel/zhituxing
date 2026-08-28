// 职途星潜台词词条库 · B2
// 核心命题：JD、简历、面试里很多话「表面一套、背后一套」，学生看不懂就会踩坑。
// 本引擎把 JD / 面试 / 职场里的黑话与潜台词翻译成人话，并给出应对/风险提示。
// 让学生投递前、面试前、入职前都能看懂背后的真实意图。
//
// 判断力 ≠ 打分：输出「解释 + 风险 + 应对」，是知识底座，零模型成本。
//
// 用法：decodeSubtext(text) → SubtextReport

export type SubtextCategory = 'jd' | 'interview' | 'resume' | 'workplace';

export interface SubtextItem {
  /** 命中的原词/短语 */
  phrase: string;
  /** 潜台词类别 */
  category: SubtextCategory;
  /** 类别中文名 */
  categoryLabel: string;
  /** 表面意思（通常写的是什么） */
  surface: string;
  /** 真实潜台词（人话翻译） */
  meaning: string;
  /** 风险等级：low(基本无坑) / medium(要留意) / high(警惕) */
  risk: 'low' | 'medium' | 'high';
  /** 给学生的应对建议 */
  advice: string;
}

export interface SubtextReport {
  input: string;
  /** 命中的潜台词条目 */
  items: SubtextItem[];
  /** 一句话总览 */
  summary: string;
  /** 是否需要追问（无命中时给引导） */
  needsMoreInfo?: boolean;
}

/** 词条：key 为触发词，value 为词条定义 */
interface GlossaryEntry {
  category: SubtextCategory;
  surface: string;
  meaning: string;
  risk: 'low' | 'medium' | 'high';
  advice: string;
}

const CATEGORY_LABEL: Record<SubtextCategory, string> = {
  jd: 'JD 黑话',
  interview: '面试潜台词',
  resume: '简历潜台词',
  workplace: '职场黑话',
};

/**
 * 潜台词词条库。key 为匹配用触发词（含常用变体）。
 * 词条按类别组织，detect 时做子串匹配（大小写不敏感、去空白）。
 */
export const SUBTEXT_GLOSSARY: Record<string, GlossaryEntry> = {
  // ============ JD 黑话 ============
  '抗压能力强': { category: 'jd', surface: '写的是「抗压能力强」', meaning: '大概率是加班多、活重、压力大，需要身兼数职。', risk: 'high', advice: '问清加班与项目节奏、团队规模、考核方式，别盲婚哑嫁。' },
  '有激情': { category: 'jd', surface: '写的是「有激情、有冲劲」', meaning: '岗位可能缺人、偏杂活、要打鸡血，或需要高强度投入。', risk: 'medium', advice: '问清岗位核心职责与团队现状，判断是不是「画饼」招人。' },
  '弹性工作': { category: 'jd', surface: '写的是「弹性工作制」', meaning: '大概率是「弹性加班」，看似自由实则下班没准点。', risk: 'high', advice: '问清打卡与加班补偿制度，别被「弹性」忽悠。' },
  '薪资面议': { category: 'jd', surface: '写的是「薪资面议」', meaning: '通常起薪不高或浮动大，HR 想先看你期望再压价。', risk: 'medium', advice: '提前了解该岗位市场价，设好底线再谈，别被带节奏。' },
  '管培生': { category: 'jd', surface: '写的是「管培生」', meaning: '常是轮岗打杂，未来未必有管理岗，可能被当廉价劳动力。', risk: 'high', advice: '问清轮岗路径、定岗方向、培养机制，别只看title。' },
  '有责任心': { category: 'jd', surface: '写的是「有责任心」', meaning: '多半意味着要背锅、兜底、义务加班，责任边界模糊。', risk: 'medium', advice: '问清职责边界与汇报对象，别让「责任心」变成无底洞。' },
  '五年以上经验': { category: 'jd', surface: '写的是「五年以上经验」', meaning: '要么真招资深，要么是虚高门槛希望捡漏，应届别硬投空耗。', risk: 'medium', advice: '对照自身经历，若有匹配项目可投，否则转投更贴合的岗位。' },
  '发展空间大': { category: 'jd', surface: '写的是「发展空间大」', meaning: '常是公司小、平台弱、钱给不够，用「空间」补偿薪酬。', risk: 'high', advice: '查公司规模、融资、业务是否真实，别被「空间」忽悠。' },
  '团队年轻': { category: 'jd', surface: '写的是「团队年轻、氛围好」', meaning: '往往是新团队、不稳定、缺成熟带教，或是画饼。', risk: 'medium', advice: '问团队规模、成立年限、业务稳定度，判断是创业还是草台。' },
  '能出差': { category: 'jd', surface: '写的是「能出差、能适应外派」', meaning: '出差多、驻场、长期外派，可能影响生活节奏。', risk: 'medium', advice: '提前问清出差频率与地点，评估是否能接受。' },

  // ============ 面试潜台词 ============
  '你的期望薪资是多少': { category: 'interview', surface: '问「期望薪资」', meaning: '试探你的底线和市场定位，往往会压价或作参考。', risk: 'medium', advice: '先问对方预算区间，再给一个区间+底线，别先说死。' },
  '你还有什么问题': { category: 'interview', surface: '问「你还有什么想问」', meaning: '考察你是否真感兴趣、是否有准备，也是你反问的最好时机。', risk: 'low', advice: '问业务、团队、成长路径，别问福利这种后面再谈的。' },
  '为什么选择我们': { category: 'interview', surface: '问「为什么选我们」', meaning: '看你是否做足功课、是否海投，考察动机与匹配度。', risk: 'low', advice: '结合公司业务、产品、近期动作回答，别只说「贵司平台大」。' },
  '你最大的缺点': { category: 'interview', surface: '问「最大缺点」', meaning: '考察自我认知与改进意识，也是压力测试。', risk: 'medium', advice: '说一个真实但可控的缺点+正在改进的动作，别甩一句「我太拼」。' },
  '你了解我们公司吗': { category: 'interview', surface: '问「了解我们公司吗」', meaning: '很可能你面试的准备度直接暴露，别空手而来。', risk: 'low', advice: '提前研究公司业务、产品、近期动作，答出2-3个信息点。' },
  '你能不能接受加班': { category: 'interview', surface: '问「能否接受加班」', meaning: '提前告诉你加班是真常态，是在做期望管理。', risk: 'medium', advice: '坦诚表达配合+边界，别痛快表态被当廉价劳动力。' },
  '你一个人能做吗': { category: 'interview', surface: '问「你一个人能否搞定」', meaning: '可能岗位人手紧、你要独立扛雷，或借机给你加工作量。', risk: 'high', advice: '问清团队与协作资源，别把「能」签成「全包」。' },

  // ============ 简历潜台词（HR 视角看你的简历） ============
  '参与': { category: 'resume', surface: '简历写「参与XX项目」', meaning: 'HR 会怀疑你只是打杂，没主导、难量化价值。', risk: 'medium', advice: '写出具体负责的部分+可核算结果，别让「参与」变废。' },
  '负责': { category: 'resume', surface: '简历写「负责XX」', meaning: 'HR 会追问你到底负责到什么程度，是否真独当一面。', risk: 'medium', advice: '用数据+方法论讲清负责范围与产出，别泛泛而谈。' },
  '协助': { category: 'resume', surface: '简历写「协助XX」', meaning: 'HR 会认为你只是配角，价值有限，需补足个人贡献。', risk: 'medium', advice: '写明你协助的具体环节与贡献，别被「协助」弱化。' },
  '提升': { category: 'resume', surface: '简历写「提升XX%」', meaning: 'HR 会追问数据来源与真实性，编造会直接翻车。', risk: 'high', advice: '数据必须有依据，来源清晰（系统导出/账目核对），守四真。' },

  // ============ 职场黑话 ============
  '狼性文化': { category: 'workplace', surface: '公司标榜「狼性文化」', meaning: '可能是高强度竞争、淘汰制、目标导向压人。', risk: 'high', advice: '了解考核与淘汰机制，评估自己能否扛住高压。' },
  '躺平': { category: 'workplace', surface: '同事说「躺平」', meaning: '反讽内卷或工作没奔头，也可能是对现状的无奈。', risk: 'low', advice: '结合团队真实氛围判断，别被一句话带偏。' },
  '个人能力突出': { category: 'workplace', surface: '写的是「招个人能力突出」', meaning: '暗示团队弱、缺协作、你要能冲锋陷阵独当一面。', risk: 'medium', advice: '问清团队配置与跨部门协作，别当孤鸟。' },
};

/** 词条命中匹配：对输入做子串匹配，返回命中集合 */
function matchSubtext(text: string): SubtextItem[] {
  const normalized = (text || '').replace(/\s+/g, '');
  const items: SubtextItem[] = [];
  const seen = new Set<string>();

  for (const key of Object.keys(SUBTEXT_GLOSSARY)) {
    const entry = SUBTEXT_GLOSSARY[key];
    // 关键触发词做去空白匹配
    const keyNorm = key.replace(/\s+/g, '');
    if (normalized.includes(keyNorm)) {
      const phraseKey = `${key}|${entry.category}`;
      if (!seen.has(phraseKey)) {
        seen.add(phraseKey);
        items.push({
          phrase: key,
          category: entry.category,
          categoryLabel: CATEGORY_LABEL[entry.category],
          surface: entry.surface,
          meaning: entry.meaning,
          risk: entry.risk,
          advice: entry.advice,
        });
      }
    }
  }

  // 高险优先、同类聚在一起
  const order: Record<'high' | 'medium' | 'low', number> = { high: 0, medium: 1, low: 2 };
  return items.sort((a, b) => order[a.risk] - order[b.risk]);
}

function buildSummary(items: SubtextItem[]): string {
  if (items.length === 0) {
    return '这段内容里暂时没识别到典型潜台词。你可以把 JD、简历或面试问题发我，我帮你拆背后意思。';
  }
  const high = items.filter((i) => i.risk === 'high').length;
  const catSet = new Set(items.map((i) => i.categoryLabel));
  const cats = Array.from(catSet).join('、');
  const warn = high > 0 ? `其中 ${high} 处风险较高，要重点留意。` : '整体没有特别高的坑，但也要结合上下文判断。';
  return `共识别出 ${items.length} 处潜台词（${cats}）。${warn}`;
}

/**
 * 潜台词词条库主引擎 · B2
 * @param text 输入文本（JD 片段 / 简历句 / 面试问题 / 公司文化描述）
 */
export function decodeSubtext(text: string): SubtextReport {
  const cleaned = (text || '').trim();
  if (!cleaned) {
    return { input: '', items: [], needsMoreInfo: true, summary: '把你想拆的那段话发我（JD、简历、面试问题都可以），我帮你翻译成人话。' };
  }
  const items = matchSubtext(cleaned);
  return { input: cleaned, items, summary: buildSummary(items) };
}

/** 输出：按类别列出全部词条（供前端展示/学习） */
export function listSubtextGlossary(): { phrase: string; category: SubtextCategory; categoryLabel: string; meaning: string; risk: 'low' | 'medium' | 'high'; advice: string }[] {
  return Object.keys(SUBTEXT_GLOSSARY).map((key) => {
    const e = SUBTEXT_GLOSSARY[key];
    return { phrase: key, category: e.category, categoryLabel: CATEGORY_LABEL[e.category], meaning: e.meaning, risk: e.risk, advice: e.advice };
  });
}
