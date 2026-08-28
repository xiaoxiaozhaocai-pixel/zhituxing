// 职途星认知校正引擎 · 专业→能力→岗位知识底座
// 核心命题：学生不知道自己能投什么。本表把「专业课程 → 核心技能 → 可投岗位 → 为什么」链接起来。
// 用法：cognitiveCorrection(major) 利用 encodeMajor 反推专业子类，再查此表，输出结构化认知校正结果。

export interface CognitiveJobDirection {
  route_id?: string;       // 与 config_routes 对齐的路径 id（用于后续联动）
  job: string;             // 岗位主名
  jobs: string[];          // 岗位族（同类岗位）
  matchLevel: '高度对口' | '中等对口' | '需发力';
  skills: string[];        // 支撑该岗位的核心技能（来自课程）
  why: string;             // 「你学的XX → 对得上XX岗YY能力」的可信解释
}

export interface CognitiveKnowledgeEntry {
  subCategory: string;     // 二级子类（与 major_mapping 对齐）
  label: string;           // 子类中文名
  category: string;        // 一级大类
  coreCourses: string[];   // 该专业代表性课程
  derivedSkills: string[]; // 课程培养出的核心技能/能力
  jobDirections: CognitiveJobDirection[];
  coveredMajors?: string[]; // 精确覆盖的复合专业（优先按此匹配）
}

// ============ IT 大类 ============
export const COGNITIVE_KNOWLEDGE: CognitiveKnowledgeEntry[] = [
  {
    subCategory: 'IT-计算机',
    label: '计算机',
    category: 'IT',
    coreCourses: ['数据结构与算法', '数据库原理', '操作系统', '计算机网络', '程序设计(C/Java/Python)'],
    derivedSkills: ['编程', '数据结构', '数据库设计', '算法能力', '计算机原理'],
    jobDirections: [
      { route_id: 'IT-DEV-A1', job: '后端开发工程师', jobs: ['后端开发', '全栈工程师', 'Java开发', 'Python开发', 'Go开发'], matchLevel: '高度对口', skills: ['编程', '数据结构', '数据库设计', '算法能力'], why: '你学的《数据结构与算法》《数据库原理》正是后端开发的核心硬技能，算法+数据库是后端岗的必考项。' },
      { route_id: 'IT-DEV-A2', job: '前端/测试/运维工程师', jobs: ['前端开发', '测试工程师', '运维工程师', '技术支持'], matchLevel: '高度对口', skills: ['编程', '计算机原理', '数据库设计'], why: '你具备编程与计算机原理基础，前端/测试/运维是计算机专业门槛最友好的技术路线。' },
      { route_id: 'IT-DA-A1', job: '数据分析师', jobs: ['数据分析师', 'BI工程师', '数据运营', '数据开发'], matchLevel: '中等对口', skills: ['数据库设计', '编程', '数据结构'], why: '你学的《数据库原理》让你具备 SQL 与数据建模能力，转数据分析只需补 BI 工具和统计基础。' },
    ],
  },
  {
    subCategory: 'IT-软件',
    label: '软件工程',
    category: 'IT',
    coreCourses: ['面向对象程序设计', '软件工程', '数据库系统', 'Web开发', 'Java/Spring', '软件测试'],
    derivedSkills: ['编程', '需求分析', '数据库设计', 'Web开发', '测试', '工程化'],
    jobDirections: [
      { route_id: 'IT-DEV-A1', job: '后端开发工程师', jobs: ['后端开发', '全栈工程师', 'Java开发', 'Python开发'], matchLevel: '高度对口', skills: ['编程', '数据库设计', '需求分析', '工程化'], why: '你学的《面向对象程序设计》《Java/Spring》《数据库系统》直接对应后端开发的 Java 栈与数据库能力。' },
      { route_id: 'IT-DEV-A2', job: '前端开发工程师', jobs: ['前端开发', 'Web开发', '测试工程师', '运维'], matchLevel: '高度对口', skills: ['Web开发', '编程', '测试'], why: '你学的《Web开发》《软件工程》让前端与测试岗位几乎无需补课即可上手。' },
      { route_id: 'IT-PM-A1', job: '产品经理/项目经理', jobs: ['产品经理', '项目助理', '布点工程师', 'IT项目管理'], matchLevel: '中等对口', skills: ['需求分析', '工程化', '编程'], why: '软件工程中的《需求分析》《软件工程》训练的是结构化需求梳理能力，正是产品/项目经理的基本功。' },
    ],
  },
  {
    subCategory: 'IT-人工智能',
    label: '人工智能',
    category: 'IT',
    coreCourses: ['机器学习', '深度学习', 'Python', '概率统计', '线性代数', '数据结构'],
    derivedSkills: ['机器学习', '深度学习', 'Python编程', '数学建模', '数据分析'],
    jobDirections: [
      { route_id: 'IT-DA-A1', job: '数据分析师', jobs: ['数据分析师', 'AI算法工程师', '商业分析师', '数据运营'], matchLevel: '高度对口', skills: ['Python编程', '数据分析', '机器学习'], why: '你掌握的《Python编程》《数据分析》和统计学基础，是数据分析与 AI 算法岗的硬门槛。' },
      { route_id: 'IT-DEV-A1', job: 'AI算法工程师', jobs: ['算法工程师', '机器学习工程师', '深度学习工程师'], matchLevel: '高度对口', skills: ['机器学习', '深度学习', 'Python编程', '数据结构'], why: '《机器学习》《深度学习》+ 代码功底，正是 AI 算法岗的完整能力链。' },
      { route_id: 'IT-人工智能', job: '数据/算法产品经理', jobs: ['AI产品经理', '数据产品经理', '算法产品经理'], matchLevel: '中等对口', skills: ['数学建模', '机器学习', '数据分析'], why: '懂算法原理让你在 AI 产品经理岗特别稀缺——你能听懂技术、写清需求，这是交叉优势。' },
    ],
  },
  {
    subCategory: 'IT-网络',
    label: '网络工程',
    category: 'IT',
    coreCourses: ['计算机网络', '路由交换', '网络安全', '网络协议', 'Linux'],
    derivedSkills: ['网络协议', '网络配置', '网络运维', 'Linux', '安全基础'],
    jobDirections: [
      { route_id: 'IT-DEV-A2', job: '网络/运维工程师', jobs: ['网络工程师', '运维工程师', '技术支持', '系统管理员'], matchLevel: '高度对口', skills: ['网络协议', '网络配置', 'Linux'], why: '《计算机网络》《路由交换》直接对口网络工程与系统运维岗，课程与岗位几乎一一对应。' },
      { route_id: 'IT-信安', job: '网络安全工程师', jobs: ['安全工程师', '渗透测试', '网络安全'], matchLevel: '中等对口', skills: ['网络安全', '网络协议', 'Linux'], why: '你学的《网络安全》《网络协议》是安全岗的入门地基，补攻防实践即可切入。' },
      { route_id: 'IT-DEV-A2', job: '技术支持工程师', jobs: ['技术支持', '实施工程师', '售后工程师'], matchLevel: '中等对口', skills: ['网络配置', '网络协议'], why: '网络技术应用广，IT 公司对网络背景的技术支持需求稳定且对新人友好。' },
    ],
  },
  {
    subCategory: 'IT-信安',
    label: '信息安全',
    category: 'IT',
    coreCourses: ['密码学', '网络攻防', '系统安全', '漏洞分析', '计算机网络', 'Linux'],
    derivedSkills: ['安全加固', '漏洞分析', '密码学', '网络攻防', 'Linux'],
    jobDirections: [
      { route_id: 'IT-信安', job: '网络安全工程师', jobs: ['安全工程师', '渗透测试', '安全运维', '红蓝对抗'], matchLevel: '高度对口', skills: ['安全加固', '漏洞分析', '网络攻防'], why: '《网络攻防》《漏洞分析》就是安全岗的核心工作，你的专业背景在该赛道有天然壁垒。' },
      { route_id: 'IT-DEV-A2', job: '安全运维工程师', jobs: ['安全运维', '运维工程师', '系统管理员'], matchLevel: '高度对口', skills: ['Linux', '安全加固', '网络攻防'], why: '安全运维是安全落地的前线岗，你的安全+网络背景比纯运维更有竞争力。' },
      { route_id: 'IT-DEV-A1', job: '安全研发工程师', jobs: ['安全研发', '后端开发', '安全测试'], matchLevel: '中等对口', skills: ['网络攻防', 'Linux', '编程'], why: '懂安全头部的开发工程师非常稀缺，补编程后可走安全研发/代码审计路线。' },
    ],
  },
  {
    subCategory: 'IT-物联网',
    label: '物联网工程',
    category: 'IT',
    coreCourses: ['嵌入式系统', '传感器技术', 'C语言', '计算机网络', '单片机', '物联网通信'],
    derivedSkills: ['嵌入式', 'C语言', '单片机', '传感器', '网络通信'],
    jobDirections: [
      { route_id: 'MFG-EMB-A1', job: '嵌入式/硬件工程师', jobs: ['嵌入式工程师', '单片机工程师', '硬件工程师', '固件工程师'], matchLevel: '高度对口', skills: ['嵌入式', 'C语言', '单片机'], why: '《嵌入式系统》《单片机》《C语言》正是嵌入式开发的核心能力组合，你的专业配置就是嵌入式岗的简历画像。' },
      { route_id: 'MFG-EE-A1', job: '电子/通信工程师', jobs: ['电子工程师', '通信工程师', '硬件工程师', '测试工程师'], matchLevel: '中等对口', skills: ['传感器', '网络通信', '单片机'], why: '物联网的传感器与通信课程与制造业电子/通信岗接轨，是工科生的宽口径去向。' },
      { route_id: 'IT-DEV-A2', job: 'IoT运维/技术支持', jobs: ['IoT运维', '技术支持', '嵌入式测试'], matchLevel: '中等对口', skills: ['网络通信', '传感器', 'C语言'], why: '物联网技术的落地岗位对新人友好，你的软硬件兼修背景很适合做设备侧技术支持。' },
    ],
  },
  {
    subCategory: 'EE-电子',
    label: '电子',
    category: 'EE',
    coreCourses: ['电路分析', '模拟电子', '数字电子', 'PCB设计', '单片机', '嵌入式'],
    derivedSkills: ['电路分析', 'PCB设计', '单片机', '嵌入式', '硬件调试'],
    jobDirections: [
      { route_id: 'MFG-EE-A1', job: '电子/硬件工程师', jobs: ['电子工程师', '硬件工程师', 'PCB工程师', '测试工程师'], matchLevel: '高度对口', skills: ['电路分析', 'PCB设计', '硬件调试'], why: '《电路分析》《PCB设计》是电子/hardware岗的核心，你的课程训练正是这些岗位每天在做的事。' },
      { route_id: 'MFG-EMB-A1', job: '嵌入式/单片机工程师', jobs: ['嵌入式工程师', '单片机工程师', '固件工程师', '硬件工程师'], matchLevel: '高度对口', skills: ['单片机', '嵌入式', '电路分析'], why: '电子专业+单片机/嵌入式课程，是嵌入式开发岗最标准的专业出身。' },
      { route_id: 'MFG-EE-A2', job: '工艺/设备工程师', jobs: ['工艺工程师', '设备工程师', 'NPI工程师', '生产工程师'], matchLevel: '中等对口', skills: ['电路分析', '硬件调试'], why: '电子背景在制造业工艺/设备岗是加分项，桂电电子类学生流向制造企业的路非常宽。' },
    ],
  },
  {
    subCategory: 'EE-通信',
    label: '通信',
    category: 'EE',
    coreCourses: ['通信原理', '信号与系统', '数字信号处理', '射频技术', '计算机网络'],
    derivedSkills: ['通信原理', '信号处理', '射频', '网络协议', '嵌入式'],
    jobDirections: [
      { route_id: 'MFG-EE-A1', job: '通信/电子工程师', jobs: ['通信工程师', '电子工程师', '测试工程师', '硬件工程师'], matchLevel: '高度对口', skills: ['通信原理', '信号处理', '射频'], why: '《通信原理》《射频技术》是通信工程师的核心技能，专业与岗位强对口。' },
      { route_id: 'MFG-EMB-A1', job: '嵌入式/硬件工程师', jobs: ['嵌入式工程师', '硬件工程师', '固件工程师'], matchLevel: '中等对口', skills: ['信号处理', '嵌入式'], why: '通信背景+信号处理能力，在物联网/硬件开发领域非常好用。' },
      { route_id: 'IT-DEV-A2', job: '网络/测试工程师', jobs: ['网络工程师', '测试工程师', '无线通信工程师'], matchLevel: '中等对口', skills: ['网络协议', '通信原理'], why: '通信学的网络协议与信号知识，可以无缝转无线通信/网络测试岗。' },
    ],
  },
];

// ============ ME 大类 ============
export const COGNITIVE_KNOWLEDGE_ME: CognitiveKnowledgeEntry[] = [
  {
    subCategory: 'ME-机械',
    label: '机械',
    category: 'ME',
    coreCourses: ['机械设计', '机械原理', 'CAD/SolidWorks', '材料力学', '工程制图', '公差配合'],
    derivedSkills: ['机械设计', 'CAD绘图', 'SolidWorks', '制图', '工艺理解'],
    jobDirections: [
      { route_id: 'MFG-EE-A2', job: '工艺/设备工程师', jobs: ['工艺工程师', '设备工程师', 'NPI工程师', '生产工程师'], matchLevel: '高度对口', skills: ['机械设计', 'CAD绘图', '工艺理解'], why: '《机械设计》《CAD/SolidWorks》正是制造业工艺/设备岗的核心要求，机械是制造业最硬的专业出身。' },
      { route_id: 'MFG-PM-A1', job: '机械结构工程师', jobs: ['结构工程师', '机械工程师', '研发工程师'], matchLevel: '高度对口', skills: ['机械设计', 'SolidWorks', '工程制图'], why: '机械设计+三维建模能力，是结构/研发类技术岗的直接敲门砖。' },
      { route_id: 'MFG-EE-A3', job: '质量/品质工程师', jobs: ['品质工程师', '质量工程师', 'QC', 'SQE'], matchLevel: '中等对口', skills: ['制图', '工艺理解', '公差配合'], why: '机械专业懂图纸懂工艺，做品质/质量岗位容易上手，很多车企和电子厂质量岗优先机械背景。' },
    ],
  },
  {
    subCategory: 'ME-机电',
    label: '机电',
    category: 'ME',
    coreCourses: ['机电一体化', 'PLC', '机械设计', '电路基础', '传感器', '自动化控制'],
    derivedSkills: ['PLC', '机电一体化', '机械设计', '传感器', '电路基础'],
    jobDirections: [
      { route_id: 'MFG-EE-A2', job: '设备/工艺工程师', jobs: ['设备工程师', '工艺工程师', '产线工程师'], matchLevel: '高度对口', skills: ['PLC', '传感器', '机电一体化'], why: '机电一体化+PLC 是制造业设备/自动化岗的刚需，机械与电气双修让你在工厂里非常吃香。' },
      { route_id: 'ME-自动化', job: '自动化/电气工程师', jobs: ['自动化工程师', '电气工程师', 'PLC工程师'], matchLevel: '高度对口', skills: ['PLC', '自动化控制', '电路基础'], why: '机电的《PLC》《自动化控制》对口工厂自动化与电气工程师岗位。' },
      { route_id: 'MFG-EE-A3', job: '质量/生产工程师', jobs: ['品质工程师', '生产工程师', 'NPI工程师'], matchLevel: '中等对口', skills: ['传感器', '工艺理解', '机电一体化'], why: '懂设备懂产线，机电背景在质量与生产管理岗很有优势，转管理线更顺。' },
    ],
  },
  {
    subCategory: 'ME-电气',
    label: '电气',
    category: 'ME',
    coreCourses: ['电路理论', '电机与拖动', 'PLC', '电力电子', '供配电', '继电保护'],
    derivedSkills: ['PLC', '电机控制', '电路分析', '配电', '继保'],
    jobDirections: [
      { route_id: 'ME-自动化', job: '电气/自动化工程师', jobs: ['电气工程师', 'PLC工程师', '自动化工程师'], matchLevel: '高度对口', skills: ['PLC', '电机控制', '电路分析'], why: '《PLC》《电机与拖动》是电气自动化岗的核心，电气专业是工厂自动化方向的主力军。' },
      { route_id: 'MFG-EE-A2', job: '设备工程师', jobs: ['设备工程师', '工艺工程师', '产线工程师'], matchLevel: '高度对口', skills: ['PLC', '电机控制', '配电'], why: '电气背景在制造业设备维护与产线自动化岗非常抢手，桂电面向制造企业的电气类就业通道畅通。' },
      { route_id: 'MFG-EE-A3', job: '质量/安全工程师', jobs: ['品质工程师', '安全工程师', 'EHS', '质量工程师'], matchLevel: '中等对口', skills: ['配电', '继保', '电路分析'], why: '懂电懂安全，电气背景在做 EHS 与质量岗位时是稀缺的复合型人才。' },
    ],
  },
  {
    subCategory: 'ME-自动化',
    label: '自动化',
    category: 'ME',
    coreCourses: ['自动控制原理', 'PLC', '传感检测', '嵌入式', '电机控制', '过程控制'],
    derivedSkills: ['PLC', '自动控制', '传感检测', '嵌入式', '系统调试'],
    jobDirections: [
      { route_id: 'ME-自动化', job: '自动化/控制工程师', jobs: ['自动化工程师', 'PLC工程师', '控制工程师'], matchLevel: '高度对口', skills: ['PLC', '自动控制', '系统调试'], why: '《自动控制原理》《PLC》是自动化工程师的看家本领，专业与岗位完全对口。' },
      { route_id: 'MFG-EMB-A1', job: '嵌入式/硬件工程师', jobs: ['嵌入式工程师', '硬件工程师', '单片机工程师'], matchLevel: '中等对口', skills: ['嵌入式', '传感检测', '自动控制'], why: '自动化专业学了《嵌入式》《传感检测》，转嵌入式/硬件开发只需再补 C 语言功底。' },
      { route_id: 'MFG-EE-A2', job: '设备/工艺工程师', jobs: ['设备工程师', '工艺工程师', '产线工程师'], matchLevel: '中等对口', skills: ['PLC', '系统调试', '传感检测'], why: '自动化背景在制造业设备产线岗是黄金配置，懂系统的自动化学在工厂里升级路径清晰。' },
    ],
  },
];

// ============ MGMT 大类（管理/经管）============
export const COGNITIVE_KNOWLEDGE_MGMT: CognitiveKnowledgeEntry[] = [
  {
    subCategory: 'MGMT-HR',
    label: '人力资源管理',
    category: 'MGMT',
    coreCourses: ['人力资源管理', '招聘管理', '培训与开发', '薪酬管理', '劳动关系', '组织行为学', 'Excel数据处理'],
    derivedSkills: ['招聘', '培训', '薪酬设计', '劳动法', 'Excel', '沟通协调'],
    jobDirections: [
      { route_id: 'HR-ADMIN-A1', job: 'HR专员/招聘助理', jobs: ['HR专员', '招聘助理', '招聘专员', '培训专员'], matchLevel: '高度对口', skills: ['招聘', '劳动关系', '沟通协调'], why: '《招聘管理》《劳动关系》正是 HR 岗位的核心工作，你的专业履历就是招聘岗最标准的人选画像。' },
      { route_id: 'HR-ADMIN-A1', job: '人力资源管培生', jobs: ['HR管培生', '职能管培生', 'HRBP方向'], matchLevel: '中等对口', skills: ['培训', '薪酬设计', '组织行为学'], why: 'HR 全模块+Excel 数据能力，让你在职能管培生的轮岗里有更扎实的底子。' },
      { route_id: 'IT-DA-A1', job: 'HR数据分析/人事信息化', jobs: ['HR数据分析', '人事系统实施', 'HRIS专员', '招聘赋能'], matchLevel: '中等对口', skills: ['Excel', '数据处理', '招聘'], why: 'HR 背景+Excel 数据处理，是 HR 数字化/HRIS 岗位的稀缺组合，懂人事又懂数据的人不多。' },
    ],
  },
  {
    subCategory: 'MGMT-工管',
    label: '工商管理',
    category: 'MGMT',
    coreCourses: ['管理学', '市场营销', '财务管理', '组织行为学', '数据分析', '运营管理'],
    derivedSkills: ['市场洞察', '财务分析', '组织协调', '数据分析', '运营'],
    jobDirections: [
      { route_id: 'IT-PM-A1', job: '产品/运营岗', jobs: ['产品经理', '产品运营', '用户运营', '内容运营'], matchLevel: '高度对口', skills: ['市场洞察', '数据分析', '运营'], why: '工商管理的《市场营销》《数据分析》是产品/运营岗的核心能力，且经管背景做用户需求分析有优势。' },
      { route_id: 'SALES-A1', job: '销售/市场营销', jobs: ['市场营销', '客户经理', '渠道销售', '商务拓展'], matchLevel: '高度对口', skills: ['市场洞察', '组织协调', '沟通'], why: '工商管理的市场与营销课程，直接对口销售与市场岗位，是经管专业最宽的就业通道。' },
      { route_id: 'IT-DA-A1', job: '商业分析师/经营管理', jobs: ['商业分析师', '经营分析', 'BI工程师', '管理咨询'], matchLevel: '中等对口', skills: ['数据分析', '财务分析', '市场洞察'], why: '工商管理学到的财务+数据+市场分析，是商业分析师与经营管理岗的复合能力底座。' },
    ],
  },
  {
    subCategory: 'MGMT-电商',
    label: '电子商务',
    category: 'MGMT',
    coreCourses: ['电子商务概论', '网络营销', '数据分析', '选品运营', '物流与供应链', '消费者行为'],
    derivedSkills: ['电商运营', '网络营销', '数据分析', '选品', '供应链'],
    jobDirections: [
      { route_id: 'IT-PM-A1', job: '电商运营/产品运营', jobs: ['电商运营', '产品运营', '用户运营', '内容运营'], matchLevel: '高度对口', skills: ['电商运营', '网络营销', '数据分析'], why: '《网络营销》《数据分析》《选品运营》是电商运营岗的对口技能，电商专业直接上手。' },
      { route_id: 'SALES-A1', job: '市场营销/直播运营', jobs: ['市场营销', '直播运营', '商务拓展', '跨境电商'], matchLevel: '高度对口', skills: ['网络营销', '消费者行为', '选品'], why: '电商专业的营销与选品能力，是营销/直播/跨境业务的直接来源。' },
      { route_id: 'MFG-SCM-A1', job: '供应链/采购', jobs: ['采购专员', '供应链专员', '物流管理', '计划员'], matchLevel: '中等对口', skills: ['供应链', '数据分析', '选品'], why: '电商专业学的《物流与供应链》《数据分析》，能接供应链与采购岗，制造业电商化后需求增长。' },
    ],
  },
  {
    subCategory: 'MGMT-会计',
    label: '会计/金融',
    category: 'MGMT',
    coreCourses: ['基础会计', '财务管理', '审计学', '税法', '成本会计', '财务分析', 'Excel'],
    derivedSkills: ['财务核算', '报税', '财务分析', '审计', 'Excel', '成本分析'],
    jobDirections: [
      { route_id: 'MGMT-会计', job: '财务/会计岗', jobs: ['会计', '成本会计', '审计', '财务专员'], matchLevel: '高度对口', skills: ['财务核算', '审计', '报税'], why: '《基础会计》《审计》《报税》是财务岗的看家技能，专业与证书挂钩，就业通道稳定。' },
      { route_id: 'IT-DA-A1', job: '财务分析师/经营分析', jobs: ['财务分析师', '经营分析', 'BI工程师', '财务BP'], matchLevel: '中等对口', skills: ['财务分析', 'Excel', '成本分析'], why: '财务+Excel 数据能力，是财务分析/经营分析岗的黄金组合，制造业和互联网都抢这类人才。' },
      { route_id: 'MGMT-会计', job: '审计/风控', jobs: ['审计专员', '风控专员', '内控', '税务顾问'], matchLevel: '中等对口', skills: ['审计', '财务分析', '报税'], why: '会计专业的审计与税法功底，让你在审计、风控、税务岗有专业背书，进所/进企皆可。' },
    ],
  },
  {
    subCategory: 'MGMT-工业工程',
    label: '工业工程',
    category: 'MGMT',
    coreCourses: ['生产运作管理', '工业工程基础', '精益生产', '质量工程', '流程图分析', '物流与供应链'],
    derivedSkills: ['流程优化', '精益生产', '质量工具', '数据分析', '产线规划'],
    jobDirections: [
      { route_id: 'MFG-EE-A3', job: '品质/精益工程师', jobs: ['品质工程师', '精益工程师', 'IE工程师', '质量工程师'], matchLevel: '高度对口', skills: ['精益生产', '质量工具', '流程优化'], why: '《精益生产》《质量工程》正是 IE/精益/品质岗的核心，工业工程是制造业效率优化的正统专业。' },
      { route_id: 'MFG-SCM-A1', job: '供应链/生产计划', jobs: ['生产计划', '供应链专员', '计划员', 'PMC'], matchLevel: '高度对口', skills: ['流程优化', '数据分析', '产线规划'], why: '工业工程的《生产运作》《物流供应链》对口生产计划与供应链岗，是工厂里的中枢角色。' },
      { route_id: 'MGMT-PM-A1', job: '项目经理/PMO', jobs: ['项目经理', 'PMO专员', '项目协调员', '流程专员'], matchLevel: '中等对口', skills: ['流程优化', '数据分析', '产线规划'], why: '工业工程训练的流程优化与协调能力，让转项目经理/流程岗非常顺滑，懂流程又会数据。' },
    ],
  },
  {
    subCategory: 'MGMT-工管',
    label: '市场营销',
    category: 'MGMT',
    coveredMajors: ['市场营销', '市场', '营销', '工商管理(市场营销)'],
    coreCourses: ['市场营销学', '消费者行为学', '市场调研', '品牌管理', '商务谈判', '数据分析', '新媒体营销'],
    derivedSkills: ['市场调研', '品牌策划', '数据分析', '内容营销', '商务谈判'],
    jobDirections: [
      { route_id: 'SALES-A1', job: '市场/品牌专员', jobs: ['市场专员', '品牌专员', '内容运营', '活动策划'], matchLevel: '高度对口', skills: ['品牌策划', '市场调研', '内容营销'], why: '《市场营销学》《品牌管理》正是市场/品牌岗核心，营销专业是品牌与市场岗的对口正统。' },
      { route_id: 'IT-PM-A1', job: '产品/用户运营', jobs: ['产品运营', '用户运营', '内容运营', '增长运营'], matchLevel: '中等对口', skills: ['数据分析', '内容营销', '市场调研'], why: '懂市场懂用户，营销背景转互联网产品/用户运营非常顺滑，是把用户研究落地的优势人才。' },
      { route_id: 'MGMT-PM-A1', job: '销售/商务拓展', jobs: ['销售经理', '商务拓展', '大客户经理', '渠道经理'], matchLevel: '中等对口', skills: ['商务谈判', '市场调研', '品牌策划'], why: '《商务谈判》和市场洞察力让营销学生做销售/BD优势明显，是商业化最直接的路径。' },
    ],
  },
  {
    subCategory: 'MGMT-工管',
    label: '物流管理',
    category: 'MGMT',
    coveredMajors: ['物流管理', '物流', '供应链管理', '采购管理'],
    coreCourses: ['物流管理', '供应链管理', '运筹学', '仓储与配送', '采购管理', '运输管理', '数据分析'],
    derivedSkills: ['供应链规划', '仓储管理', '数据分析', '采购谈判', '物流优化'],
    jobDirections: [
      { route_id: 'MFG-SCM-A1', job: '供应链/物流专员', jobs: ['供应链专员', '物流专员', '计划员', '采购专员'], matchLevel: '高度对口', skills: ['供应链规划', '仓储管理', '物流优化'], why: '《物流管理》《供应链管理》正是供应链/物流岗核心，物流是制造业与电商供应链的中枢。' },
      { route_id: 'MFG-EE-A3', job: '仓储/作业流程优化', jobs: ['仓储主管', '物流规划', 'IE工程师', '流程专员'], matchLevel: '中等对口', skills: ['物流优化', '数据分析', '流程优化'], why: '懂物流又会流程优化，物流背景在仓储规划、IE/流程岗有天然适配，效率工具应用场景广。' },
      { route_id: 'MGMT-PM-A1', job: '采购/商务', jobs: ['采购专员', '采购经理', '商务专员', '供应链管理'], matchLevel: '中等对口', skills: ['采购谈判', '数据分析', '供应链规划'], why: '《采购管理》《商务谈判》对口采购岗，物流生在采购与供应商管理上有谈判与成本优势。' },
    ],
  },
];

// ============ LA 大类（文法/外语）============
export const COGNITIVE_KNOWLEDGE_LA: CognitiveKnowledgeEntry[] = [
  {
    subCategory: 'LA-英语',
    label: '英语',
    category: 'LA',
    coreCourses: ['综合英语', '翻译理论与实践', '商务英语', '英语写作', '跨文化交际'],
    derivedSkills: ['翻译', '英语写作', '商务沟通', '跨文化沟通', '口译'],
    jobDirections: [
      { route_id: 'SALES-A1', job: '外贸/跨境电商岗', jobs: ['外贸业务员', '跨境电商', '商务拓展', '海外销售'], matchLevel: '高度对口', skills: ['翻译', '商务沟通', '跨文化沟通'], why: '你的《翻译》《商务英语》能力，正是外贸/跨境电商的核心——语言是外贸岗的硬门槛。' },
      { route_id: 'IT-PM-A1', job: '海外产品/运营', jobs: ['海外运营', '内容运营', '海外市场', '产品运营'], matchLevel: '中等对口', skills: ['英语写作', '跨文化沟通', '商务沟通'], why: '英语专业+跨文化能力，是出海互联网公司海外运营/市场岗的稀缺背景。' },
      { route_id: 'HR-ADMIN-A1', job: '涉外HR/行政', jobs: ['涉外HR', '行政专员', '外企文员', '翻译助理'], matchLevel: '中等对口', skills: ['翻译', '商务沟通', '书面表达'], why: '外企/合资企业的 HR 与行政岗非常青睐英语专业，阅读面试与文书能力是你的加分项。' },
    ],
  },
  {
    subCategory: 'LA-日语',
    label: '日语',
    category: 'LA',
    coreCourses: ['日语精读', '日语听说', '商务日语', '日文翻译', '日本文化'],
    derivedSkills: ['日语听说', '商务日语', '日文翻译', '跨文化沟通'],
    jobDirections: [
      { route_id: 'SALES-A1', job: '对日业务/跨境电商', jobs: ['对日业务', '跨境电商日语', '海外销售', '日语客服'], matchLevel: '高度对口', skills: ['日语听说', '商务日语', '日文翻译'], why: '你的日语能力是日资企业/对日业务的核心资产，跨境电商对对日语人才需求稳定。' },
      { route_id: 'IT-PM-A1', job: '对日产品/运营', jobs: ['日企IT支撑', '对日运营', '翻译', '项目经理助理'], matchLevel: '中等对口', skills: ['日语听说', '跨文化沟通', '日文翻译'], why: '会日语的复合人才在日企 IT/制造业非常稀缺，懂语言又肯学技术是弯道超车路线。' },
      { route_id: 'HR-ADMIN-A1', job: '涉外HR/行政', jobs: ['日企HR', '行政专员', '翻译助理'], matchLevel: '中等对口', skills: ['商务日语', '日文翻译', '跨文化沟通'], why: '日资企业急需会日语的 HR/行政，你的语言+协调能力是日企职能岗的加分项。' },
    ],
  },
  {
    subCategory: 'ART-设计',
    label: '设计',
    category: 'ART',
    coreCourses: ['设计素描', '色彩', 'Photoshop', 'Illustrator', 'UI设计', '产品设计', '三维建模'],
    derivedSkills: ['视觉设计', 'PS/AI', 'UI设计', '原型设计', '审美'],
    jobDirections: [
      { route_id: 'IT-PM-A1', job: 'UI/视觉设计师', jobs: ['UI设计师', '视觉设计师', '产品设计师', '交互设计'], matchLevel: '高度对口', skills: ['UI设计', 'PS/AI', '原型设计'], why: '《UI设计》《PS/AI》是 UI/视觉设计岗的对口训练，你的作品集就是最硬的敲门砖。' },
      { route_id: 'IT-PM-A1', job: '产品经理', jobs: ['产品经理', '产品运营', '交互设计'], matchLevel: '中等对口', skills: ['原型设计', 'UI设计', '审美'], why: '设计背景+原型能力，做产品经理对用户体验的感知更敏锐，是设计转产品的天然优势。' },
      { route_id: 'SALES-A1', job: '品牌/市场视觉', jobs: ['品牌设计', '市场物料', '内容运营', '平面设计'], matchLevel: '中等对口', skills: ['视觉设计', '审美', 'PS/AI'], why: '设计能力在品牌与市场物料岗是刚需，很多市场岗把设计能力视作复合加分项。' },
    ],
  },
  {
    subCategory: 'LA-英语',
    label: '汉语国际教育',
    category: 'LA',
    coveredMajors: ['汉语国际教育', '汉语言', '对外汉语', '中文'],
    coreCourses: ['现代汉语', '古代汉语', '语言学概论', '汉语教学法', '跨文化交际', '中国文化', '英语'],
    derivedSkills: ['语言表达', '教学能力', '跨文化沟通', '文案写作', '组织协调'],
    jobDirections: [
      { route_id: 'HR-ADMIN-A1', job: '行政/人事专员', jobs: ['行政专员', '人事专员', '招聘专员', '培训专员'], matchLevel: '中等对口', skills: ['组织协调', '语言表达', '跨文化沟通'], why: '汉教专业表达能力强、组织协调好，转向行政/人事/培训岗很顺，尤其适合需要沟通与培训的岗位。' },
      { route_id: 'IT-PM-A1', job: '内容/文案运营', jobs: ['内容运营', '文案策划', '新媒体运营', '编辑'], matchLevel: '中等对口', skills: ['文案写作', '语言表达', '跨文化沟通'], why: '中文功底扎实、文字表达好，汉教背景做内容/文案/新媒体运营是把语言优势变现的路径。' },
      { route_id: 'SALES-A1', job: '教育/课程顾问', jobs: ['课程顾问', '教育顾问', '招生顾问', '客户成功'], matchLevel: '中等对口', skills: ['语言表达', '跨文化沟通', '组织协调'], why: '懂教学懂沟通，汉教学生做教育/课程顾问、教培行业岗位有天然优势，服务沟通是强项。' },
    ],
  },
];


// ============ 复合专业精确覆盖（优先按专业名匹配）============
// 用于 major_mapping 归入大类但实际课程/岗位有明显差异的复合专业，
// 避免「信息管理=工商管理」这类粗粒度误判，提升认知校正精度。
export const COGNITIVE_KNOWLEDGE_SPECIAL: CognitiveKnowledgeEntry[] = [
  {
    subCategory: 'MGMT-工管',
    label: '信息管理与信息系统',
    category: 'MGMT',
    coveredMajors: ['信息管理与信息系统', '信息管理'],
    coreCourses: ['数据库原理', '管理信息系统', '程序设计(Java/Python)', '计算机网络', '数据结构', '信息管理概论'],
    derivedSkills: ['SQL数据处理', '信息系统分析', '编程', '数据库建模', '业务流程理解'],
    jobDirections: [
      { route_id: 'IT-DA-A1', job: '数据分析师/BI工程师', jobs: ['数据分析师', 'BI工程师', '数据运营', '数据开发'], matchLevel: '高度对口', skills: ['SQL数据处理', '数据库建模', '编程'], why: '你学的《数据库原理》让你具备 SQL 与数据建模硬技能，这是数据分析/BI 岗的入库门槛。' },
      { route_id: 'IT-PM-A1', job: '产品经理/系统实施', jobs: ['产品经理', 'ERP实施顾问', '系统实施', '业务分析师'], matchLevel: '高度对口', skills: ['信息系统分析', '业务流程理解', '需求分析'], why: '《管理信息系统》《信息系统分析》训练的是「懂业务又能提出信息化方案」的能力，正对应产品/实施岗。' },
      { route_id: 'IT-PM-A1', job: 'IT产品运营', jobs: ['产品运营', '数据运营', '内容运营', '运营专员'], matchLevel: '中等对口', skills: ['业务流程理解', 'SQL数据处理', '编程'], why: '信息管理让你既懂业务又懂数据，做互联网产品运营是稀缺的复合型选手。' },
    ],
  },

  {
    subCategory: 'MGMT-会计',
    label: '金融学',
    category: 'MGMT',
    coveredMajors: ['金融学', '金融'],
    coreCourses: ['货币银行学', '国际金融', '公司金融', '证券投资学', '计量经济学', '商业银行经营'],
    derivedSkills: ['金融分析', '财务分析', '风险管理', '数据分析', '市场研究'],
    jobDirections: [
      { route_id: 'IT-DA-A1', job: '金融数据分析/风控', jobs: ['金融分析师', '风控专员', '信贷分析', '投资分析'], matchLevel: '高度对口', skills: ['金融分析', '数据分析', '风险管理'], why: '你学的《计量经济学》《金融分析》给了你数据+金融双能力，银行/券商/互金的数据分析与风控岗正需要这种复合背景。' },
      { route_id: 'MGMT-PM-A1', job: '银行/证券业务岗', jobs: ['银行客户经理', '证券经纪', '理财顾问', '柜员'], matchLevel: '中等对口', skills: ['金融分析', '市场研究', '沟通'], why: '金融专业的《商业银行经营》《证券投资》，直接对口银行/券商的业务与营销岗，考取从业资格即可上手。' },
      { route_id: 'IT-DA-A1', job: '财务分析师/投资研究', jobs: ['财务分析师', '投资研究员', '审计', '经营分析'], matchLevel: '中等对口', skills: ['财务分析', '金融分析', '数据分析'], why: '兼具财务与金融视角，让你在财务分析、投资研究等复合岗比纯财务或纯金融背景更有竞争力。' },
    ],
  },
  {
    subCategory: 'MGMT-工管',
    label: '国际经济与贸易',
    category: 'MGMT',
    coveredMajors: ['国际经济与贸易', '国际经济', '国际贸易', '国贸'],
    coreCourses: ['国际贸易实务', '国际金融', '跨境电商', '商务英语', '外贸函电', '经济学'],
    derivedSkills: ['外贸实务', '商务谈判', '跨境运营', '英语沟通', '市场分析'],
    jobDirections: [
      { route_id: 'SALES-A1', job: '外贸/跨境电商运营', jobs: ['外贸业务员', '跨境电商运营', '海外销售', '国际货代'], matchLevel: '高度对口', skills: ['外贸实务', '跨境运营', '英语沟通'], why: '《国际贸易实务》《跨境电商》正是外贸与跨境岗的核心工作，语言+实务让你在涉外业务岗有天然优势。' },
      { route_id: 'MFG-SCM-A1', job: '供应链/采购', jobs: ['采购专员', '供应链专员', '物流管理', '关务'], matchLevel: '中等对口', skills: ['外贸实务', '商务谈判', '市场分析'], why: '国贸背景懂进出口流程与成本，在供应链/采购岗是懂行的人，制造业外贸部门需求稳定。' },
      { route_id: 'IT-PM-A1', job: '海外市场/商务拓展', jobs: ['海外市场', '商务拓展', '客户经理', '国际项目经理'], matchLevel: '中等对口', skills: ['商务谈判', '市场分析', '英语沟通'], why: '精通外语+懂商业，是出海企业海外市场与商务拓展岗最稀缺的人才画像。' },
    ],
  },
  {
    subCategory: 'IT-计算机',
    label: '数字媒体技术',
    category: 'IT',
    coveredMajors: ['数字媒体技术', '数字媒体'],
    coreCourses: ['数字图像处理', '多媒体技术', '交互设计', 'Web前端', '视频制作', '计算机图形学'],
    derivedSkills: ['前端开发', '界面设计', '多媒体制作', '内容创作', '交互设计'],
    jobDirections: [
      { route_id: 'IT-DEV-A2', job: '前端/交互开发工程师', jobs: ['前端开发', '交互设计', 'Web工程师', '小程序开发'], matchLevel: '高度对口', skills: ['前端开发', '交互设计', '界面设计'], why: '数字媒体技术的《Web前端》《交互设计》，正是前端与交互开发岗的核心技能，你比纯计算机专业更懂视觉与体验。' },
      { route_id: 'IT-PM-A1', job: '产品运营/新媒体', jobs: ['产品运营', '内容运营', '新媒体运营', '视频制作'], matchLevel: '中等对口', skills: ['内容创作', '多媒体制作', '市场分析'], why: '懂技术又懂内容，让你在新媒体、短视频、内容运营岗能独立产出，是互联网公司喜欢的复合型内容人才。' },
      { route_id: 'IT-DEV-A2', job: 'UI/UX设计师', jobs: ['UI设计', 'UX设计', '视觉设计', '动效设计'], matchLevel: '中等对口', skills: ['界面设计', '交互设计', '多媒体制作'], why: '《交互设计》《数字图像处理》训练的设计与审美能力，正对口UI/UX岗，是数字媒体技术最经典的就业去向。' },
    ],
  },
  {
    subCategory: 'ME-机械',
    label: '车辆工程',
    category: 'ME',
    coveredMajors: ['车辆工程', '车辆'],
    coreCourses: ['汽车构造', '汽车理论', '汽车电子', '机械设计', '发动机原理', '汽车CAD'],
    derivedSkills: ['整车设计', '汽车电子', '机械制图', '汽车测试', '工艺理解'],
    jobDirections: [
      { route_id: 'MFG-EE-A2', job: '汽车工艺/设备工程师', jobs: ['工艺工程师', '设备工程师', '整车工艺', '产线工程师'], matchLevel: '高度对口', skills: ['汽车构造', '工艺理解', '机械制图'], why: '车辆工程的《汽车构造》《机械设计》正是整车工艺与设备岗的核心，你比纯机械更懂汽车这个具体产品。' },
      { route_id: 'MFG-EMB-A1', job: '汽车电子/三电工程师', jobs: ['新能源汽车工程师', '电池系统', '电控工程师', '嵌入式'], matchLevel: '中等对口', skills: ['汽车电子', '电池测试', '嵌入式'], why: '《汽车电子》+新能源课程的组合，让你在车企最热的电池/电控/嵌入式岗有专业壁垒，是行业转型的紧缺方向。' },
      { route_id: 'MFG-EE-A3', job: '汽车质量/测试工程师', jobs: ['质量工程师', '汽车测试', '性能工程师', 'NVH'], matchLevel: '中等对口', skills: ['汽车测试', '工艺理解', '机械制图'], why: '懂整车结构与测试流程，让你在汽车质量与性能测试岗容易上手，车企对车辆工程背景的需求稳定。' },
    ],
  },
  {
    subCategory: '其他',
    label: '法学',
    category: 'LA',
    coveredMajors: ['法学', '法律'],
    coreCourses: ['法理学', '民法', '刑法', '商法', '经济法', '民事诉讼法'],
    derivedSkills: ['法律检索', '合同审查', '合规风控', '文书写作', '逻辑论证'],
    jobDirections: [
      { route_id: 'MGMT-PM-A1', job: '企业法务/合规', jobs: ['法务专员', '合规专员', '合同管理', '知识产权'], matchLevel: '高度对口', skills: ['合同审查', '合规风控', '法律检索'], why: '法律专业训练的合同与合规能力，是每家企业法务/合规岗的核心，法学是各行各业都需要的通才专业。' },
      { route_id: 'MGMT-PM-A1', job: '律所/司法辅助岗', jobs: ['律师助理', '实习律师', '法务助理', '诉讼辅助'], matchLevel: '高度对口', skills: ['法律检索', '文书写作', '逻辑论证'], why: '法学的《法理学》《诉讼法》训练了严密的逻辑与文书能力，律师助理/实习律师是法学毕业生最直接的去向。' },
      { route_id: 'IT-PM-A1', job: '金融/互联网合规风控', jobs: ['风控专员', '合规风控', '反洗钱', '数据合规'], matchLevel: '中等对口', skills: ['合规风控', '合同审查', '逻辑论证'], why: '金融与互联网行业越来越重视数据与业务合规，法律背景+行业知识是这类新兴风控岗的黄金组合。' },
    ],
  },
  {
    subCategory: 'EE-电子',
    label: '电子信息工程',
    category: 'EE',
    coveredMajors: ['电子信息工程', '电子信息'],
    coreCourses: ['电路分析', '模拟电子技术', '数字电子技术', '信号与系统', '通信原理', '电磁场与电磁波', '单片机原理'],
    derivedSkills: ['电路设计', '信号处理', '嵌入式开发', '硬件调试', 'PCB设计'],
    jobDirections: [
      { route_id: 'MFG-EE-A1', job: '电子/硬件工程师', jobs: ['电子工程师', '硬件工程师', 'PCB工程师', '测试工程师'], matchLevel: '高度对口', skills: ['电路设计', '硬件调试', 'PCB设计'], why: '你学的《电路分析》《模拟/数字电子技术》《PCB》正是电子/硬件岗的看家本领，电子信息工程是电子制造业最标准的对口出身。' },
      { route_id: 'MFG-EMB-A1', job: '嵌入式/单片机工程师', jobs: ['嵌入式工程师', '单片机工程师', '固件工程师'], matchLevel: '高度对口', skills: ['嵌入式开发', '单片机', '电路设计'], why: '《单片机原理》+ 软硬件兼修，是嵌入式/固件开发岗最理想的专业背景，桂电电子类学生流进这个赛道非常顺。' },
      { route_id: 'MFG-EE-A2', job: '通信/测试工程师', jobs: ['通信测试工程师', '射频测试', '技术支持', '硬件测试'], matchLevel: '中等对口', skills: ['信号处理', '通信原理', '电路设计'], why: '懂《信号与系统》《通信原理》让你能接通信与射频测试岗，华为/中兴等设备商对桂电电子信息背景需求旺盛。' },
    ],
  },
  {
    subCategory: 'EE-电子',
    label: '电子科学与技术',
    category: 'EE',
    coveredMajors: ['电子科学与技术'],
    coreCourses: ['半导体物理', '微电子学', '电路分析', '电磁场与电磁波', '光电子技术', '模拟电子技术'],
    derivedSkills: ['半导体基础', '电路分析', '器件设计', '光电子应用', '元件选型'],
    jobDirections: [
      { route_id: 'MFG-EE-A1', job: '电子/半导体工程师', jobs: ['电子工程师', '半导体工程师', '器件工程师', '硬件工程师'], matchLevel: '高度对口', skills: ['半导体基础', '电路分析', '器件设计'], why: '《半导体物理》《微电子学》让你懂器件内部原理，这正是半导体/电子器件工程师区别于普通电子岗的硬核壁垒。' },
      { route_id: 'MFG-EE-A3', job: '研发/品质工程师', jobs: ['研发工程师', '品质工程师', '失效分析', '可靠性测试'], matchLevel: '中等对口', skills: ['器件设计', '电路分析', '元件选型'], why: '懂器件特性，做电子产品的研发验证/失效分析/可靠性岗非常对口，是电子大厂的稀缺复合方向。' },
      { route_id: 'MFG-EMB-A1', job: '嵌入式/硬件工程师', jobs: ['嵌入式工程师', '硬件工程师', '固件工程师'], matchLevel: '中等对口', skills: ['电路分析', '嵌入式开发', '单片机'], why: '电子科学与技术功底扎实，补单片机后转嵌入式/硬件开发同样顺畅，就业面宽。' },
    ],
  },
  {
    subCategory: 'EE-电子',
    label: '微电子科学与工程',
    category: 'EE',
    coveredMajors: ['微电子科学与工程', '微电子'],
    coreCourses: ['半导体物理', '集成电路设计', '模拟集成电路', '数字集成电路', '微电子工艺', '器件物理'],
    derivedSkills: ['IC设计', '版图设计', '工艺理解', '电路分析', '器件建模'],
    jobDirections: [
      { route_id: 'MFG-EE-A1', job: '芯片/IC设计工程师', jobs: ['数字IC设计', '模拟IC设计', '版图设计', '算法工程师'], matchLevel: '高度对口', skills: ['IC设计', '版图设计', '电路分析'], why: '《集成电路设计》《模拟/数字IC》正是芯片设计岗的核心，微电子是国产芯片赛道最供不应求的专业出身。' },
      { route_id: 'MFG-EE-A2', job: '半导体工艺/设备工程师', jobs: ['工艺工程师', '设备工程师', '晶圆工艺', 'PIE'], matchLevel: '高度对口', skills: ['工艺理解', '器件物理', '电路分析'], why: '懂器件与工艺，是晶圆厂/封测厂的工艺与设备工程师最看重的背景，国产半导体扩产带来大量岗位。' },
      { route_id: 'MFG-EMB-A1', job: '硬件/测试工程师', jobs: ['硬件工程师', 'IC验证', '测试工程师', '嵌入式'], matchLevel: '中等对口', skills: ['电路分析', 'IC设计', '嵌入式开发'], why: '微电子背景既能做芯片也能做板级/验证，转硬件与测试岗优势明显，就业选择灵活。' },
    ],
  },
  {
    subCategory: 'EE-电子',
    label: '光电信息科学与工程',
    category: 'EE',
    coveredMajors: ['光电信息科学与工程', '光电', '光学工程'],
    coreCourses: ['光学', '光电子技术', '激光原理', '光电检测', '信息光学', '电路分析'],
    derivedSkills: ['光学设计', '光电检测', '激光应用', '电路分析', '光学调试'],
    jobDirections: [
      { route_id: 'MFG-EE-A1', job: '光电/光学工程师', jobs: ['光学工程师', '光电工程师', '激光工程师', '光学设计'], matchLevel: '高度对口', skills: ['光学设计', '光电检测', '激光应用'], why: '《光学》《光电子技术》《激光原理》正是光电/光学岗的核心，光电在激光雷达、显示、传感等赛道需求增长快。' },
      { route_id: 'MFG-EE-A2', job: '研发/工艺工程师', jobs: ['研发工程师', '工艺工程师', '光机工程师'], matchLevel: '中等对口', skills: ['光电检测', '电路分析', '光学调试'], why: '光电背景 + 电路基础，做光机/光电检测类研发与工艺岗很对口，是精密制造与消费电子的热门方向。' },
      { route_id: 'MFG-EMB-A1', job: '硬件/嵌入式工程师', jobs: ['硬件工程师', '嵌入式工程师', '测试工程师'], matchLevel: '中等对口', skills: ['电路分析', '光电检测', '嵌入式开发'], why: '光学+电学双背景，转硬件/嵌入式开发有独特优势，光电传感类产品尤其需要这种交叉人才。' },
    ],
  },
  {
    subCategory: 'IT-计算机',
    label: '数据科学与大数据技术',
    category: 'IT',
    coveredMajors: ['数据科学与大数据技术', '大数据', '数据科学'],
    coreCourses: ['数据结构', '数据库原理', 'Python程序设计', '机器学习', '大数据技术', '数据挖掘', '统计学'],
    derivedSkills: ['数据分析', '数据挖掘', '机器学习', '编程', '可视化', 'SQL数据处理'],
    jobDirections: [
      { route_id: 'IT-DA-A1', job: '数据分析师/数据开发', jobs: ['数据分析师', '数据开发', 'BI工程师', '数据运营'], matchLevel: '高度对口', skills: ['数据分析', 'SQL数据处理', '编程'], why: '《数据库》《Python》《数据挖掘》让你具备完整的数据采集-处理-分析链，是数据分析/数据开发岗的硬门槛。' },
      { route_id: 'IT-DEV-A1', job: 'AI/算法工程师', jobs: ['算法工程师', '机器学习工程师', '数据挖掘工程师'], matchLevel: '高度对口', skills: ['机器学习', '数据挖掘', '编程'], why: '《机器学习》《数据挖掘》+ 代码功底，正对口 AI 算法与数据挖掘岗，是大数据专业最值钱的方向。' },
      { route_id: 'IT-PM-A1', job: '数据产品/运营', jobs: ['数据产品经理', '数据运营', '商业分析'], matchLevel: '中等对口', skills: ['数据分析', '可视化', '市场研究'], why: '既懂数据又会讲故事，做数据产品/商业化分析比纯业务背景更有说服力，是复合型数据人才。' },
    ],
  },
  {
    subCategory: 'ME-自动化',
    label: '测控技术与仪器',
    category: 'ME',
    coveredMajors: ['测控技术与仪器', '测控', '仪器'],
    coreCourses: ['传感器技术', '检测技术', '自动控制原理', '单片机', '嵌入式系统', '信号处理'],
    derivedSkills: ['传感器应用', '测量技术', '嵌入式开发', '控制系统', '信号处理'],
    jobDirections: [
      { route_id: 'ME-自动化', job: '测控/仪器工程师', jobs: ['测控工程师', '仪器工程师', '计量工程师', '传感器工程师'], matchLevel: '高度对口', skills: ['传感器应用', '测量技术', '控制系统'], why: '《传感器技术》《检测技术》《自动控制》正是测控/仪器岗的核心，汽车、制造、医疗器械都大量需要测控人才。' },
      { route_id: 'MFG-EMB-A1', job: '嵌入式/硬件工程师', jobs: ['嵌入式工程师', '硬件工程师', '固件工程师', '仪器开发'], matchLevel: '高度对口', skills: ['嵌入式开发', '单片机', '传感器应用'], why: '测控专业软硬件都强，《单片机》《嵌入式》让转嵌入式/仪器开发岗几乎无缝，就业面非常宽。' },
      { route_id: 'MFG-EE-A2', job: '自动化/设备工程师', jobs: ['自动化工程师', '设备工程师', '工艺工程师'], matchLevel: '中等对口', skills: ['控制系统', '传感器应用', '信号处理'], why: '懂控制懂检测，是工厂自动化/设备岗的黄金配置，测控背景在制造业升级里越来越吃香。' },
    ],
  },
  {
    subCategory: 'ME-自动化',
    label: '机器人工程',
    category: 'ME',
    coveredMajors: ['机器人工程', '机器人'],
    coreCourses: ['机器人学', '控制理论', '嵌入式系统', '传感器技术', '电机控制', '编程'],
    derivedSkills: ['机器人控制', '嵌入式开发', '传感器应用', '系统集成', '编程'],
    jobDirections: [
      { route_id: 'ME-自动化', job: '机器人/自动化工程师', jobs: ['机器人工程师', '自动化工程师', 'PLC工程师', '控制工程师'], matchLevel: '高度对口', skills: ['机器人控制', '控制系统', '编程'], why: '《机器人学》《控制理论》《电机控制》正是机器人/自动化岗的核心，智能制造与机器人行业正大量扩招。' },
      { route_id: 'MFG-EMB-A1', job: '嵌入式/硬件工程师', jobs: ['嵌入式工程师', '硬件工程师', '智能硬件', '固件工程师'], matchLevel: '高度对口', skills: ['嵌入式开发', '传感器应用', '编程'], why: '机器人工程的《嵌入式》《传感器》让转智能硬件/嵌入式岗非常有优势，是软硬件一体的复合人才。' },
      { route_id: 'MFG-EE-A2', job: '设备/工艺工程师', jobs: ['设备工程师', '工艺工程师', '产线自动化', 'NPI'], matchLevel: '中等对口', skills: ['系统集成', '控制系统', '传感器应用'], why: '懂自动化产线，机器人背景在制造业设备/工艺岗升级路径清晰，智能制造转型需求旺盛。' },
    ],
  },
];

// ============ 全部汇总 ============
// ============ 全部汇总 ============
export const ALL_COGNITIVE_KNOWLEDGE: CognitiveKnowledgeEntry[] = [
  ...COGNITIVE_KNOWLEDGE_SPECIAL,
  ...COGNITIVE_KNOWLEDGE,
  ...COGNITIVE_KNOWLEDGE_ME,
  ...COGNITIVE_KNOWLEDGE_MGMT,
  ...COGNITIVE_KNOWLEDGE_LA,
];
