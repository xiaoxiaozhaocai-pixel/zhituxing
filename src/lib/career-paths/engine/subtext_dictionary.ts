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

  // ============ 潜台词 增补3 ============
  '有想法': { category: 'jd', surface: '写的是「有想法、有创意」', meaning: '希望你能带来新点子，也常意味着方向缺人定、要你自己出活。', risk: 'medium', advice: '问清是否真给决策空间，还是只口头「要创意」。' },
  '独立负责': { category: 'jd', surface: '写的是「能独立负责XX」', meaning: '可能要你一人扛一个模块、无人带教，需独当一面。', risk: 'high', advice: '问清带教与协作资源，别把「独立」签成「全包」。' },
  '长期发展': { category: 'jd', surface: '写的是「可长期发展/长期合作」', meaning: '希望你稳定安分、别轻易离职，岗位重稳定性。', risk: 'low', advice: '结合薪酬与成长判断是否值得长期深耕。' },
  '你考虑创业吗': { category: 'interview', surface: '问「考虑创业吗」', meaning: '可能是缺人想用「股权/愿景」顶薪，或试探你的干劲与野心。', risk: 'medium', advice: '问清薪酬保障与发展路径，别被「合伙」模糊了报酬。' },
  '这个岗位很锻炼人': { category: 'interview', surface: '说「岗位很锻炼人」', meaning: '往往活杂事多、免不了替人顶班，用「锻炼」包装强度。', risk: 'medium', advice: '问清具体职责与带教，别把「锻炼」当成免费成长。' },
  '你会留在这座城市吗': { category: 'interview', surface: '问「会留在这座城市吗」', meaning: '多在考察稳定性与长期意向，判断你能否安心留下。', risk: 'low', advice: '如实说明意愿，若有意向可顺势表达对城市/岗位的认同。' },
  '你觉得我们公司怎么样': { category: 'interview', surface: '问「觉得我们公司怎么样」', meaning: '考察你的观察与准备度，也看你是否贴合公司氛围。', risk: 'low', advice: '结合了解到的业务/产品客观评价，别只夸不实。' },
  '具备': { category: 'resume', surface: '简历写「具备XX能力」', meaning: '自述式表述，缺具体动作与结果支撑，说服力弱。', risk: 'medium', advice: '改成「做过什么+用什么方法+拿到什么结果」，别只抛形容词。' },
  '适应能力': { category: 'resume', surface: '简历写「适应能力强」', meaning: '泛化自评，HR 需要你拿具体场景证明。', risk: 'medium', advice: '用一个快速上手新环境/新任务的例子佐证。' },
  '优化': { category: 'workplace', surface: '公司说「组织优化/人员优化」', meaning: '通常是裁员或调岗的委婉说法，需留意岗位是否受影响。', risk: 'high', advice: '问清岗位归属与变动，提前评估风险、做两手准备。' },
  '拥抱变化': { category: 'workplace', surface: '公司说「拥抱变化」', meaning: '往往业务不稳、方向频繁调整，要你能随时接新活。', risk: 'medium', advice: '问清业务稳定度与变化原因，评估长期性。' },
  '先对齐': { category: 'workplace', surface: '领导说「先对齐一下」', meaning: '往往是要统一方向/避免返工，也可能暗示此前有分歧。', risk: 'low', advice: '主动同步关键信息与预期，避免后期反复。' },

  // ============ 潜台词 增补4 ============
  '可接受应届生': { category: 'jd', surface: '写的是「可接受应届生/无经验也可」', meaning: '门槛不高，但往往薪资偏低、竞争激烈，培养空间未必大。', risk: 'medium', advice: '问清入职后带教与晋升路径，别只图「好进」低估长期价值。' },
  '岗位急招': { category: 'jd', surface: '写的是「急招/紧急招聘」', meaning: '可能是岗位突然缺人、活紧压力大，或长期招不满才放急招。', risk: 'medium', advice: '问清为何急招、团队现状与入职压力，别踩进「填坑」岗。' },
  '到岗快优先': { category: 'jd', surface: '写的是「能快速到岗者优先」', meaning: '急切要人补位，项目可能紧张，也暗示用人荒、流动大。', risk: 'medium', advice: '如实报可到岗时间，同时也问清项目强度与团队是否稳定。' },
  '你最大的成就是什么': { category: 'interview', surface: '问「你最大的成就/高光时刻」', meaning: '考察你是否有拿得出手的经历与叙事能力，也在挖你的价值取向。', risk: 'low', advice: '挑一个与岗位相关、能讲出过程和结果的成就，别只报头衔。' },
  '你投了哪些公司': { category: 'interview', surface: '问「你还投了哪些公司」', meaning: '试探你的求职结构和比较心理，也可能用来压价、判断诚意。', risk: 'medium', advice: '如实但不必全盘托出，重点表达你对本岗位的兴趣与匹配。' },
  '你的短板是什么': { category: 'interview', surface: '问「你的弱点/短板」', meaning: '压力测试，看自我认知与坦诚度，判断你是否能正视问题。', risk: 'medium', advice: '说一个真实可控的短板+正在改进的动作，别说「我太追求完美」。' },
  '你想和什么样的团队共事': { category: 'interview', surface: '问「期望的团队/工作氛围」', meaning: '考察你与现有团队风格是否契合，判断你能否融入。', risk: 'low', advice: '结合岗位真实氛围回答，别立一个明显冲突的人设。' },
  '团队合作': { category: 'resume', surface: '简历写「有团队合作精神」', meaning: '万金油式自评，HR 更想听你具体协作了什么、解决了什么。', risk: 'medium', advice: '用一个跨角色协作、共同达成的结果来佐证，别只贴标签。' },
  '沟通能力强': { category: 'resume', surface: '简历写「沟通协调能力强」', meaning: '泛化自评，HR 需要你当场用真实沟通成果证明。', risk: 'medium', advice: '举一个谈判/宣讲/跨部门推进的实例，别只给自己打分。' },
  '我在忙': { category: 'workplace', surface: '同事/领导回你「我在忙」', meaning: '可能是真忙，也可能是委婉拒绝或不想被打扰，需结合上下文。', risk: 'low', advice: '判断对方态度，重要事项改用留痕方式同步，别硬凑。' },
  '你多辛苦一下': { category: 'workplace', surface: '领导说「这段时间辛苦一下」', meaning: '委婉要求你多加班、多承担，往往缺乏对等的回报承诺。', risk: 'medium', advice: '了解是否有补偿与边界，别把「辛苦」当白做，关键成果留痕。' },
  '先放一放': { category: 'workplace', surface: '领导说「先放一放/缓一缓」', meaning: '项目优先级被调低或方向有变，你的投入可能暂时被搁置。', risk: 'low', advice: '问清原因与后续计划，别自己默默等待或重复劳动。' },

  // ============ 潜台词 增补5 ============
  '晋升通道': { category: 'jd', surface: '写的是「晋升通道明确/晋升空间大」', meaning: '可能是确有机制，也可能只是画饼，需看是否有真实标准与案例。', risk: 'medium', advice: '问清晋升标准、周期与真实案例，别只听口号就信了。' },
  '公司平台大': { category: 'jd', surface: '写的是「平台大/资源多」', meaning: '大公司分工细、能见世面，但也可能晋升慢、螺丝钉化。', risk: 'low', advice: '结合岗位是否核心来判断，别只看「平台」二字就盲目看好。' },
  '免费三餐': { category: 'jd', surface: '写的是「包三餐/免费班车/房补」', meaning: '福利能对冲部分薪资，但也要合计总包与加班是否变相抵消。', risk: 'low', advice: '把福利折算进总包对比，别被「包吃住」冲昏头。' },
  '年终奖': { category: 'jd', surface: '写的是「年底双薪/年终奖」', meaning: '年终奖往往与绩效挂钩、浮动大，不能当固定收入。', risk: 'medium', advice: '问清发放标准、基数与可能浮动范围，别按全额算预期。' },
  '你的核心竞争力是什么': { category: 'interview', surface: '问「你的核心竞争力」', meaning: '考察自我定位与差异化，判断你能否说清自己的独到价值。', risk: 'medium', advice: '结合岗位说 1-2 个能验证的差异化能力+例证，别堆形容词。' },
  '你怎么看待重复性工作': { category: 'interview', surface: '问「如何看待基础/重复性工作」', meaning: '判断你能否接受执行向、琐碎的活，考察心态。', risk: 'medium', advice: '表达能踏实打底+会主动提炼优化，别轻慢「基础活」。' },
  '你有没有想过其他方向': { category: 'interview', surface: '问「有没有考虑其他方向/职业」', meaning: '试探你求职是否坚定、是否把岗位当过渡。', risk: 'medium', advice: '坦诚表达兴趣但强调对本岗位的认同，别让面试官怀疑诚意。' },
  '你期望的发展路径是什么': { category: 'interview', surface: '问「期望的发展/晋升路径」', meaning: '考察成长规划与稳定性，判断你是否会干不久就跑。', risk: 'low', advice: '给出与岗位匹配的阶段性目标，别说得太空或太不切实际。' },
  '在校期间': { category: 'resume', surface: '简历写「在校期间」', meaning: '泛泛罗列时间线，HR 需要你聚焦具体成果，别流水账。', risk: 'low', advice: '挑与岗位相关的经历+结果写具体，砍掉无信息量描述。' },
  '有一定了解': { category: 'resume', surface: '简历写「有一定了解/了解即可」', meaning: '模糊表述，HR 会怀疑你深度不足、是否真上手过。', risk: 'medium', advice: '改成具体能做什么+一个实例，别只写「了解」。' },
  '摸鱼': { category: 'workplace', surface: '同事说「摸鱼/躺平划水」', meaning: '自嘲或反讽工作强度，也可能团队确实偏松、成长慢。', risk: 'low', advice: '结合真实节奏判断，别轻易给自己贴上「混」的标签。' },
  '内耗': { category: 'workplace', surface: '同事/领导说「内耗」', meaning: '团队协作不畅、流程低效，沟通成本高。', risk: 'medium', advice: '了解团队分工与决策流程，评估自己能否适应这种环境。' },
  '对结果负责': { category: 'workplace', surface: '领导强调「对结果负责/向上负责」', meaning: '考核导向强，过程可能被忽略，也可能忽视员工合理诉求。', risk: 'medium', advice: '问清考核指标与资源支持，别只管数字不管落地。' },

  // ============ JD 黑话 增补2 ============
  '有竞争力的薪资': { category: 'jd', surface: '写的是「薪酬有竞争力」', meaning: '常是兜底话术，未必真顶尖，要用具体区间和数据验证。', risk: 'medium', advice: '直接问清薪资区间+构成，别被「竞争力」三个字带偏。' },
  '定期团建': { category: 'jd', surface: '写的是「定期团建、员工旅游」', meaning: '常是加班文化的佐料，说明工作节奏偏紧、靠福利找补。', risk: 'low', advice: '结合业务状态判断，别把「团建多」当成「轻松」。' },
  '期权激励': { category: 'jd', surface: '写的是「期权/股权激励」', meaning: '未上市期权可能难兑现，别把期权当头薪去算收入。', risk: 'medium', advice: '问清兑现条件、行权价与上市预期，权当加分别当保底。' },
  '不加班': { category: 'jd', surface: '写的是「不加班、朝九晚五」', meaning: '明说「不加班」反而要核实，可能是变相加班或岗位确实清闲。', risk: 'medium', advice: '问清实际上下班时间、加班补偿，别只信「不加班」三个字。' },
  '快速学习': { category: 'jd', surface: '写的是「具备快速学习能力」', meaning: '可能暗示缺带教、要你自学扛活，或岗位门槛低靠学习凑。', risk: 'medium', advice: '问清培训与带教机制，别让「快速学习」变成你独自扛雷。' },

  // ============ 面试潜台词 增补2 ============
  '你有没有男女朋友': { category: 'interview', surface: '问「有没有对象/结婚没」', meaning: '窥探稳定性与生育/离职倾向，属边缘题，非工作能力考察。', risk: 'medium', advice: '可坦然回应并拉回业务，若对方持续追问，说明公司文化需警惕。' },
  '你家里是做什么的': { category: 'interview', surface: '问「家里是做什么的」', meaning: '评估你的经济压力、稳定性与求职动机，而非家庭背景本身。', risk: 'low', advice: '简洁回应，别透露过多隐私，把话题引回岗位匹配。' },
  '你愿意从基层做起吗': { category: 'interview', surface: '问「愿不愿意从基层做起」', meaning: '可能是真培养，也可能是让你干初级杂活，需区分。', risk: 'medium', advice: '问清基层的内容、轮岗路径与培养机制，别只听「从基层锻炼」。' },
  '你考虑过考研考公吗': { category: 'interview', surface: '问「有没有考研/考公打算」', meaning: '评估你的入职稳定性与长期意愿，看你是否「骑驴找马」。', risk: 'medium', advice: '明确表达就业意向与稳定性，别让对方觉得你可能中途离开。' },
  '你怎么看竞品': { category: 'interview', surface: '问「怎么看我们和竞品的关系」', meaning: '考察行业认知与表达能力，也在看你是否客观、会否踩雷。', risk: 'low', advice: '讲客观差异与优势，别去贬低竞品，给出有观点的中立判断。' },

  // ============ 简历潜台词 增补2 ============
  '有相关经验': { category: 'resume', surface: '简历写「有相关经验」', meaning: '空泛表述，HR 会追问具体做过什么、多久、参与多深。', risk: 'low', advice: '写清具体项目、角色与量化产出，别用「有经验」一带而过。' },
  '全勤': { category: 'resume', surface: '简历写「全勤/无缺勤」', meaning: '可能暗示实习无薪或含金量低，也可能只是习惯用词。', risk: 'low', advice: '作补充说明即可，别当核心亮点，重点放具体能力与结果。' },

  // ============ 职场黑话 增补2 ============
  '赋能': { category: 'workplace', surface: '公司/领导提「赋能、给你资源」', meaning: '常是让你扛更多不明确的活，或画饼补偿。', risk: 'medium', advice: '问清具体要做什么、能给什么资源支持，别被「赋能」架空。' },
  '颗粒度': { category: 'workplace', surface: '领导要「颗粒度再细一点」', meaning: '要求细节做到位，可能暗示你之前的输出太粗放。', risk: 'low', advice: '主动把方案拆细、给到可执行层级，展示专业度。' },
  '抓手': { category: 'workplace', surface: '上级说「要找抓手」', meaning: '常是没想清具体动作时的话术，别被「重要抓手」唬住。', risk: 'low', advice: '追问抓手的具体落点与衡量标准，逼出可执行方案。' },
  '闭环': { category: 'workplace', surface: '要求「形成闭环、闭环负责」', meaning: '负责到底、有始有终，警惕被单方面抗下责任。', risk: 'medium', advice: '界定你的职责范围与协作方，别把「闭环」签成全包。' },
  '落地': { category: 'workplace', surface: '要求「落地、落地执行」', meaning: '别谈虚的，要能执行出来，警惕只给压力不给资源。', risk: 'low', advice: '给出执行路径与所需资源，别只承诺结果。' },
  '主人翁精神': { category: 'workplace', surface: '强调「主人翁精神」', meaning: '暗示你要多干活、少抱怨、替公司着想，别把自己当打工的。', risk: 'medium', advice: '该争取资源/利益时明确表达，别把「主人翁」当无底线付出的借口。' },
  '待遇从优': { category: 'jd', surface: '写的是「薪资待遇从优」', meaning: '起薪往往不高，靠加班或画饼补偿，别以为是高薪。', risk: 'medium', advice: '问清具体薪资结构与试用期，别只看「从优」两字。' },
  '年轻化团队': { category: 'jd', surface: '写的是「年轻化团队」', meaning: '可能缺带教、偏扁平、要靠自己摸索成长。', risk: 'medium', advice: '问清团队规模、带教机制、业务阶段，判断是否适合起步。' },
  '高成长赛道': { category: 'jd', surface: '写的是「高成长赛道」', meaning: '行业波动大、岗位/方向随时可能调整，稳定性存疑。', risk: 'medium', advice: '查公司业务真实情况与融资阶段，别只看「赛道」概念。' },
  '有相关背景优先': { category: 'jd', surface: '写的是「有相关背景优先」', meaning: '实际更想要熟练工，应届生投递期望要放低。', risk: 'low', advice: '若有相关项目/实习经历可突出，否则优先投「接受应届」岗位。' },
  '你家里支持你吗': { category: 'interview', surface: '面试问「你家里支持吗」', meaning: '关心你的稳定性，担心你外地留不住或家里反对。', risk: 'medium', advice: '表明家人支持 + 自己确有留任意愿，打消对方顾虑。' },
  '你会在这里待多久': { category: 'interview', surface: '面试问「你会在这待多久」', meaning: '担心你把这里当跳板、过渡一下就离职。', risk: 'medium', advice: '说明你的长期规划与这里如何契合，给出留任理由。' },
  '你之前拿过offer吗': { category: 'interview', surface: '面试问「你拿过 offer 吗」', meaning: '在评估你的市场行情、是否已备好退路。', risk: 'medium', advice: '如实说但别刻意抬高，可顺势表达对本次机会的诚意。' },
  '你接受调岗吗': { category: 'interview', surface: '面试问「能接受调岗吗」', meaning: '岗位可能多方向发展、哪里缺人去哪，不确定性强。', risk: 'medium', advice: '问清调岗方向与触发条件，划清自己能接受的边界。' },
  '你的抗压能力怎么样': { category: 'interview', surface: '面试问「你抗压能力怎么样」', meaning: '大概率是加班多、任务重、压力大，提前给你打预防针。', risk: 'high', advice: '问清压力来源与加班情况，用真实经历证明抗压，别只喊口号。' },
  '具备较强的抗压能力': { category: 'resume', surface: '简历写「具备较强抗压能力」', meaning: '属于空泛套话，HR 看一眼就过，撑不起亮点。', risk: 'low', advice: '换成具体事例，比如扛过的项目强度/deadline，才真实可信。' },
  '有较强的执行力': { category: 'resume', surface: '简历写「有较强执行力」', meaning: '空泛无量化，无法证明，容易被当成凑字数。', risk: 'low', advice: '用「做了什么、结果如何」替代抽象优势，更打动人。' },
  '自我评价': { category: 'resume', surface: '简历里的「自我评价」板块', meaning: '多半是自我感动，HR 更关注经历与数据，这块容易减分。', risk: 'low', advice: '要么去掉，要么用 2-3 行真实成果/契合点代替套话。' },
  '合伙人': { category: 'workplace', surface: '公司说「你是合伙人」', meaning: '没钱多发时用「合伙人」画饼，实际没股权没话语权。', risk: 'high', advice: '问清股权/分成/决策权是否落到纸面，别只听"合伙人"三个字。' },
  '拿命拼': { category: 'workplace', surface: '领导说「这一仗要拿命拼」', meaning: '要求极度付出、极限加班，把个人生活也押上去。', risk: 'high', advice: '确认是否有对应回报与补偿，别把「拼」变成无原则内卷。' },
  '再想想': { category: 'workplace', surface: '领导说「你再想想」', meaning: '其实是婉拒/否定，要你主动揣摩真实意图。', risk: 'medium', advice: '别硬着头皮猜，直接问清楚的期望与顾虑。' },
  '你自己看着办': { category: 'workplace', surface: '领导说「你自己看着办」', meaning: '在推卸责任，出了事可能让你兜底。', risk: 'medium', advice: '把关键决策留痕、明确边界，别独自扛下全部风险。' },
  '先定个小目标': { category: 'workplace', surface: '领导说「先定个小目标」', meaning: '实际是给你压量化指标，往往不小。', risk: 'low', advice: '确认目标数字与资源，别被"小"字迷惑，反过来要资源。' },
  '走出去': { category: 'workplace', surface: '领导说「多走出去」', meaning: '让你跨部门/对外多跑，实质可能一个人干好几摊。', risk: 'low', advice: '明确协作边界与支持，别让「走出去」变成多接活。' },
  '有竞争力的福利': { category: 'jd', surface: '写的是「福利待遇优」', meaning: '常用福利（团建/零食/补贴）代替薪金，实际到手不高。', risk: 'medium', advice: '问清薪资结构与福利折算，别拿福利抵工资。' },
  '有完善的培养体系': { category: 'jd', surface: '写的是「有完善的培养体系」', meaning: '可能只是口号，实际没人带、全靠自己摸索。', risk: 'medium', advice: '问清培养的具体安排、带教人、阶段目标，验证真伪。' },
  '你英语流利吗': { category: 'interview', surface: '面试问「你英语流利吗」', meaning: '可能涉及外企/涉外业务，英语是隐性硬门槛。', risk: 'medium', advice: '如实说明水平，若有英文项目/证书可突出证明。' },
  '你平时关注什么': { category: 'interview', surface: '面试问「你平时关注什么」', meaning: '在测试你与岗位/公司价值观是否契合。', risk: 'low', advice: '结合岗位行业说点真实关注，别答得太泛或太刻意。' },
  '你之前的领导怎么评价你': { category: 'interview', surface: '面试问「前领导怎么评价你」', meaning: '在侧面评估你的协作能力与离职原因。', risk: 'medium', advice: '用具体成果+正向评价回应，别暴露负面冲突。' },
  '你了解我们竞争对手吗': { category: 'interview', surface: '面试问「了解我们对手吗」', meaning: '在考察你做过功课、有没有行业认知。', risk: 'medium', advice: '提前查清主要竞品，能说出1-2条差异会加分。' },
  '如果被拒绝你会怎么办': { category: 'interview', surface: '面试问「被拒绝怎么办」', meaning: '在测你的抗挫心态与韧性。', risk: 'low', advice: '展现理性复盘+持续改进，别答得太在意或太随性。' },
  '你把工作当事业还是职业': { category: 'interview', surface: '面试问「工作当事业还是职业」', meaning: '在判断你的投入度与稳定性预期。', risk: 'medium', advice: '既表达长期投入意愿，也说明会基于实际表现，别空喊。' },
  '注重细节': { category: 'resume', surface: '简历写「注重细节」', meaning: '空泛套话，HR 无法验证，几乎不加分。', risk: 'low', advice: '用具体事例说明你的细致（如数据校验/规范输出）。' },
  '开朗乐观': { category: 'resume', surface: '简历写「开朗乐观」', meaning: '主观性格描述，无量化支撑，等于无效信息。', risk: 'low', advice: '删掉或换成可证明的协作/应变实例。' },
  '诚实守信': { category: 'resume', surface: '简历写「诚实守信」', meaning: '最空的套话，人人都会写，无法加分。', risk: 'low', advice: '去掉，用真实经历和成果说话。' },
  '勤奋踏实': { category: 'resume', surface: '简历写「勤奋踏实」', meaning: '无量化、易被当成凑字数，撑不起差异。', risk: 'low', advice: '改成具体执行过的任务与结果，才可信。' },
  '有较好的逻辑思维能力': { category: 'resume', surface: '简历写「逻辑思维能力强」', meaning: '抽象自评，无法证明，反而显得空。', risk: 'low', advice: '用数据分析/方案推导实例来体现，而不是直接宣示。' },
  '为爱发电': { category: 'workplace', surface: '公司说「大家为爱发电」', meaning: '暗示要你免费/超低价付出，用情怀代替报酬。', risk: 'high', advice: '明确报酬与边界，别让「热爱」变成被白嫖的借口。' },
  '灵活应对': { category: 'workplace', surface: '领导说「要灵活应对」', meaning: '常让你一人多岗、随时补位，边界模糊。', risk: 'medium', advice: '明确你的岗位职责，灵活不等于无限兜底。' },
  '格局打开': { category: 'workplace', surface: '领导说「格局打开」', meaning: '常是让你别计较钱/岗位/付出，多忍让。', risk: 'medium', advice: '区分该有的权益，别让「格局」变成让步。' },
  '长期主义': { category: 'workplace', surface: '公司强调「长期主义」', meaning: '常是让你先忍、别急着要回报或提升。', risk: 'medium', advice: '确认短期有无实际可见的成长与激励，别只听口号。' },
  '战略性调整': { category: 'workplace', surface: '公司说「战略性调整」', meaning: '往往是裁员/降薪/调岗的委婉说法。', risk: 'high', advice: '立即确认自己的岗位与待遇是否会变，保留证据。' },
  '氛围轻松': { category: 'jd', surface: '写的是「氛围轻松、没有压力」', meaning: '常是工作节奏乱、没人带、或团队不稳定，用氛围当卖点。', risk: 'medium', advice: '追问具体工作内容与团队规模，判断是轻松还是没规则。' },
  '有挑战性': { category: 'jd', surface: '写的是「岗位有挑战性」', meaning: '往往是活重、复杂、压力大，或需要你一个人扛一整摊。', risk: 'medium', advice: '问清挑战具体在哪、有没有支持，别只被「成长」打动。' },
  '优秀者面议': { category: 'jd', surface: '写的是「优秀者可面议」', meaning: '薪资上限模糊，想先压低你的预期再议，也可能确实不低。', risk: 'medium', advice: '先报一个区间和底线，把「面议」变成可谈的数。' },
  '节假日福利': { category: 'jd', surface: '写的是「节假日福利、生日福利」', meaning: '若只强调小福利，往往基本薪资一般，用福利补体验。', risk: 'low', advice: '问清薪资结构和五险一金缴纳基数，别被小福利带偏。' },
  '要求稳定': { category: 'jd', surface: '写的是「要求稳定、长期发展」', meaning: '常是怕你跳槽、或岗位流动性大，也潜台词是加班多。', risk: 'medium', advice: '问清工作强度与职业发展路径，判断是「求稳」还是「拴人」。' },
  '思维活跃': { category: 'jd', surface: '写的是「思维活跃、有创意」', meaning: '往往一个人干多摊、需要持续输出想法，边界模糊。', risk: 'medium', advice: '明确职责边界，别让「活跃」变成什么都归你。' },
  '你实习学到了什么': { category: 'interview', surface: '问「实习学到什么」', meaning: '考察你实习是否真实、有没有成长，也看你是不是水过去。', risk: 'low', advice: '讲具体事情+你的主动贡献，别只说「学到了很多」。' },
  '你参加过什么社团': { category: 'interview', surface: '问「参加过什么社团」', meaning: '看你的协作、组织能力和时间管理，也侧面看性格。', risk: 'low', advice: '选1-2个你真实推动过什么的社团，讲结果不讲头衔。' },
  '你遇到过什么困难': { category: 'interview', surface: '问「遇到过什么困难」', meaning: '考察抗压和解决问题的能力，别答「没遇到过」。', risk: 'medium', advice: '讲一个具体困难+你的行动+结果，展示怎么「搞定」而非「熬过」。' },
  '你会一直留在本地吗': { category: 'interview', surface: '问「会一直留在本地吗」', meaning: '考察稳定性，怕你干不久，或有户口/长期规划考量。', risk: 'medium', advice: '给出留当地的真实理由，别只说「喜欢这里」。' },
  '你能适应加班氛围吗': { category: 'interview', surface: '问「能适应加班氛围吗」', meaning: '几乎确定要加班，只是在确认你能不能接受。', risk: 'high', advice: '先问清加班频率与补偿机制，别急着表态「能」。' },
  '你期望的工作地点': { category: 'interview', surface: '问「期望的工作地点」', meaning: '考察你对出差/驻场/异地调动的接受度。', risk: 'medium', advice: '明确你能接受的区域与前提，别模糊。' },
  '你家里会反对吗': { category: 'interview', surface: '问「家里会不会反对」', meaning: '看岗位是否偏远、出差多、或需长期外派，怕你中途走。', risk: 'medium', advice: '如实说明家支持，同时反问岗位真实的外派/轮岗要求。' },
  '认真负责': { category: 'resume', surface: '写的是「工作认真负责」', meaning: '空泛无数据，HR 看不出你具体做成了什么。', risk: 'low', advice: '改成「负责X项目，达成Y结果」，用事实替代形容词。' },
  '多次参加': { category: 'resume', surface: '写的是「多次参加/多次获奖」', meaning: '若有具体结果可加分，若只是数量堆砌则无说服力。', risk: 'low', advice: '给出具体名称/次数/结果，别只写「多次」。' },
  '工作认真细致': { category: 'resume', surface: '写的是「工作认真细致」', meaning: '通用套路词，无差异化，HR 会跳过。', risk: 'low', advice: '用「负责核对X，0差错交付」这类事实替代。' },
  '具备良好的协调能力': { category: 'resume', surface: '写的是「具备良好的协调能力」', meaning: '泛泛而谈，HR 想知道你协调过什么、推成了什么。', risk: 'low', advice: '写「协调X方资源，推动Y交付」，让能力有载体。' },
  '老带新': { category: 'workplace', surface: '公司说「我们老带新」', meaning: '往往没有规范培训体系，靠师傅个人经验、好坏看运气。', risk: 'medium', advice: '问清培训机制与带教安排，别只指望「有人带」。' },
  '轮流值班': { category: 'workplace', surface: '说「要轮流值班」', meaning: '会占用休息时间，也可能变相降薪/背锅。', risk: 'medium', advice: '问清值班频率、补偿、排班规则。' },
  '正处于转型期': { category: 'workplace', surface: '公司说「正处于转型期」', meaning: '往往业务不稳、方向在变，可能有裁员/重组风险。', risk: 'high', advice: '问清转型方向与你的岗位是否受影响，保持警觉。' },
  '顶住压力': { category: 'workplace', surface: '领导说「先顶住压力」', meaning: '意味着任务重、资源少、要你硬扛，可能没人兜底。', risk: 'medium', advice: '问清时间节点与支持的资源，明确「顶住」的边界。' },
  '再坚持一下': { category: 'workplace', surface: '领导说「再坚持一下」', meaning: '常是拖延承诺、让你再忍，回报不一定兑现。', risk: 'medium', advice: '问清「坚持」后具体能得到什么，设个复查期限。' },
  '弹性工作节奏': { category: 'workplace', surface: '公司说「弹性工作节奏」', meaning: '常是「弹性加班」，下班没准点、工时难算。', risk: 'medium', advice: '问清打卡与加班补偿，别被「弹性」带偏。' },

    '带薪年假': {
      category: 'jd',
      surface: '福利里提到有带薪年假。',
      meaning: '注意年假天数与是否按工龄累加，许多公司「带薪年假」实际只有法定 5 天，或需转正后才享受。',
      risk: 'low',
      advice: '提前问清年假天数、工龄计算与入职当年折算方式，避免把「带薪年假」都当成长期休。',
    },
    '周末双休': {
      category: 'jd',
      surface: '作息规范、福利好。',
      meaning: '可能只是调休制或名义双休，节假日仍要随时响应。要确认是否真双休、是否占用的法定假。',
      risk: 'low',
      advice: '确认「双休」是否硬性，是否需随时在线待命，避免把调休当双休。',
    },
    '晋升空间大': {
      category: 'jd',
      surface: '在这里有成长和发展。',
      meaning: '公司若小或新，可能架构未定或只是画饼，实际晋升路径不清晰、周期不明。',
      risk: 'medium',
      advice: '追问「晋升路径是什么、多少周期、是否有指标」，用具体问题试探是否虚的。',
    },
    '你还有什么问题想问我们': {
      category: 'interview',
      surface: '给你机会了解公司。',
      meaning: '考察你关注的点和临场提问质量，是加分项。别答「没有」，也别只问薪资。',
      risk: 'low',
      advice: '准备1-2个有质量的问题，如团队的成长路径、岗位最需要的能力，体现诚意。',
    },
    '我们这行很辛苦,你能接受吗': {
      category: 'interview',
      surface: '提前告知工作强度。',
      meaning: '实际是探你抗压预期，可能对应加班或高流动岗，不是简单答「能」就完事。',
      risk: 'medium',
      advice: '先问清「辛苦」实际是什么样的强度与频次，再诚实评估是否真能接受。',
    },
    '你能接受出差吗': {
      category: 'interview',
      surface: '询问你的意愿。',
      meaning: '岗位可能高频出差或驻外，需结合自身与家庭条件，别轻易承诺做不到的频次。',
      risk: 'low',
      advice: '问清出差频率、时长、是否常驻，再给出真实可执行的答复。',
    },
    '你对自己未来的规划是什么': {
      category: 'interview',
      surface: '了解你的目标。',
      meaning: '判断规划是否与岗位稳定相关，答得太跳跃或空泛会被认为留不住。',
      risk: 'medium',
      advice: '把规划与岗位、公司目标挂钩，展现稳定性与上进心。',
    },
    '你理想的工作环境是什么样的': {
      category: 'interview',
      surface: '了解你的偏好。',
      meaning: '对照团队文化是否匹配，答得过于理想化会被认为不合群、难融入。',
      risk: 'low',
      advice: '结合团队真实情况作答，体现你能适应与协作，而非只谈个人理想。',
    },
    '项目经验': {
      category: 'resume',
      surface: '说明有实操经历。',
      meaning: '面试官会深挖里头的难点与你的角色，写「项目经验」就要能讲清背景/动作/结果，否则变成减分项。',
      risk: 'medium',
      advice: '每条项目经验按「背景-我的动作-结果」结构准备，能量化就量化。',
    },
    '熟悉': {
      category: 'resume',
      surface: '表示会使用某技能。',
      meaning: '「熟悉」排位低于「精通」，但面试官会用深度问题探底，写「熟悉」就要经得起追问。',
      risk: 'low',
      advice: '明确自己熟悉到什么程度，主动划定边界，避免被问到「精通」级才暴露短板。',
    },
    '独立完成': {
      category: 'resume',
      surface: '强调具备独立做事能力。',
      meaning: '关注你是否真能独当一面，需要说明过程中的协作与支持，否则易被质疑夸大。',
      risk: 'low',
      advice: '补充说明独立完成的边界与借助的协作，让「独立」真实可背调。',
    },
    '我先说一句': {
      category: 'workplace',
      surface: '领导要讲话的开场。',
      meaning: '后面往往跟着重要指示或批评/纠偏，别当闲聊，注意抓重点。',
      risk: 'low',
      advice: '认真记录要点，必要时复核确认理解一致，别只顾点头。',
    },
    '这个急,今天要': {
      category: 'workplace',
      surface: '说明交付很紧急。',
      meaning: '交付节奏紧，需评估可行性并向上同步真实排期，别硬扛、也别擅自延期。',
      risk: 'high',
      advice: '先评估所需时间，若冲突主动提出优先级方案，避免最后仓促出错。',
    },
    '都是自己人': {
      category: 'workplace',
      surface: '拉近关系、表亲近。',
      meaning: '可能暗示「别计较付出」，警惕被以情谊为由要求无偿多干或背锅。',
      risk: 'medium',
      advice: '保持界限，重要事项按流程留痕、说清边界，别因「自己人」模糊分工。',
    },
    '你看着办': {
      category: 'workplace',
      surface: '领导放权给你。',
      meaning: '也可能是让你背锅的信号，重大决策要留痕、同步，别替领导做主。',
      risk: 'high',
      advice: '重大事项先给方案和依据请领导确认，绝不能真「自己看着办」落下风险。',
    },

    '提供住宿': {
      category: 'jd',
      surface: '公司提供住宿。',
      meaning: '可能是偏远或倒班岗位的标配，住宿条件与水电分摊存疑，要问清是否单间、收费。',
      risk: 'low',
      advice: '提前确认住宿是单间还是合住、是否含水电、离厂区多远，避免入职才发现条件差。',
    },
    '年底双薪': {
      category: 'jd',
      surface: '有年终福利。',
      meaning: '可能与绩效挂钩，或只是13薪的包装，要问清发放条件与时间。',
      risk: 'low',
      advice: '问清是否固定、与哪些考核挂钩、何时发放，别把不确定的当稳拿。',
    },
    '定期调薪': {
      category: 'jd',
      surface: '会定期涨薪。',
      meaning: '可能幅度不大或有考核门槛，要问清调薪周期与依据。',
      risk: 'low',
      advice: '追问调薪周期、幅度区间、是否有晋升/绩效条件，避免只听到美好预期。',
    },
    '弹性打卡': {
      category: 'jd',
      surface: '时间自由。',
      meaning: '可能上下班时间模糊，忙时仍要早到晚走，需确认核心工作时间。',
      risk: 'medium',
      advice: '问清核心工作时间、是否需随时待命、考核是否仍按时长计。',
    },
    '你对这个岗位有什么了解': {
      category: 'interview',
      surface: '看你的准备度。',
      meaning: '考你是否做过功课，答不上会显得没诚意、不匹配。',
      risk: 'low',
      advice: '提前研究岗位职责与所需能力，讲出你的理解与匹配点。',
    },
    '你会不会觉得这个岗位太基础': {
      category: 'interview',
      surface: '问你的意愿。',
      meaning: '考你能否脚踏实地，答得太想要进阶显得不稳。',
      risk: 'medium',
      advice: '先表达能沉下心做好基础，再讲你理解的成长路径，展现踏实。',
    },
    '如果项目要你加班到很晚你怎么办': {
      category: 'interview',
      surface: '问你的抗压。',
      meaning: '看你怎么平衡投入与边界，别只说能加班或直接拒绝。',
      risk: 'medium',
      advice: '给态度+方法：关键节点可投入，同时讲清排期与协同，展现成熟。',
    },
    '你如何看待我们行业的前景': {
      category: 'interview',
      surface: '问你的行业认知。',
      meaning: '考你是否有判断与准备，答不上会显得海投。',
      risk: 'low',
      advice: '结合趋势、政策、自身专业讲出有依据的判断，而不是空喊。',
    },
    '你希望从这份工作里获得什么': {
      category: 'interview',
      surface: '问你的动机。',
      meaning: '考动机是否与岗位匹配，纯谈薪资晋升会显得功利。',
      risk: 'low',
      advice: '结合岗位能给的成长与你的目标，讲匹配而非单方面索取。',
    },
    '具备扎实基础': {
      category: 'resume',
      surface: '说明你有底子。',
      meaning: '可能是套话，要能说清具体课程/技能支撑，否则被追问就露怯。',
      risk: 'low',
      advice: '用具体课程、项目或证书支撑「扎实」，让基础可背调。',
    },
    '经历丰富': {
      category: 'resume',
      surface: '说明经验多。',
      meaning: '需讲清具体经历与成果，否则显得空泛。',
      risk: 'low',
      advice: '每条经历都带一段能讲清角色与结果的实例，别只堆list。',
    },
    '积极主动': {
      category: 'resume',
      surface: '说明态度好。',
      meaning: '过于通用，需用主动做的具体事证明。',
      risk: 'low',
      advice: '举一个你主动推进/改进的实例，体现主动性而非套话。',
    },
    '这个项目黄了': {
      category: 'workplace',
      surface: '说明项目停止。',
      meaning: '可能是方向失败或资源调整，别急着撇清，讲你学到什么、如何复盘。',
      risk: 'medium',
      advice: '主动讲清项目为何终止、你承担什么、沉淀了什么，展现成熟。',
    },
    '你辛苦了': {
      category: 'workplace',
      surface: '场景化慰问。',
      meaning: '可能是客套，也可能让你继续扛，别当真松懈。',
      risk: 'low',
      advice: '正常回应并主动同步进展，保持投入，别理解为可以放松。',
    },
    '提个醒': {
      category: 'workplace',
      surface: '善意提醒。',
      meaning: '往往是委婉的警告或纠偏，要重视并自查。',
      risk: 'low',
      advice: '记下重点、确认理解一致、主动复盘，避免被当耳旁风。',
    },
    '差不多就行': {
      category: 'workplace',
      surface: '放宽标准。',
      meaning: '在质量红线上别真糊弄，涉及关键交付要守住标准。',
      risk: 'medium',
      advice: '区分可接受的灵活与不可放过的质量，守住底线再谈效率。',
    },

    '薪资结构': {
      category: 'jd',
      surface: '谈到薪酬。',
      meaning: '要问清底薪/提成/绩效/补贴构成，别只盯总数字，也看是否有刚性的扣减。',
      risk: 'low',
      advice: '主动问清薪酬结构、考核方式与发放周期，综合判断而非只看总额。',
    },
    '公司处于高速发展期': {
      category: 'jd',
      surface: '说明有前景。',
      meaning: '可能意味着节奏快、流程乱、加班多，需评估稳定性与匹配度。',
      risk: 'medium',
      advice: '问清发展期的具体压力、组织规模与流程现状，别只被前景打动。',
    },
    '年度旅游': {
      category: 'jd',
      surface: '福利之一。',
      meaning: '可能是团建噱头，或占用周末、非带薪，要问清是否带薪及是否占私人时间。',
      risk: 'low',
      advice: '确认旅游是否带薪、是否占周末，避免把说走就走当常态。',
    },
    '专业不对口也可': {
      category: 'jd',
      surface: '门槛较低。',
      meaning: '可能岗位本身不挑专业，或可替代性高，要衡量长远发展。',
      risk: 'medium',
      advice: '问清岗位职责与成长路径，判断是真门槛低还是容易被替代。',
    },
    '你觉得你能胜任吗': {
      category: 'interview',
      surface: '问你的信心。',
      meaning: '考自我认知与匹配度，别过度自信也别露怯。',
      risk: 'low',
      advice: '结合岗位所需能力讲你的对应点，展现自信但真诚。',
    },
    '工作压力大的时候你怎么调节': {
      category: 'interview',
      surface: '问你的抗压。',
      meaning: '考自我调节与韧性，别只笼统说能扛。',
      risk: 'medium',
      advice: '给具体调节方法与复盘习惯，展现成熟稳定。',
    },
    '你为什么不选择专业对口的工作': {
      category: 'interview',
      surface: '问你的选择。',
      meaning: '考你的动机与自我认知，答得好是加分项。',
      risk: 'medium',
      advice: '讲清专业与岗位的关联、你的兴趣与规划，避免只说不喜欢。',
    },
    '你觉得这个岗位的难点在哪': {
      category: 'interview',
      surface: '问你的理解。',
      meaning: '考你是否做过功课、有无深度思考。',
      risk: 'low',
      advice: '从业务/能力/协作角度讲真难点，展现理解而非套话。',
    },
    '如果你入职后和预想不同怎么办': {
      category: 'interview',
      surface: '问你的预期管理。',
      meaning: '考你的稳定性与调整能力，别答得过于理想化或临阵退缩。',
      risk: 'medium',
      advice: '讲清主动对齐、调整预期、争取解决，而非轻易离职。',
    },
    '成绩优良': {
      category: 'resume',
      surface: '说明学习好。',
      meaning: '成绩是基础但不是全部，需结合实践与综合素质。',
      risk: 'low',
      advice: '用具体成绩/奖学金支撑，同时补实践与能力，避免只说成绩。',
    },
    '社团经验': {
      category: 'resume',
      surface: '说明有经历。',
      meaning: '会追问你在社团的角色与产出，写「社团经验」要能讲清做了什么。',
      risk: 'low',
      advice: '结合你负责的事务与成果，体现组织与协作能力。',
    },
    '自我驱动': {
      category: 'resume',
      surface: '说明主动。',
      meaning: '需用真实的自学/主动推进的例子证明，否则显得空泛。',
      risk: 'low',
      advice: '举一个你自发学习或推动事情的例子，展现内驱力。',
    },
    '先这样吧': {
      category: 'workplace',
      surface: '结束对话。',
      meaning: '可能是暂时妥协或搁置，要确认是否还有后续动作。',
      risk: 'low',
      advice: '确认关键事项的后续安排，别默认已处理完。',
    },
    '要加班了': {
      category: 'workplace',
      surface: '说明忙碌。',
      meaning: '看是否常态、有无补偿，评估真实工作强度。',
      risk: 'medium',
      advice: '问清加班频率与补偿，别默默长期扛。',
    },
    '下个月再定': {
      category: 'workplace',
      surface: '推迟决定。',
      meaning: '可能是拖延或没想清楚，重要事项要主动跟进。',
      risk: 'medium',
      advice: '重要事项明确推进节点，及时跟进，别被动等。',
    },
    '谁来做决定': {
      category: 'workplace',
      surface: '问分工。',
      meaning: '责任边界可能不清，需明确owner与决策人。',
      risk: 'low',
      advice: '关键事项明确负责人与链条，避免模糊导致的混乱。',
    },
    '吃住全包': {
      category: 'jd',
      surface: '写的是「吃住全包」',
      meaning: '很可能偏远或条件一般，用包吃住抵消薪资与通勤劣势。',
      risk: 'medium',
      advice: '问清食宿实际标准与位置，评估是否值得为「包吃住」牺牲发展。',
    },
    '项目奖金': {
      category: 'jd',
      surface: '写的是「项目奖金」',
      meaning: '奖金可能占比虚高、发放条件苛刻，用来拉高名义薪酬。',
      risk: 'medium',
      advice: '问清奖金构成、考核标准与发放时间，别只看总数。',
    },
    '业务稳定': {
      category: 'jd',
      surface: '写的是「业务稳定」',
      meaning: '可能业务偏传统、增长乏力，或想强调「不折腾」稳住人。',
      risk: 'low',
      advice: '问清主营收入来源与近两年增长情况，判断是稳还是停。',
    },
    '长期稳定': {
      category: 'jd',
      surface: '写的是「长期稳定、能长期做」',
      meaning: '可能希望员工绑久些，或岗位偏重复、流动大的岗位想留人。',
      risk: 'medium',
      advice: '问清培养机制与晋升节奏，别把「稳定」当承诺。',
    },
    '你对我们团队了解多少': {
      category: 'interview',
      surface: '问「了解团队吗」',
      meaning: '看你是否做功课、是否真心，也是反向考察你对团队认知。',
      risk: 'low',
      advice: '提前查团队规模、分工、风格，回答要具体别空泛。',
    },
    '你最近在看什么机会': {
      category: 'interview',
      surface: '问「最近在看的或拿到的机会」',
      meaning: '试探你手中筹码与离职动机，评估你能不能被轻松挖走。',
      risk: 'medium',
      advice: '如实但不过度暴露，讲匹配度与成长诉求，别贬低现岗。',
    },
    '你如何看待压力': {
      category: 'interview',
      surface: '问「怎么应对压力」',
      meaning: '考察抗压与承压方式，也是确认是否适合高压岗位。',
      risk: 'medium',
      advice: '给具体应对方法，别只说「我能扛」。',
    },
    '你还有什么要问的': {
      category: 'interview',
      surface: '问「还有想问的」',
      meaning: '考察真实兴趣与准备度，也是你反转主动权的好机会。',
      risk: 'low',
      advice: '问业务、团队、成长路径，别只问福利或加班。',
    },
    '你对加班怎么看': {
      category: 'interview',
      surface: '问「接受加班吗」',
      meaning: '直接测试加班意愿，也是为后续谈薪与强度做铺垫。',
      risk: 'high',
      advice: '问清加班频率与补偿方式，别急着表忠心。',
    },
    '熟练掌握': {
      category: 'resume',
      surface: '写的是「熟练掌握」',
      meaning: '常把「用过的」写成「掌握的」，HR会当水分看。',
      risk: 'medium',
      advice: '面试前准备好复述，能说出细节才配得上「熟练」。',
    },
    '参与项目': {
      category: 'resume',
      surface: '写的是「参与项目」',
      meaning: '「参与」可能只是边缘角色，未必是核心贡献。',
      risk: 'medium',
      advice: '说清你的具体职责与产出，别被「参与」稀释。',
    },
    '获得证书': {
      category: 'resume',
      surface: '写的是「获得证书」',
      meaning: '证书多可能是加分项，但也要看含金量与相关性。',
      risk: 'low',
      advice: '挑与岗位相关的证书强调，关联不强的少铺陈。',
    },
    '这个需求不急': {
      category: 'workplace',
      surface: '说「这个不急」',
      meaning: '大概率在拖延或优先级低，但也可能暗示「以后可能就不做了」。',
      risk: 'low',
      advice: '确认真正的deadline与优先级，别真的放太久。',
    },
    '你看着来': {
      category: 'workplace',
      surface: '说「你看着办」',
      meaning: '把决定权甩给你，但出问题了责任也归你。',
      risk: 'high',
      advice: '关键处给出方案让ta拍板，别自己扛下所有决定。',
    },
    '以后再说': {
      category: 'workplace',
      surface: '说「以后再说」',
      meaning: '多半是缓兵之计，这事可能悬了，别真的等。',
      risk: 'medium',
      advice: '设一个可跟进的节点，别把「以后」当承诺。',
    },
    '加个班': {
      category: 'workplace',
      surface: '说「加个班」',
      meaning: '轻描淡写，但往往意味着无偿加班成为常态。',
      risk: 'high',
      advice: '问清原因与有无补偿，别把「加个班」当日常。',
    },
    '急招': {
      category: 'jd',
      surface: '写的是「急招、急聘」',
      meaning: '岗位可能很缺人，要求快速到岗，也可能有坑想快点填。',
      risk: 'high',
      advice: '问清为什么急招、到岗时间、岗位是否真实，别被催着赶进去。',
    },
    '包住宿': {
      category: 'jd',
      surface: '写的是「包住宿」',
      meaning: '条件可能一般或偏远，用住宿补薪资与通勤短板。',
      risk: 'medium',
      advice: '问清住宿条件、地点与是否含水电，判断性价比。',
    },
    '有竞争力': {
      category: 'jd',
      surface: '写的是「薪资有竞争力」',
      meaning: '通常是虚词，未必真高，常用来保持谈判空间。',
      risk: 'medium',
      advice: '问清薪资带宽与实际构成，别被模糊承诺带节奏。',
    },
    '发展平台': {
      category: 'jd',
      surface: '写的是「提供发展平台」',
      meaning: '可能是小公司或业务不稳，用「平台」补偿给不够的钱。',
      risk: 'medium',
      advice: '查公司真实业务与规模，别只听「平台大」。',
    },
    '你会加班吗': {
      category: 'interview',
      surface: '问「接受加班吗」',
      meaning: '直接测你加班意愿，为后续强度与谈薪铺垫。',
      risk: 'high',
      advice: '问清加班频率、补偿与项目节奏，别急着表态。',
    },
    '你觉得你的优势是什么': {
      category: 'interview',
      surface: '问「你的优势」',
      meaning: '看你自我认知与匹配度，也考验表达与洞察。',
      risk: 'low',
      advice: '结合岗位要求说1-2个可验证优势，别空泛堆词。',
    },
    '你的职业规划是什么': {
      category: 'interview',
      surface: '问「职业规划」',
      meaning: '看你的稳定性与目标是否匹配岗位，也会评估成长性。',
      risk: 'medium',
      advice: '讲清晰但不空想的路径，贴合岗位，别只喊口号。',
    },
    '你接受加班吗': {
      category: 'interview',
      surface: '问「能接受加班吗」',
      meaning: '和「你会加班吗」类似，直接试探你是不是软柿子。',
      risk: 'high',
      advice: '先问准条件再表态，不要为了offer先答应到底。',
    },
    '你为什么想来我们公司': {
      category: 'interview',
      surface: '问「为什么来我们」',
      meaning: '考察动机、做功课程度与是不是海投。',
      risk: 'low',
      advice: '结合公司产品/业务/近期动作回答，别只说「平台好」。',
    },
    '担任过': {
      category: 'resume',
      surface: '写的是「担任过」',
      meaning: '可能只是挂名参与，未必对应核心贡献。',
      risk: 'medium',
      advice: '说清具体职责、规模与产出，避免被追问露馅。',
    },
    '多次获奖': {
      category: 'resume',
      surface: '写的是「多次获奖」',
      meaning: '奖项多但需看含金量，也可能是凑数的集体奖。',
      risk: 'low',
      advice: '挑与岗位相关的奖讲，含金量虚的就少铺陈。',
    },
    '有相关实习经历': {
      category: 'resume',
      surface: '写的是「有对口实习」',
      meaning: '大概率是真加分，但也可能实习水、含金量不足。',
      risk: 'low',
      advice: '能说出具体做了什么与学到什么，才撑得起这句。',
    },
    '先这样': {
      category: 'workplace',
      surface: '说「先这样吧」',
      meaning: '意味着目前告一段落，未必是最终结论，可能草草收场。',
      risk: 'medium',
      advice: '确认是否有后续跟进与时间点，别当尘埃落定。',
    },
    '你们部门': {
      category: 'workplace',
      surface: '说「你们部门」',
      meaning: '有切割意味，可能部门间配合不顺或责任不清。',
      risk: 'medium',
      advice: '厘清跨部门分工与协作规则，避免被甩锅。',
    },
    '自己人': {
      category: 'workplace',
      surface: '说「都是自己人」',
      meaning: '可能暗示要倚重你，但也可能是画饼、拉近关系淡化边界。',
      risk: 'high',
      advice: '保持职业边界，别被「自己人」套牢。',
    },
    '这个锅': {
      category: 'workplace',
      surface: '说「这个锅你来背」',
      meaning: '明显的责任转移，你要为别人或系统问题兜底。',
      risk: 'high',
      advice: '先弄清责任归属再说话，别哑巴吃黄连。',
    },
    '弹性上下班': {
      category: 'jd',
      surface: '写的是「弹性上下班」',
      meaning: '可能只是避开高峰期，也可能变相不限工时、无加班费。',
      risk: 'medium',
      advice: '问清打卡与加班制度，别被「弹性」当福利。',
    },
    '年轻团队': {
      category: 'jd',
      surface: '写的是「团队年轻」',
      meaning: '成员多为新人，缺带教、缺稳定，也可能是画饼。',
      risk: 'medium',
      advice: '问团队规模与成立年限，判断是创业还是草台。',
    },
    '学习型组织': {
      category: 'jd',
      surface: '写的是「学习型组织」',
      meaning: '可能是变相「每天加班学习」，也可能真的重视成长。',
      risk: 'low',
      advice: '问有无带教与培训机制，别只看口号。',
    },
    '你如何看待我们公司': {
      category: 'interview',
      surface: '问「怎么看我们公司」',
      meaning: '看你是否做足功课、对行业是否了解，也是反向筛选。',
      risk: 'low',
      advice: '说真实观察+欣赏点，别过度吹捧或不了解硬答。',
    },
    '你遇到过最大挑战': {
      category: 'interview',
      surface: '问「最大挑战/困难」',
      meaning: '考察解决问题能力与抗压，也是压力测试。',
      risk: 'medium',
      advice: '讲一个真实挑战+你的做法与结果，别泛泛而谈。',
    },
    '你每天能接多少活': {
      category: 'interview',
      surface: '问「能承担多少工作」',
      meaning: '试探你扛不扛得住高强度，也可能真在评估工作量。',
      risk: 'medium',
      advice: '要说清楚边界与优先级，别答应到满。',
    },
    '熟悉办公软件': {
      category: 'resume',
      surface: '写的是「熟悉Office/办公软件」',
      meaning: '基本人人都写，几乎无区分度，是凑字数词。',
      risk: 'low',
      advice: '别单独强调，若岗位需要就点应用场景与产出。',
    },
    '能适应出差': {
      category: 'resume',
      surface: '写的是「能适应出差」',
      meaning: '暗示出差多、可能长期驻外，影响生活。',
      risk: 'medium',
      advice: '问清频率与范围，写在简历要能扛得住追问。',
    },
    '团队意识强': {
      category: 'resume',
      surface: '写的是「团队意识强」',
      meaning: '万能词，缺乏说服力，考验协作而非口号。',
      risk: 'low',
      advice: '用团队协作实例或成果来支撑。',
    },
    '这个方案你先做': {
      category: 'workplace',
      surface: '说「这个你先做做看」',
      meaning: '让你先试，可能没想清楚或想让你背责。',
      risk: 'medium',
      advice: '先确认目标与验收标准，再动手，别闷头做。',
    },
    '我很看好你': {
      category: 'workplace',
      surface: '说「我很看好你」',
      meaning: '可能是口头激励，也可能是拉你扛更多活。',
      risk: 'medium',
      advice: '别只被夸，看对方是否真给资源与机会。',
    },
    '大家都懂': {
      category: 'workplace',
      surface: '说「大家都懂的」',
      meaning: '可能想模糊规则、让你按潜规则办事，边界不清。',
      risk: 'high',
      advice: '问清具体标准与依据，别「懂」了就背锅。',
    },
    '你别计较': {
      category: 'workplace',
      surface: '说「你别计较」',
      meaning: '通常是想让你让步或被占便宜，用道德绑架。',
      risk: 'high',
      advice: '守住底线与正当权益，别被一句「别计较」压住。',
    },
    '五险一金齐全': {
      category: 'jd',
      surface: '写的是「五险一金齐全」',
      meaning: '这本来是法定，强调它可能意味着其他福利少，或想用来当卖点。',
      risk: 'low',
      advice: '问清缴纳基数与公积金比例，别把「法定」当福利。',
    },
    '带薪实习': {
      category: 'jd',
      surface: '写的是「带薪实习」',
      meaning: '实习期给钱，但可能金额低、转正难，或用来吸引人填坑。',
      risk: 'medium',
      advice: '问清薪资、时长与转正机制，别只看「带薪」。',
    },
    '储备人才培养': {
      category: 'jd',
      surface: '写的是「储备人才」',
      meaning: '可能轮岗打杂、晋升慢，或被当廉价劳动力储备。',
      risk: 'medium',
      advice: '问清培养方向、定岗时间与晋升通道。',
    },
    '提供培训': {
      category: 'jd',
      surface: '写的是「提供培训」',
      meaning: '培训可能是入职洗脑/低质课程，未必有硬技能成长。',
      risk: 'medium',
      advice: '问清培训内容与周期，判断是真培养还是走流程。',
    },
    '你对我们产品怎么看': {
      category: 'interview',
      surface: '问「怎么看我们产品」',
      meaning: '考你懂不懂业务、有没有做功课，也是筛选关注度。',
      risk: 'low',
      advice: '说真实观察+可优化点，别只夸或只说没了解。',
    },
    '你服从安排吗': {
      category: 'interview',
      surface: '问「接受调岗/服从安排」',
      meaning: '试探你是否好拿捏，也可能真有岗位调整需求。',
      risk: 'high',
      advice: '问清调整范围与原因，别无条件答应。',
    },
    '你和同学比优势': {
      category: 'interview',
      surface: '问「你和别人比的优势」',
      meaning: '看自我定位与差异化，也是压力对比测试。',
      risk: 'medium',
      advice: '讲差异化竞争点，别贬低他人或空泛自夸。',
    },
    '你有没有实习过': {
      category: 'interview',
      surface: '问「实习经历」',
      meaning: '没有实习会吃力，有实习看含金量与真实度。',
      risk: 'medium',
      advice: '把实习讲到具体职责与产出，别只说「去过」。',
    },
    '你的专业学得怎么样': {
      category: 'interview',
      surface: '问「专业能力」',
      meaning: '想判断基础是否扎实，也可能想测试你对口度。',
      risk: 'low',
      advice: '结合课程、项目、成绩讲，别只说「还行」。',
    },
    '组织能力': {
      category: 'resume',
      surface: '写的是「组织能力」',
      meaning: '常指组织活动，未必对应岗位所需，容易空泛。',
      risk: 'medium',
      advice: '用具体组织/统筹案例支撑，别只写形容词。',
    },
    '学习能力': {
      category: 'resume',
      surface: '写的是「学习能力强」',
      meaning: '万能词，缺乏证据，考验能否真正吸收新东西。',
      risk: 'low',
      advice: '用快速上手或自学成果证明。',
    },
    '抗压': {
      category: 'resume',
      surface: '写的是「抗压」',
      meaning: '提示岗位强度大概率不小，也可能是美化。',
      risk: 'medium',
      advice: '别只写「能抗压」，要有处理高压的具体方法。',
    },
    '执行力': {
      category: 'resume',
      surface: '写的是「执行力强」',
      meaning: '偏执行导向岗位常用，但要能落到具体结果。',
      risk: 'low',
      advice: '用按时交付或结果导向的事例证明。',
    },
    '先别急': {
      category: 'workplace',
      surface: '说「先别急」',
      meaning: '可能是让你等等，或这事其实还没定，稳住你。',
      risk: 'low',
      advice: '确认进度与优先级，别被「别急」耽误。',
    },
    '我马上处理': {
      category: 'workplace',
      surface: '说「我马上处理」',
      meaning: '嘴上答应，实际未必上心，需后续跟进。',
      risk: 'medium',
      advice: '设个节点跟进，别只听一句「马上」。',
    },
    '回头再说': {
      category: 'workplace',
      surface: '说「回头再说」',
      meaning: '大概率是拖延/婉拒，这事可能黄了。',
      risk: 'medium',
      advice: '主动约个时间再碰，别被动等。',
    },
    '发展空间': {
      category: 'jd',
      surface: '写的是「发展空间大/广」',
      meaning: '公司小/平台弱，用「空间」补偿钱，也可能是画饼。',
      risk: 'high',
      advice: '查公司规模、业务真实性，别被「空间」忽悠。',
    },
    '能力要求高': {
      category: 'jd',
      surface: '写的是「能力要求高」',
      meaning: '门槛高、活重，也可能是想压低薪资或筛人。',
      risk: 'medium',
      advice: '问清岗位核心职责与考核标准，判断是否匹配。',
    },
    '工作氛围好': {
      category: 'jd',
      surface: '写的是「氛围好」',
      meaning: '可能团队小、管理松，也可能是缺制度化。',
      risk: 'low',
      advice: '问团队规模与管理机制，别只听「氛围」。',
    },
    '成长快': {
      category: 'jd',
      surface: '写的是「成长快」',
      meaning: '可能强度大、学得多，也可能只是裁员前话术。',
      risk: 'medium',
      advice: '问具体带教与成长路径，别只听「快速成长」。',
    },
    '你对加班有想法吗': {
      category: 'interview',
      surface: '问「对加班怎么看」',
      meaning: '试探你的加班底线，也是为后续强度与谈薪铺垫。',
      risk: 'high',
      advice: '先问清频率与补偿，别急着表忠心。',
    },
    '你觉得自己胜任吗': {
      category: 'interview',
      surface: '问「能胜任吗」',
      meaning: '看似确认，实则是压力测试，看你自信与认知。',
      risk: 'medium',
      advice: '讲匹配点与可补的短板，客观而不自大。',
    },
    '你还有什么缺点': {
      category: 'interview',
      surface: '问「缺点」',
      meaning: '考察自我认知与改进意识，也是压力测试。',
      risk: 'medium',
      advice: '说真实可控的缺点+改进动作，别甩一句「我太完美」。',
    },
    '你期望base多少': {
      category: 'interview',
      surface: '问「期望薪资」',
      meaning: '摸你的底线与市场定位，常用来压价。',
      risk: 'high',
      advice: '先问对方预算区间，再给区间+底线，别先说死。',
    },
    '你有offer吗': {
      category: 'interview',
      surface: '问「手里有offer吗」',
      meaning: '看你筹码与紧迫度，评估要不要抢你。',
      risk: 'medium',
      advice: '如实但别过度暴露，讲清楚匹配与节奏。',
    },
    '参与过大赛': {
      category: 'resume',
      surface: '写的是「参与过大赛」',
      meaning: '可能是团体赛边缘角色，或含金量存疑。',
      risk: 'medium',
      advice: '讲清你的具体职责与获奖含金量，别只顾数量。',
    },
    '专业排名': {
      category: 'resume',
      surface: '写的是「专业排名」',
      meaning: '排名高是加分，但要看学校层次与口径。',
      risk: 'low',
      advice: '挑与岗位相关的排名/亮点讲，别只堆数字。',
    },
    '沟通协调': {
      category: 'resume',
      surface: '写的是「沟通协调能力强」',
      meaning: '万能词，缺乏说服力，考验真实协作。',
      risk: 'low',
      advice: '用跨部门/团队协作的具体成果来支撑。',
    },
    '先定个调': {
      category: 'workplace',
      surface: '说「先定个调」',
      meaning: '想提前框定方向，可能为你后续执行设限。',
      risk: 'medium',
      advice: '确认这个「调」是否符合目标，别被框住。',
    },
    '这事你来负责': {
      category: 'workplace',
      surface: '说「你来负责」',
      meaning: '把责任压到你身上，资源未必给足。',
      risk: 'high',
      advice: '先确认授权、资源与审批链条，再接下。',
    },
    '我辛苦一点': {
      category: 'workplace',
      surface: '说「我辛苦一点」',
      meaning: '可能是卖惨/道德绑架，让你不好意思提条件。',
      risk: 'medium',
      advice: '保持理性，别被「辛苦」绑架，弄清真实诉求。',
    },
    '你觉得呢': {
      category: 'workplace',
      surface: '说「你觉得呢」',
      meaning: '把球踢回给你，可能是试探或让你拍板背责。',
      risk: 'medium',
      advice: '给出有依据的判断，但关键处别独自扛。',
    },
    '校内职务': {
      category: 'resume',
      surface: '写的是「担任过校内职务」',
      meaning: '可能是学生会/社团/班干，含金量看实际贡献。',
      risk: 'low',
      advice: '讲清职务、规模与产出，别只看「担任过」。',
    },
    '作品集': {
      category: 'resume',
      surface: '写的是「附作品集」',
      meaning: '能证明真实能力，但内容质量决定含金量。',
      risk: 'low',
      advice: '挑最对口的作品，讲清思路与成果，别堆数量。',
    },
    '熟练使用': {
      category: 'resume',
      surface: '写的是「熟练使用某工具」',
      meaning: '可能只是「用过」，面试会被追问细节。',
      risk: 'medium',
      advice: '准备能说清具体场景与操作，别只剩口号。',
    },
    '跟岗实习': {
      category: 'resume',
      surface: '写的是「跟岗实习」',
      meaning: '可能是见习/观察式，含金量不如独立负责。',
      risk: 'medium',
      advice: '说清你实际做了什么与产出，别只有「跟岗」。',
    },
    '多次获得奖学金': {
      category: 'resume',
      surface: '写的是「多次获奖学金」',
      meaning: '学习能力加分，但要看清是校级还是院级。',
      risk: 'low',
      advice: '挑含金量高的奖讲，附上具体学年与比例。',
    },
    '积极参与': {
      category: 'resume',
      surface: '写的是「积极参与」',
      meaning: '虚词，未必是核心角色，容易变水分。',
      risk: 'medium',
      advice: '有具体成果才写，否则显得空泛。',
    },
    '协助完成': {
      category: 'resume',
      surface: '写的是「协助完成」',
      meaning: '可能是边缘参与，贡献有限，需诚实描述。',
      risk: 'medium',
      advice: '讲清你的职责与贡献比例，别夸大成主导。',
    },
    '主导项目': {
      category: 'resume',
      surface: '写的是「主导项目」',
      meaning: '是真正的加分项，但会被追问细节与结果。',
      risk: 'medium',
      advice: '讲清目标、你的角色、方法、结果，能承接追问。',
    },
    '扎实功底': {
      category: 'resume',
      surface: '写的是「基础扎实」',
      meaning: '虚词，常用来弥补项目不足，需要佐证。',
      risk: 'medium',
      advice: '用具体课程、项目、证书来支撑，别只剩形容词。',
    },
    '高薪急招': {
      category: 'jd',
      surface: '写的是「高薪急招」',
      meaning: '可能高薪是噱头、急招有坑，或薪资水分大。',
      risk: 'high',
      advice: '问清真实薪资构成与岗位真实性，别被「高薪」带跑。',
    },
    '包吃住': {
      category: 'jd',
      surface: '写的是「包吃住」',
      meaning: '条件一般或偏远，用食宿补薪资与通勤短板。',
      risk: 'medium',
      advice: '问清食宿标准与地点，评估是否值得。',
    },
    '你愿意出差吗': {
      category: 'interview',
      surface: '问「接受出差吗」',
      meaning: '出差多、可能长期外派，影响生活节奏。',
      risk: 'high',
      advice: '问清频率、时长与补偿，别先急着答应。',
    },
    '你了解我们做的业务吗': {
      category: 'interview',
      surface: '问「了解业务吗」',
      meaning: '考你是否做功课、是否真感兴趣。',
      risk: 'low',
      advice: '把公司产品、客户、近期动作讲清楚，别只说「了解」。',
    },
    '下周再说': {
      category: 'workplace',
      surface: '说「下周再说」',
      meaning: '大概率缓兵之计，这事可能悬了，别真的等。',
      risk: 'medium',
      advice: '主动约具体时间再碰，别被动等一周。',
    },
    '这个别外传': {
      category: 'workplace',
      surface: '说「这个别外传」',
      meaning: '信息敏感，可能涉及信任或边界问题。',
      risk: 'medium',
      advice: '先弄清为何保密，守住边界再答应。',
    },
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
