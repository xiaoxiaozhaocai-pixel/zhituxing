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
  {
    id: 'product_manager',
    name: '互联网产品经理',
    category: '互联网',
    aliases: ['互联网产品经理', '产品', 'PM', '产品专员', '产品岗'],
    layers: [
      {
        layer: 'industry', label: '行业知识', weight: 20,
        items: [
          '互联网产品形态（C端/内容/工具/商业化）',
          '用户增长与留存（AARRR / 北极星指标）',
          '产品生命周期（需求→设计→上线→迭代）',
          '竞品分析框架（功能/定位/用户体验对比）',
        ],
      },
      {
        layer: 'hard', label: '硬技能', weight: 40,
        items: [
          'PRD / 需求文档撰写',
          '原型设计（Axure / Figma / 墨刀）',
          'SQL / 数据漏斗与留存分析',
          '埋点方案 / A-B 实验设计',
          '用户调研 / 用户访谈 / 可用性测试',
          'Scrum / 敏捷迭代流程',
        ],
      },
      {
        layer: 'soft', label: '软技能', weight: 25,
        items: [
          '用户同理心（从用户视角定义需求）',
          '跨团队协作（研发/设计/运营/市场协调）',
          '优先级判断与取舍（价值 vs 成本）',
          '沟通表达与文档输出能力',
        ],
      },
      {
        layer: 'signal', label: '经验信号', weight: 15,
        items: [
          '从0到1 产品上线经验（有完整链路）',
          '数据驱动迭代案例（指标前后有量化对比）',
          '用户访谈/可用性测试沉淀（有结论与改进）',
        ],
      },
    ],
    recommendCompanies: ['字节跳动', '腾讯', '网易', '小红书', '哔哩哔哩'],
    studyPaths: {
      'PRD': '学 Axure/Figma + 输出一份完整 PRD（约2周）',
      'SQL': '学 SQL + 做一次漏斗/留存分析（约2周）',
      '竞品分析': '拆 3 个同赛道产品的功能链路（约1周）',
      '埋点': '了解埋点方案 + 设计一次 A/B 实验（约1周）',
    },
  },
  {
    id: 'new_media_operator',
    name: '新媒体运营',
    category: '互联网/新媒体',
    aliases: ['运营', '新媒体运营', '内容运营', '用户运营', '互联网运营'],
    layers: [
      {
        layer: 'industry', label: '行业知识', weight: 20,
        items: [
          '内容平台机制（公众号/小红书/抖音/B站）',
          '流量与转化链路（曝光→点击→互动→转化）',
          '用户生命周期（拉新/促活/留存/转化）',
          '算法与信息流分发逻辑',
        ],
      },
      {
        layer: 'hard', label: '硬技能', weight: 40,
        items: [
          '内容策划/文案/排版（爆款标题与钩子）',
          '短视频拍摄与剪辑（剪映 / PR）',
          '数据复盘（阅读/完播/互动/转化率）',
          '社群运营与私域工具（企微/SCRM）',
          '广告投放（信息流 / DOU+ / 薯条）',
        ],
      },
      {
        layer: 'soft', label: '软技能', weight: 25,
        items: [
          '网感与热点敏感度',
          '用户同理心（站在读者视角选题）',
          '数据复盘与迭代思维',
          '多线程执行与抗压（内容节奏快）',
        ],
      },
      {
        layer: 'signal', label: '经验信号', weight: 15,
        items: [
          '运营账号/社群（有涨粉或互动数据）',
          '爆款内容案例（有过万阅读/点赞）',
          '从0做起一个内容的完整闭环',
        ],
      },
    ],
    recommendCompanies: ['小红书', '字节跳动', '网易', '哔哩哔哩', '快手'],
    studyPaths: {
      '内容策划': '选题→写→排版，做 10 篇内容并复盘数据（约2周）',
      '短视频': '学剪映 + 做 5 条短视频（约1周）',
      '数据复盘': '用平台后台学看数据并做复盘报告（约1周）',
      '社群运营': '学私域工具 + 实操一次群运营（约1周）',
    },
  },
  {
    id: 'java_backend',
    name: 'Java后端开发工程师',
    category: '软件开发',
    aliases: ['Java', 'Java开发', '后端开发', '后端工程师', 'Java工程师'],
    layers: [
      {
        layer: 'industry', label: '行业知识', weight: 20,
        items: [
          '互联网后端架构（微服务/分布式/高并发）',
          'HTTP / RESTful 协议与接口设计',
          '常见业务域（电商/支付/内容/企业服务）',
          '开发与部署流程（Git / 版本管理 / 上线）',
        ],
      },
      {
        layer: 'hard', label: '硬技能', weight: 40,
        items: [
          'Java 集合 / 并发 / JVM',
          'Spring Boot / Spring Cloud / MyBatis',
          'MySQL 索引 / 事务 / 锁 / 优化',
          'Redis 缓存与缓存策略',
          '消息队列（Kafka / RabbitMQ）',
          '基础算法与数据结构',
          'Linux / Docker 基础',
        ],
      },
      {
        layer: 'soft', label: '软技能', weight: 25,
        items: [
          '代码规范与可读性',
          '问题排查（日志/调试/定位根因）',
          '团队协作与 Code Review',
          '自驱学习新技术',
        ],
      },
      {
        layer: 'signal', label: '经验信号', weight: 15,
        items: [
          '独立完成可运行后端项目（CRUD + 接口）',
          '性能优化 / 并发处理案例（带量化）',
          '参与真实团队项目（有 Git 协作记录）',
        ],
      },
    ],
    recommendCompanies: ['字节跳动', '腾讯', '网易', '美团', '京东'],
    studyPaths: {
      'Spring': '学 Spring Boot + 做一个 CRUD 后端（约1周）',
      'MySQL': '学索引/事务/优化 + 做一次慢查询优化（约1周）',
      'Redis': '学缓存策略 + 做一个缓存案例（约3天）',
      '算法': '刷 LeetCode 50 题 + 掌握常用算法（约2周）',
    },
  },
  {
    id: 'qa_engineer',
    name: '软件测试开发工程师',
    category: '软件开发/测试',
    aliases: ['测试', '软件测试', 'QA', '测试开发', '测试工程师'],
    layers: [
      {
        layer: 'industry', label: '行业知识', weight: 20,
        items: [
          '软件研发流程（需求→开发→测试→上线）',
          '测试类型（功能/接口/性能/安全/回归）',
          '缺陷管理与质量指标（覆盖率/漏测率）',
          '敏捷与迭代测试节奏',
        ],
      },
      {
        layer: 'hard', label: '硬技能', weight: 40,
        items: [
          '测试用例设计（等价类/边界值/判定表）',
          '接口测试（Postman / Jmeter）',
          '自动化测试（Selenium / Python / Pytest）',
          'SQL 与数据库验证',
          'Linux 命令与环境搭建',
          '性能测试（Jmeter / Locust）',
        ],
      },
      {
        layer: 'soft', label: '软技能', weight: 25,
        items: [
          '细心与严谨（不放过边界）',
          '缺陷表达与沟通（重复性强/复现路径清晰）',
          '逆向思维（站在找 bug 视角）',
          '跨团队协作与推动修复',
        ],
      },
      {
        layer: 'signal', label: '经验信号', weight: 15,
        items: [
          '独立负责模块测试（有问题排查记录）',
          '自动化脚本沉淀（可复用脚本）',
          '功能/性能测试报告（带量化数据）',
        ],
      },
    ],
    recommendCompanies: ['字节跳动', '网易', '腾讯', '京东', '华为'],
    studyPaths: {
      '用例设计': '学等价类/边界值 + 写 20 条用例（约3天）',
      'Selenium': '学 Selenium + 做一个自动化脚本（约1周）',
      '接口测试': '学 Postman/Jmeter + 跑一个接口项目（约1周）',
      'Jmeter': '学性能测试 + 做一个压测报告（约1周）',
    },
  },
  {
    id: 'data_analyst',
    name: '数据分析师',
    category: '互联网/数据',
    aliases: ['数据分析', '数据', '分析师', '商业分析师'],
    layers: [
      {
        layer: 'industry', label: '行业知识', weight: 20,
        items: [
          '业务指标体系（GMV/留存/DAU/转化率）',
          '数据产品形态（报表/看板/异动归因）',
          '常见业务域（电商/内容/增长）',
          'AARRR 增长模型',
        ],
      },
      {
        layer: 'hard', label: '硬技能', weight: 40,
        items: [
          'SQL（多表/聚合/窗口函数）',
          'Excel 高阶（透视表/函数）',
          'Python 数据处理（Pandas / NumPy）',
          '统计与 A-B 测试',
          '可视化（Tableau / PowerBI / 图表）',
        ],
      },
      {
        layer: 'soft', label: '软技能', weight: 25,
        items: [
          '业务理解与指标口径对齐',
          '数据驱动决策（用数据说服）',
          '结论表达与呈现能力',
          '问题拆解（MECE 框架）',
        ],
      },
      {
        layer: 'signal', label: '经验信号', weight: 15,
        items: [
          '独立完成数据分析报告（有业务结论）',
          '搭建看板/可视化（有落地）',
          '用数据驱动的业务改进案例（带量化）',
        ],
      },
    ],
    recommendCompanies: ['字节跳动', '滴滴', '阿里巴巴', '美团', '京东'],
    studyPaths: {
      'SQL': '学 SQL 窗口函数 + 做 20 道练习题（约1周）',
      'Pandas': '学 Pandas 数据清洗 + 一个分析案例（约1周）',
      'AB测试': '了解 A-B 测试原理 + 设计一次实验（约3天）',
      'Tableau': '学 Tableau + 做一个交互看板（约1周）',
    },
  },
  {
    id: 'embedded_software',
    name: '嵌入式软件工程师',
    category: '电子/嵌入式',
    aliases: ['嵌入式', '嵌入式软件', '嵌入式开发', '单片机', '底层开发'],
    layers: [
      {
        layer: 'industry', label: '行业知识', weight: 20,
        items: [
          '嵌入式系统架构（MCU / SoC / 驱动 / RTOS）',
          '智能硬件/物联网产品（车载/工业/穿戴）',
          '开发流程（交叉编译/烧录/调试）',
          '嵌入式 C/C++ 应用场景',
        ],
      },
      {
        layer: 'hard', label: '硬技能', weight: 40,
        items: [
          'C / C++ 语言（指针/内存/结构体）',
          'STM32 / MCU 开发（GPIO/UART/SPI/I2C/ADC/TIM）',
          'RTOS（FreeRTOS 任务/信号量/队列）',
          '通信协议（UART/I2C/SPI/CAN）',
          '开发环境（Keil/STM32CubeIDE + J-Link）',
          'Linux 驱动基础',
        ],
      },
      {
        layer: 'soft', label: '软技能', weight: 25,
        items: [
          '软硬件协同思维',
          '问题定位（示波器/逻辑分析仪）',
          '代码规范与注释文档',
          '动手能力（焊接/万用表）',
        ],
      },
      {
        layer: 'signal', label: '经验信号', weight: 15,
        items: [
          '独立完成嵌入式项目（小车/传感器采集等）',
          '底层驱动调试经验',
          '参与智能硬件/车载项目',
        ],
      },
    ],
    recommendCompanies: ['大疆', '海康威视', '华为', '小米', '汇川技术'],
    studyPaths: {
      'C': '学 C 指针/结构体 + 做一个小程序（约2周）',
      'STM32': '学 STM32 + 做一个外设控制项目（约2周）',
      'RTOS': '学 FreeRTOS 任务调度 + 做一个多任务案例（约1周）',
      'Linux': '学交叉编译 + 做一个驱动小实验（约2周）',
    },
  },
  {
    id: 'hardware_engineer',
    name: '硬件工程师',
    category: '电子/硬件',
    aliases: ['硬件', '硬件工程师', 'PCB', '硬件开发', '电路设计'],
    layers: [
      {
        layer: 'industry', label: '行业知识', weight: 20,
        items: [
          '电子产品开发流程（原理图/PCB/打样/调试/量产）',
          '常用元器件与选型',
          '电磁兼容（EMC）基础',
          '硬件可靠性（温漂/静电/抗干扰）',
        ],
      },
      {
        layer: 'hard', label: '硬技能', weight: 40,
        items: [
          '数电/模电基础',
          '原理图设计（Altium Designer / Cadence）',
          'PCB 布局布线（阻抗/信号完整性）',
          '元器件选型与 BOM',
          '示波器/万用表/逻辑分析仪使用',
          '电路焊接与调试',
        ],
      },
      {
        layer: 'soft', label: '软技能', weight: 25,
        items: [
          '仿真与验证思维（先建模/搭板再测）',
          '跨团队沟通（结构/软件/生产）',
          '严谨与细节（容差/可靠性）',
          '成本与可制造性意识',
        ],
      },
      {
        layer: 'signal', label: '经验信号', weight: 15,
        items: [
          '独立完成硬件项目（设计→打样→调试）',
          '原理图/PCB 布线经验',
          '参与量产项目（有 EMC/可靠性改进）',
        ],
      },
    ],
    recommendCompanies: ['大疆', '华为', '海康威视', '小米', '立讯精密'],
    studyPaths: {
      '数电模电': '复习数电/模电 + 做一个电路设计小项目（约2周）',
      'Altium': '学 Altium Designer + 画一块 PCB（约2周）',
      '示波器': '学示波器/万用表使用 + 测一个电路（约1周）',
      '元器件': '学元器件选型 + 做一份 BOM（约3天）',
    },
  },
  {
    id: 'telecom_engineer',
    name: '通信工程师',
    category: '通信/ICT',
    aliases: ['通信', '通信工程师', '通信技术', '网络优化', '无线通信'],
    layers: [
      {
        layer: 'industry', label: '行业知识', weight: 20,
        items: [
          '移动通信网络架构（无线/核心网/承载网）',
          '5G 关键技术（Massive MIMO/网络切片/毫米波）',
          '通信协议（LTE/5G NR）与传输交换基础',
          '网络测试与优化（路测/信令分析/KPI）',
        ],
      },
      {
        layer: 'hard', label: '硬技能', weight: 40,
        items: [
          '通信原理 / 信号与系统基础',
          'MATLAB 仿真（信道建模/信号处理）',
          '网络优化（路测/信令/KPI 分析）',
          '传输与交换（光通信/数据交换）',
          'Python 数据处理与脚本',
        ],
      },
      {
        layer: 'soft', label: '软技能', weight: 25,
        items: [
          '问题定位（信号→参数→系统分层排障）',
          '数据驱动（用 KPI/指标说话）',
          '现场沟通（项目/基站/客户）',
          '抗压（项目驻场/外场测试）',
        ],
      },
      {
        layer: 'signal', label: '经验信号', weight: 15,
        items: [
          '参与网络优化/测试项目，有量化结论',
          '独立撰写测试或优化报告',
          '有 5G 相关课程设计/仿真项目',
        ],
      },
    ],
    recommendCompanies: ['华为', '中兴', '中国移动', '中国电信', '烽火通信', '海能达'],
    studyPaths: {
      '通信原理': '复习通信原理 + 做一个通信系统仿真（约2周）',
      'MATLAB': '学 MATLAB 仿真 + 做 5G 信道建模（约2周）',
      '网络优化': '学路测/信令分析 + 模拟 KPI 调优（约1周）',
      'Python': '用 Python 处理一份 KPI 数据并画图（约1周）',
    },
  },
  {
    id: 'frontend_developer',
    name: '前端开发工程师',
    category: '互联网/软件',
    aliases: ['前端', '前端开发', 'Web前端', '前端工程师', '大前端'],
    layers: [
      {
        layer: 'industry', label: '行业知识', weight: 20,
        items: [
          'Web 基础（HTML/CSS/JS）',
          '主流框架（React/Vue）',
          '构建与部署流程',
          '浏览器原理与前端工程化',
        ],
      },
      {
        layer: 'hard', label: '硬技能', weight: 40,
        items: [
          'HTML/CSS/JavaScript 基础',
          'React 或 Vue 框架',
          'TypeScript 类型系统',
          '接口对接（fetch/axios）与状态管理',
          'Git 协作与版本控制',
        ],
      },
      {
        layer: 'soft', label: '软技能', weight: 25,
        items: [
          '需求理解（产品→交互→还原）',
          '跨团队协作（设计/后端）',
          '细节与视觉还原',
          '自学适应新技术',
        ],
      },
      {
        layer: 'signal', label: '经验信号', weight: 15,
        items: [
          '独立完成可运行/可访问的前端项目',
          '参与真实需求迭代（有上线/联调）',
          '有性能或交互优化案例',
        ],
      },
    ],
    recommendCompanies: ['字节跳动', '腾讯', '美团', '网易', '微众银行', '大疆'],
    studyPaths: {
      'React': '学 React + 做一个可运行的页面（约2周）',
      'TypeScript': '学 TS + 重构一个 JS 项目（约1周）',
      'Git': '学分支/合并 + 用 Git 托管项目（约2天）',
      'CSS': '学 Flex/Grid + 还原一个页面（约1周）',
    },
  },
  {
    id: 'supply_chain_specialist',
    name: '供应链/采购专员',
    category: '制造/供应链',
    aliases: ['供应链', '采购', '供应链专员', '采购工程师', '物控'],
    layers: [
      {
        layer: 'industry', label: '行业知识', weight: 20,
        items: [
          '供应链全流程（计划/采购/生产/物流/仓储）',
          '供应商管理与开发',
          '采购成本与交期控制',
          'ERP/MES 系统与物料管理',
        ],
      },
      {
        layer: 'hard', label: '硬技能', weight: 40,
        items: [
          '采购流程与供应商开发',
          '成本分析（采购/库存）',
          'ERP 系统（SAP/用友/金蝶）',
          'Excel 数据分析（透视表）',
          '合同与交期管理',
        ],
      },
      {
        layer: 'soft', label: '软技能', weight: 25,
        items: [
          '谈判与沟通（供应商/内部）',
          '成本与风险意识',
          '跨部门协调（产/销/采/仓）',
          '细致与责任心',
        ],
      },
      {
        layer: 'signal', label: '经验信号', weight: 15,
        items: [
          '参与采购/供应商项目',
          '会用 ERP 或有成本优化案例',
          '实习中有供应链流程经验',
        ],
      },
    ],
    recommendCompanies: ['比亚迪', '立讯精密', '富士康', '冠宇电池', '华为（供应链）', '顺丰'],
    studyPaths: {
      'ERP': '学一款 ERP + 录入一套模拟数据（约1周）',
      '成本分析': '学采购成本拆解 + 做一个案例（约1周）',
      'Excel': '学透视表 + 做一份库存分析（约2天）',
      '合同': '学采购合同要点（约3天）',
    },
  },
  {
    id: 'automation_engineer',
    name: '自动化控制工程师',
    category: '制造/自动化',
    aliases: ['自动化', '自动化工程师', '电气自动化', '控制工程师', 'PLC'],
    layers: [
      {
        layer: 'industry', label: '行业知识', weight: 20,
        items: [
          '自动化系统构成（传感器/PLC/伺服/机器人）',
          '产线自动控制与电气图纸',
          '工业通信（Modbus/Profinet）',
          '安全与规范意识',
        ],
      },
      {
        layer: 'hard', label: '硬技能', weight: 40,
        items: [
          'PLC 编程（西门子/三菱）',
          '电气设计（Eplan/AutoCAD Electrical）',
          '运动控制（伺服/变频）',
          '传感器与执行器选型',
          'HMI 组态与梯形图/结构化文本',
        ],
      },
      {
        layer: 'soft', label: '软技能', weight: 25,
        items: [
          '现场调试与排故',
          '工程思维（分层定位/系统排查）',
          '跨部门协调（设备/工艺/品质）',
          '安全操作规范',
        ],
      },
      {
        layer: 'signal', label: '经验信号', weight: 15,
        items: [
          '独立完成 PLC 调试',
          '有产线改造/自动化项目',
          '会电气图纸与编程',
        ],
      },
    ],
    recommendCompanies: ['汇川技术', '大族激光', '比亚迪', '立讯精密', '富士康', '中控技术'],
    studyPaths: {
      'PLC': '学西门子 PLC + 做一个控制案例（约3周）',
      '电气设计': '学 Eplan/电气图纸（约2周）',
      '运动控制': '学伺服/变频 + 做一个仿真（约2周）',
      'C语言': '复习 C + 写控制程序（约2周）',
    },
  },
  {
    id: 'algorithm_engineer',
    name: '算法工程师',
    category: 'AI/数据',
    aliases: ['算法', '算法工程师', 'AI', '机器学习', '深度学习'],
    layers: [
      {
        layer: 'industry', label: '行业知识', weight: 20,
        items: [
          '机器学习 / 深度学习基础',
          'NLP / CV 主流任务',
          '模型训练与部署',
          '数据与特征工程',
        ],
      },
      {
        layer: 'hard', label: '硬技能', weight: 40,
        items: [
          'Python 编程',
          '机器学习（sklearn/基础模型）',
          '深度学习框架（PyTorch/TensorFlow）',
          '数据处理与特征构建',
          '模型评估与调优',
        ],
      },
      {
        layer: 'soft', label: '软技能', weight: 25,
        items: [
          '理论研究与落地的平衡',
          '数据敏感与业务理解',
          '跨团队协作（产品/后端）',
          '持续学习新技术',
        ],
      },
      {
        layer: 'signal', label: '经验信号', weight: 15,
        items: [
          '可复现的算法项目',
          '竞赛/论文/开源经历',
          '模型部署到真实场景',
        ],
      },
    ],
    recommendCompanies: ['字节跳动', '华为', '腾讯', '科大讯飞', '大疆', '商汤科技'],
    studyPaths: {
      'Python': '复习 Python + 写数据处理脚本（约1周）',
      '机器学习': '学 sklearn + 做一个分类任务（约2周）',
      'PyTorch': '学深度学习 + 做一个小模型（约3周）',
      '论文复现': '复现一篇算法论文（约3周）',
    },
  },
  {
    id: 'hr_specialist',
    name: 'HR人事专员',
    category: '职能/HR',
    aliases: ['HR', '人事', '人事专员', 'HR专员', '招聘专员'],
    layers: [
      {
        layer: 'industry', label: '行业知识', weight: 20,
        items: [
          '人力资源六大模块（招聘/培训/绩效/薪酬/员工关系）',
          '招聘全流程与人才画像',
          '劳动法规基础',
          'HR 系统 / ATS',
        ],
      },
      {
        layer: 'hard', label: '硬技能', weight: 40,
        items: [
          '招聘流程与面试组织',
          '简历筛选与人才评估',
          '员工关系与社保办理',
          'Excel / HR SaaS 系统',
          '劳动法常识与制度起草',
        ],
      },
      {
        layer: 'soft', label: '软技能', weight: 25,
        items: [
          '沟通与同理心（候选人与员工）',
          '组织协调能力',
          '数据敏感（报表/看板）',
          '保密与职业操守',
        ],
      },
      {
        layer: 'signal', label: '经验信号', weight: 15,
        items: [
          '参与校园招聘/面试环节',
          '有 HR 实习或招聘支持经历',
          '会做薪资/考勤报表',
        ],
      },
    ],
    recommendCompanies: ['比亚迪', '立讯精密', '顺丰', '华为', '本地互联网公司', '各企业HR部门'],
    studyPaths: {
      '招聘': '学招聘全流程 + 模拟发 JD/筛选（约1周）',
      '劳动法': '学劳动法基础条款（约3天）',
      'Excel': '做一份考勤/薪资报表（约2天）',
      'HR系统': '了解主流 ATS/HR SaaS（约2天）',
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

/** 从自然语言文本里抽出命中的内置岗位名（chat 意图用）——按 name/alias 在文本里的包含关系匹配 */
export function findJobInText(text: string): string | undefined {
  const t = (text || '').toLowerCase();
  if (!t) return undefined;
  for (const job of JOBS) {
    if (t.includes(job.name.toLowerCase())) return job.name;
    for (const a of job.aliases) {
      if (a && t.includes(a.toLowerCase())) return job.name;
    }
  }
  return undefined;
}
