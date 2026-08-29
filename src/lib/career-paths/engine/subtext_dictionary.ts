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

  // ============ JD 黑话 增补 ============
  '吃苦耐劳': { category: 'jd', surface: '写的是「吃苦耐劳」', meaning: '多半是工作强度大、环境苦、加班多，用「吃苦」代替福利。', risk: 'medium', advice: '问清工作环境与强度，评估能否接受，别把「吃苦」当勋章。' },
  '有热情': { category: 'jd', surface: '写的是「有热情、有活力」', meaning: '往往是缺人、杂活多，或想用热情换取廉价劳动力。', risk: 'medium', advice: '问清岗位职责与团队规模，判断是否以「热情」掩盖短板。' },
  '学习能力强': { category: 'jd', surface: '写的是「学习能力强」', meaning: '暗示你可能经验不足，或公司不想给培训，要你自学扛事。', risk: 'medium', advice: '问清培训与带教机制，别让「学习」变成自己扛。' },
  '年轻有活力': { category: 'jd', surface: '写的是「年轻有活力」', meaning: '可能想用年轻人好带、能吃苦、薪资低，性价比高。', risk: 'high', advice: '问清薪酬与晋升机制，评估职业回报，别被当廉价燃料。' },
  '底薪+提成': { category: 'jd', surface: '写的是「底薪+提成」', meaning: '底薪往往很低，收入主要靠提成，销售性质强、波动大。', risk: 'medium', advice: '问清底薪构成、提成比例与结算方式，算清真实保底收入。' },
  '接受小白': { category: 'jd', surface: '写的是「接受小白、零经验」', meaning: '要么岗位门槛低、竞争激烈，要么培训流于形式、易流失。', risk: 'medium', advice: '问清带教与培训内容，评估是否真能学到东西、有成长。' },
  '综合薪资': { category: 'jd', surface: '写的是「综合薪资」', meaning: '常把提成/补贴/奖金算进「综合」，实际月薪可能低于想象。', risk: 'high', advice: '问清固定薪资与浮动占比，算清保底收入，别被「综合」带偏。' },
  '成长空间': { category: 'jd', surface: '写的是「成长空间、晋升快」', meaning: '公司小、盘子小，靠「成长」补薪酬，晋升未必真实现。', risk: 'medium', advice: '问清晋升标准与真实案例，别只听「有机会」。' },
  '氛围好': { category: 'jd', surface: '写的是「氛围好、不加班」', meaning: '可能确实轻松，也可能是没业务、将倒闭前的虚假繁荣。', risk: 'low', advice: '结合公司业务状态判断，别被「氛围」迷惑，多问实际节奏。' },
  '扁平化管理': { category: 'jd', surface: '写的是「扁平化管理」', meaning: '往往人少、没人带、直属老板拍板，职能界限模糊。', risk: 'medium', advice: '问清团队规模与汇报结构，评估能否适应无带教状态。' },
  '弹性上班': { category: 'jd', surface: '写的是「弹性上下班」', meaning: '上班弹性、下班固定加班，实际并不轻松。', risk: 'medium', advice: '问清上下班时间与加班补偿，别被「弹性」带偏。' },
  '五险一金': { category: 'jd', surface: '写的是「五险一金」', meaning: '这是基本保障，重点是问清缴纳基数与是否足额。', risk: 'low', advice: '问清缴纳基数与比例，避免「有」而「不足额」的情况。' },
  '地点灵活': { category: 'jd', surface: '写的是「地点灵活」', meaning: '可能是多地点、外派、驻场，或者没有明确办公地点。', risk: 'medium', advice: '问清常驻地点与出差安排，评估生活与通勤。' },
  '会沟通': { category: 'jd', surface: '写的是「会沟通、协调能力强」', meaning: '往往意味着要常对接、跨部门协调，甚至是销售/客服性质。', risk: 'medium', advice: '问清岗位沟通对象与对接窗口，判断是否纯沟通岗。' },

  // ============ 面试潜台词 增补 ============
  '你的职业规划': { category: 'interview', surface: '问「职业规划」', meaning: '看稳定性与上进心，判断你会不会干两年就跑。', risk: 'low', advice: '结合岗位说清短期目标与长期方向，别太空泛、别画大饼。' },
  '你做过最失败的事': { category: 'interview', surface: '问「最失败/挫折的经历」', meaning: '考察抗挫折能力与复盘意识，也是压力测试。', risk: 'medium', advice: '讲一个真实但能学到教训的事，重点放在反思与改进。' },
  '你的优势是什么': { category: 'interview', surface: '问「最大优势」', meaning: '看自我认知与岗位匹配度，考察你能否说清差异化。', risk: 'low', advice: '结合岗位核心能力说具体优势+例证，别只说「学习能力强」。' },
  '你能接受外包吗': { category: 'interview', surface: '问「接受外包/驻场」', meaning: '岗位可能是外包、驻场、稳定性差，或转正难。', risk: 'high', advice: '问清劳动关系、转正机会与项目周期，别当「备胎」。' },
  '你期望的工作环境': { category: 'interview', surface: '问「期望工作环境」', meaning: '试探你能否接受快节奏/高压/或特定氛围。', risk: 'medium', advice: '结合公司真实强度回答，别立一个太高的人设。' },
  '你有证书吗': { category: 'interview', surface: '问「相关证书」', meaning: '可能岗位有硬性资格要求，或是你专业对口的加分项。', risk: 'low', advice: '如实说明已有证书与在考状态，别夸大或编造。' },
  '你英语怎么样': { category: 'interview', surface: '问「英语水平」', meaning: '考察涉外/外企/技术文档阅读能力，判断是否满足岗位需求。', risk: 'medium', advice: '据实回答，可说明 CET/专业水平与应用场景。' },
  '你对我们产品了解吗': { category: 'interview', surface: '问「了解我们产品吗」', meaning: '考察你求职意愿与准备度，海投者往往答不出。', risk: 'medium', advice: '提前体验产品、看官网/公众号，说出1-2个真理解。' },
  '你实习经历多吗': { category: 'interview', surface: '问「实习/项目经历」', meaning: '看你的实操经验，应届可用学习经历补充。', risk: 'medium', advice: '把课程项目/比赛当实战讲，突出你能上手什么。' },
  '这个岗位可能要出差': { category: 'interview', surface: '问「接受出差吗」', meaning: '提前告知出差是常态，或问你能否适应外派。', risk: 'medium', advice: '问清出差频率与地点，评估后诚实回答。' },
  '你的性格内向吗': { category: 'interview', surface: '问「性格/内向与否」', meaning: '判断你适不适合对外沟通、团队协作岗位。', risk: 'low', advice: '诚实说清性格与岗位匹配，内向不是缺点，关键看适配。' },

  // ============ 简历潜台词 增补 ============
  '主导': { category: 'resume', surface: '简历写「主导XX」', meaning: 'HR 会追问你主导到什么程度，是否有自主决策。', risk: 'medium', advice: '用决策权+结果说明主导范围，别把「参与」写成「主导」。' },
  '了解': { category: 'resume', surface: '简历写「了解/熟悉XX」', meaning: 'HR 会把「了解」当「初级」，怀疑你深度不够。', risk: 'medium', advice: '把「了解」改写为具体能用它解决什么问题。' },
  '掌握': { category: 'resume', surface: '简历写「掌握XX」', meaning: '考察你是否真能实操，还是停留在理论课。', risk: 'medium', advice: '用项目/作品证明掌握深度，别空谈「掌握」。' },
  '熟练': { category: 'resume', surface: '简历写「熟练使用XX」', meaning: 'HR 会较真到底多熟，是否过了初级门槛。', risk: 'medium', advice: '给出使用时长/作品/场景，量化为「能独立完成X」。' },
  '良好': { category: 'resume', surface: '简历写「XX能力良好」', meaning: '模糊表述，HR 会质疑你到底多好，难量化。', risk: 'medium', advice: '把「良好」换成具体成果或达成标准。' },
  '有较强的': { category: 'resume', surface: '简历写「有较强XX能力」', meaning: '空泛形容词，HR 会觉得没实证、缺亮点。', risk: 'medium', advice: '补充可验证的业绩或案例支撑，别只堆形容词。' },
  '获奖经历': { category: 'resume', surface: '简历写「获XX奖」', meaning: 'HR 看奖项含金量与是否与岗位相关。', risk: 'low', advice: '注明奖项级别与获奖人数，别只列名字。' },
  '学生干部': { category: 'resume', surface: '简历写「曾任学生会/班干」', meaning: 'HR 会考察组织协调能力，也担心是否真对岗位有用。', risk: 'low', advice: '拆出具体组织成果，别只报职务名称。' },
  '无工作经验': { category: 'resume', surface: '简历写「暂无经验」', meaning: '应届生共性，HR 更看潜力与可培养性。', risk: 'medium', advice: '用课程项目/竞赛/实习补足，突出可迁移能力。' },

  // ============ 职场黑话 增补 ============
  '内卷': { category: 'workplace', surface: '同事说「内卷」', meaning: '竞争激烈、大家都在加班，隐性压力大。', risk: 'medium', advice: '观察团队加班与晋升节奏，评估是否适合自己。' },
  '画饼': { category: 'workplace', surface: '领导说「未来上市/做大」', meaning: '用愿景代替回报，钱和晋升未必到位。', risk: 'high', advice: '关注当下薪酬与成长，别为「饼」透支自己。' },
  '背锅': { category: 'workplace', surface: '让你做「兜底/收尾」的活', meaning: '责任边界模糊，出问题往往找你。', risk: 'high', advice: '明确职责边界，重要事项留痕，别口头扛责。' },
  '抓大放小': { category: 'workplace', surface: '领导说「抓重点」', meaning: '可能人手不足、要你自己权衡，或让你忽略细节。', risk: 'medium', advice: '问清优先级与验收标准，别自己猜。' },
  '向上管理': { category: 'workplace', surface: '同事说「要向上管理」', meaning: '暗示老板决策依赖下属推动，职场政治较重。', risk: 'medium', advice: '了解团队汇报风格，学会主动同步，别闷头干活。' },
  '兄弟团队': { category: 'workplace', surface: '领导说「我们是兄弟」', meaning: '用感情代替制度，可能是要你无边界付出。', risk: 'medium', advice: '看制度与合同，别被「兄弟」绑定。' },
  '忠诚度': { category: 'workplace', surface: '领导强调「忠诚」', meaning: '可能希望员工稳定安分、别跳槽，重视服从。', risk: 'medium', advice: '了解真实回报与成长，别只谈忠诚不谈报酬。' },
  '稳定性好': { category: 'jd', surface: '写的是「稳定性好、能长期」', meaning: '担心你频繁跳槽，希望安分稳扎，接纳度要打问号。', risk: 'medium', advice: '想清楚自己是否愿意长待，别为「稳定」接受廉价。' },
  '具备一定基础': { category: 'jd', surface: '写的是「具备一定基础即可」', meaning: '门槛不高，可能偏执行/重复性，成长空间有限。', risk: 'low', advice: '判断是否值得长期深耕，别只图入行先做。' },
  '你住哪里': { category: 'interview', surface: '问「你住哪里/通勤多久」', meaning: '常是考察稳定性，或聊家常般试探你的生活状态。', risk: 'low', advice: '如实简单回答即可，不必过度展开，留意是不是在评估离职风险。' },
  '和你说实话': { category: 'interview', surface: '面试官说「和你说实话」', meaning: '往往接下来要坦白短板或压价，先做预期管理。', risk: 'medium', advice: '认真听完，若涉及薪资别退让太狠，结合自身底线判断。' },
  '你为什么离职': { category: 'interview', surface: '问「为什么从上家离职」', meaning: '考察跳槽动机、稳定性与倾向，判断是否会重蹈覆辙。', risk: 'medium', advice: '说客观+成长向原因，别抱怨前司，给出你的选择逻辑。' },
  '我们节奏快': { category: 'interview', surface: '说「我们节奏很快」', meaning: '提前暗示高强度、加班多，要你做好心理准备。', risk: 'medium', advice: '确认团队规模与加班规律，衡量体能与精力能否承受。' },
  '参加过很多活动': { category: 'resume', surface: '简历写「参加过很多活动」', meaning: '泛泛不聚焦，HR 看不出你能力和岗位的匹配点。', risk: 'medium', advice: '挑1-2个跟岗位相关的活动，用结果和数据写具体。' },
  '熟悉Office': { category: 'resume', surface: '简历写「熟悉Office」', meaning: '泛化且低门槛，几乎等于没说，体现不出差异化。', risk: 'low', advice: '改成具体技能（如透视表/宏/数据分析），落到可验证。' },
  '有较强的学习能力': { category: 'resume', surface: '简历写「学习能力强」', meaning: '万金油式表述，HR 更想看能证明学习能力的证据。', risk: 'medium', advice: '用一门自学的技能、一个速成的项目来佐证，别空喊。' },
  '格局要大': { category: 'workplace', surface: '领导说「格局要大」', meaning: '常是让你别太计较回报、多做少说，先别谈钱。', risk: 'medium', advice: '该争取的合理权益还是要争取，别拿「格局」自我绑架。' },
  '今年很关键': { category: 'workplace', surface: '领导说「今年很关键」', meaning: '往往意味着业务冲刺、压力大，要你拼命顶上。', risk: 'medium', advice: '了解目标与考核，别只被「关键」带动，看实际投入产出。' },
  '先干起来': { category: 'workplace', surface: '说「先干起来再说」', meaning: '暗示快执行、别纠结细节或方案，重视速度胜过质量。', risk: 'medium', advice: '问清边界与验收标准，重要事项先对齐，避免返工。' },

  // ============ JD 黑话 增补2 ============
  '储备干部': { category: 'jd', surface: '写的是「储备干部/后备力量」', meaning: '多是基层轮岗，未来未必有管理岗，可能被当廉价储备。', risk: 'medium', advice: '问清轮岗周期、定岗方向、培养机制，别被「干部」title 忽悠。' },
  '待遇优厚': { category: 'jd', surface: '写的是「待遇优厚」', meaning: '常是吸引投递的包装，实际薪酬未必高。', risk: 'medium', advice: '问清具体薪资构成与区间，别只被「优厚」吸引。' },
  '工作压力小': { category: 'jd', surface: '写的是「工作压力小、轻松」', meaning: '可能业务萎缩、节奏慢，长期成长性存疑。', risk: 'medium', advice: '结合公司实际业务判断，别只图「轻松」透支职业发展。' },
  '复合型人才': { category: 'jd', surface: '写的是「复合型人才/多面手」', meaning: '想让你身兼数职、一人多岗，职能边界模糊。', risk: 'high', advice: '问清具体职责与工作量，别把「复合」当成无限加班的理由。' },
  '行业前景好': { category: 'jd', surface: '写的是「行业前景好」', meaning: '可能行业偏小/冷门，前景需你自行甄别。', risk: 'low', advice: '查一下行业真实规模与增长，别只听「前景」就入场。' },
  '内部晋升快': { category: 'jd', surface: '写的是「内部晋升快」', meaning: '常是画饼，晋升未必真兑现，多用于吸引应届。', risk: 'medium', advice: '问清晋升标准与真实案例，别只听「机会多」。' },
  '相关经验优先': { category: 'jd', surface: '写的是「相关经验优先」', meaning: '说明对经验不是硬性门槛，应届有可迁移能力即可尝试。', risk: 'low', advice: '把可迁移经历写突出，别因「经验优先」就放弃投递。' },

  // ============ 面试潜台词 增补2 ============
  '你什么时候能到岗': { category: 'interview', surface: '问「什么时候能到岗」', meaning: '越急着到这岗，越可能岗位缺人、要你顶上。', risk: 'medium', advice: '据实回答可到岗时间，也借机了解岗位时间压力。' },
  '你身边有同学签了吗': { category: 'interview', surface: '问「同学签了吗/还在找吗」', meaning: '对比行情、判断你可选余地，可能用来压价或试探。', risk: 'medium', advice: '如实但不必暴露太多信息，守住自己的底线与节奏。' },
  '你还有什么要补充': { category: 'interview', surface: '问「还有什么要补充的吗」', meaning: '给你最后展示或补充信息的机会，也看你的收尾表达。', risk: 'low', advice: '补一个与岗位相关的亮点或澄清，别只说「没有了」。' },
  '你能接受驻场吗': { category: 'interview', surface: '问「接受驻场/长期外派」', meaning: '可能要去客户现场，出差多、生活节奏受扰。', risk: 'medium', advice: '问清驻场周期、地点与补助，评估能否接受。' },
  '你了解我们行业吗': { category: 'interview', surface: '问「了解我们行业吗」', meaning: '考察你对行业是否做功课，是否真的想入这行。', risk: 'medium', advice: '说清行业现状与趋势、这个公司的位置，别只说「想尝试」。' },
  '你怎么看待加班': { category: 'interview', surface: '问「如何看待加班」', meaning: '判断你的工作观与期望，也是对加班预期的摸底。', risk: 'medium', advice: '表达合理配合+注重效率，别表忠也别说死。' },

  // ============ 简历潜台词 增补2 ============
  '精通': { category: 'resume', surface: '简历写「精通XX」', meaning: 'HR 最忌「精通」，会现场深挖，一不小心就露怯。', risk: 'high', advice: '能说清原理与应用场景才算「精通」，否则改用「熟练/掌握」。' },
  '相关课程': { category: 'resume', surface: '简历写「修过XX课程」', meaning: '泛泛罗列，HR 看不出你真实能力与岗位匹配。', risk: 'low', advice: '挑与岗位相关的课程+结合成果写，别整段罗列。' },
  '组织能力强': { category: 'resume', surface: '简历写「组织协调能力强」', meaning: '空泛自评，缺实证支撑，说服力打折扣。', risk: 'medium', advice: '用具体活动/项目成果证明组织能力，别只堆词。' },
  '优秀毕业生': { category: 'resume', surface: '简历写「优秀毕业生/三好学生」', meaning: 'HR 会看含金量，也可能认为偏向学术、缺实践。', risk: 'low', advice: '注明获得比例与标准，同时补充实践/项目经历。' },
  '表达能力强': { category: 'resume', surface: '简历写「表达能力好」', meaning: '泛化自评，HR 需要你当场证明。', risk: 'medium', advice: '用演讲/答辩/沟通成果佐证，别只给自己贴标签。' },

  // ============ 职场黑话 增补2 ============
  '能者多劳': { category: 'workplace', surface: '领导说「能者多劳」', meaning: '多干不一定多得，可能把活儿都压给能干的人。', risk: 'high', advice: '明确边界与回报，别让「多劳」变成「白劳」。' },
  '临时顶一下': { category: 'workplace', surface: '让你「临时顶一下/补位」', meaning: '可能有人员流失、岗位缺人，要你额外承担。', risk: 'medium', advice: '问清顶岗时长与职责，别让自己的本职被挤压。' },
  '我们是个大家庭': { category: 'workplace', surface: '领导说「我们是一个大家庭」', meaning: '用感情代替制度与回报，可能要求你无边界付出。', risk: 'medium', advice: '看薪酬与制度是否匹配，别被「家人」绑架。' },
  '以结果为导向': { category: 'workplace', surface: '领导强调「以结果为导向」', meaning: '重产出、过程可能被忽略，目标压力大。', risk: 'medium', advice: '问清考核标准与资源支持，别只管数字不管落地。' },
  '先委屈一下': { category: 'workplace', surface: '说「先委屈一下/过渡一下」', meaning: '可能是短期压价或临时安排，后续未必兑现。', risk: 'medium', advice: '问清过渡期限与后续安排，别空等「以后」。' },
  '大家都很拼': { category: 'workplace', surface: '同事说「我们都很拼」', meaning: '加班普遍、内卷重，氛围可能紧张。', risk: 'medium', advice: '了解真实工作强度与回报，评估是否适合自己。' },
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
