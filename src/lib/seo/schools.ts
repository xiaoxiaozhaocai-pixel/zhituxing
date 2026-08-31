/**
 * 学校专区 · 学校配置（真实公开数据驱动，守四真）
 *
 * 桂林电子科技大学（guet）：数据来自学校官网及公开资料，完整可背调。
 * 其余学校：仅含公开可知的基本信息（校名/城市/省份/类型），其余字段留空，
 *           落地页显示"数据待积累"占位，不编造校训/排名/学生数/就业率。
 *
 * 新增学校：只需在 SCHOOLS 数组加一条记录，学校专区列表与详情页自动扩展。
 */

export interface SchoolProfile {
  slug: string;
  name: string;
  shortName: string;
  enName?: string;
  city: string;
  province: string;
  type: string;
  tags: string[];
  motto?: string;
  governing?: string;
  foundedYear?: string;
  spirit?: string;
  description: string;
  sourceNote: string;
  strongMajors: string[];
  /** 用于匹配 job_descriptions.major_require 的关键词 */
  majorKeywords: string[];
  /** 学校定位标签 */
  highlights: string[];
  /** 是否已有完整数据（false 时详情页显示占位） */
  isComplete: boolean;
}

export const SCHOOLS: SchoolProfile[] = [
  {
    slug: 'guet',
    name: '桂林电子科技大学',
    shortName: '桂电',
    enName: 'Guilin University Of Electronic Technology',
    city: '桂林',
    province: '广西',
    type: '理工类',
    tags: ['电子', '通信', '计算机', '机械', '材料'],
    motto: '正德厚学、笃行致新',
    governing:
      '工业和信息化部与广西壮族自治区人民政府共建；国家国防科技工业局与广西共建',
    foundedYear: '1960',
    spirit: '艰苦创业、自强不息',
    description:
      '桂林电子科技大学是全国四所电子科技大学之一（电子科技大学、西安电子科技大学、杭州电子科技大学、桂林电子科技大学），坐落于广西桂林市，是工业和信息化部与广西壮族自治区人民政府共建高校，国家国防科技工业局与广西壮族自治区共建高校。学校以电子、通信、计算机、机械、材料等工科为特色，1960年创办，校训"正德厚学、笃行致新"。',
    sourceNote: '数据来源：桂林电子科技大学官网（guet.edu.cn）及公开资料',
    strongMajors: [
      '电子信息类',
      '通信工程',
      '计算机科学与技术',
      '软件工程',
      '机械设计制造及其自动化',
      '材料科学与工程',
    ],
    majorKeywords: ['电子', '通信', '计算机', '软件', '机械', '材料'],
    highlights: [
      '全国四所电子科技大学之一',
      '工信部与广西共建',
      '国防科技工业局与广西共建',
    ],
    isComplete: true,
  },
  {
    slug: 'gxnu',
    name: '广西师范大学',
    shortName: '广西师大',
    city: '桂林',
    province: '广西',
    type: '师范类',
    tags: ['师范', '文科', '理科'],
    description: '广西师范大学，位于广西桂林市。',
    sourceNote: '数据待积累 — 学校概况详情请以学校官网为准',
    strongMajors: [],
    majorKeywords: ['师范', '教育', '文学', '历史'],
    highlights: [],
    isComplete: false,
  },
  {
    slug: 'glut',
    name: '桂林理工大学',
    shortName: '桂工',
    city: '桂林',
    province: '广西',
    type: '理工类',
    tags: ['理工', '地质', '材料'],
    description: '桂林理工大学，位于广西桂林市。',
    sourceNote: '数据待积累 — 学校概况详情请以学校官网为准',
    strongMajors: [],
    majorKeywords: ['理工', '地质', '材料', '环境'],
    highlights: [],
    isComplete: false,
  },
  {
    slug: 'guat',
    name: '桂林航天工业学院',
    shortName: '桂航',
    city: '桂林',
    province: '广西',
    type: '理工类',
    tags: ['航天', '航空', '理工'],
    description: '桂林航天工业学院，位于广西桂林市。',
    sourceNote: '数据待积累 — 学校概况详情请以学校官网为准',
    strongMajors: [],
    majorKeywords: ['航天', '航空', '机械', '电子'],
    highlights: [],
    isComplete: false,
  },
  {
    slug: 'gltu',
    name: '桂林旅游学院',
    shortName: '桂旅',
    city: '桂林',
    province: '广西',
    type: '综合类',
    tags: ['旅游', '管理', '文科'],
    description: '桂林旅游学院，位于广西桂林市。',
    sourceNote: '数据待积累 — 学校概况详情请以学校官网为准',
    strongMajors: [],
    majorKeywords: ['旅游', '酒店', '管理'],
    highlights: [],
    isComplete: false,
  },
];

export function getSchoolBySlug(slug: string): SchoolProfile | undefined {
  return SCHOOLS.find((s) => s.slug === slug);
}

export function getRelatedSchools(slug: string, limit = 4): SchoolProfile[] {
  return SCHOOLS.filter((s) => s.slug !== slug).slice(0, limit);
}
