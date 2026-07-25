// 职途星组态引擎 · 学校档次映射表

export interface SchoolTierEntry {
  name: string;
  tier: string;       // 一本/211/985/二本/大专
  score: number;      // 编码值
  keywords: string[]; // 匹配关键词
}

/** 学校映射表（可扩展） */
export const SCHOOL_TIER_MAP: SchoolTierEntry[] = [
  // === 桂电及其关联 ===
  { name: '桂林电子科技大学', tier: '一本', score: 0.50, keywords: ['桂电', '桂林电子科技大学', '桂林电子'] },
  { name: '桂电(一本)', tier: '一本', score: 0.50, keywords: ['桂电'] },

  // === 一本（非211） ===
  // 广西一本
  { name: '广西大学', tier: '一本', score: 0.50, keywords: ['广西大学'] },
  { name: '广西师范大学', tier: '一本', score: 0.50, keywords: ['广西师范大学'] },
  { name: '广西医科大学', tier: '一本', score: 0.50, keywords: ['广西医科大学'] },
  { name: '桂林理工大学', tier: '一本', score: 0.50, keywords: ['桂林理工'] },
  { name: '广西民族大学', tier: '一本', score: 0.50, keywords: ['广西民族大学'] },

  // === 211 ===
  { name: '北京邮电大学', tier: '211', score: 0.75, keywords: ['北邮', '北京邮电'] },
  { name: '西安电子科技大学', tier: '211', score: 0.75, keywords: ['西电', '西安电子科技大学'] },
  { name: '南京航空航天大学', tier: '211', score: 0.75, keywords: ['南航', '南京航空航天'] },
  { name: '南京理工大学', tier: '211', score: 0.75, keywords: ['南理工', '南京理工'] },
  { name: '哈尔滨工程大学', tier: '211', score: 0.75, keywords: ['哈工程', '哈尔滨工程'] },
  { name: '合肥工业大学', tier: '211', score: 0.75, keywords: ['合工大', '合肥工业'] },
  { name: '西南交通大学', tier: '211', score: 0.75, keywords: ['西南交大', '西南交通'] },

  // === 985 ===
  { name: '清华大学', tier: '985', score: 0.95, keywords: ['清华'] },
  { name: '北京大学', tier: '985', score: 0.95, keywords: ['北大', '北京大学'] },
  { name: '浙江大学', tier: '985', score: 0.95, keywords: ['浙大', '浙江大学'] },
  { name: '上海交通大学', tier: '985', score: 0.95, keywords: ['上交', '上海交大'] },
  { name: '复旦大学', tier: '985', score: 0.95, keywords: ['复旦', '复旦大学'] },
  { name: '华中科技大学', tier: '985', score: 0.95, keywords: ['华科', '华中科技'] },
  { name: '武汉大学', tier: '985', score: 0.95, keywords: ['武大', '武汉大学'] },
  { name: '中山大学', tier: '985', score: 0.95, keywords: ['中大', '中山大学'] },
  { name: '哈尔滨工业大学', tier: '985', score: 0.95, keywords: ['哈工大', '哈尔滨工业'] },
  { name: '西安交通大学', tier: '985', score: 0.95, keywords: ['西安交大'] },
  { name: '电子科技大学', tier: '985', score: 0.95, keywords: ['成电', '电子科技大学'] },
  { name: '华南理工大学', tier: '985', score: 0.95, keywords: ['华南理工'] },
];

/** 学校名称→编码值 */
export function encodeSchool(schoolName: string): number {
  const clean = schoolName.replace(/\s+/g, '');
  for (const entry of SCHOOL_TIER_MAP) {
    if (entry.keywords.some(kw => clean.includes(kw))) {
      return entry.score;
    }
  }
  // 默认：未匹配到的一本按一本算，其他按二本
  return 0.25;
}

/** 学校名称 → 档次标签 */
export function getSchoolTier(schoolName: string): string {
  const clean = schoolName.replace(/\s+/g, '');
  for (const entry of SCHOOL_TIER_MAP) {
    if (entry.keywords.some(kw => clean.includes(kw))) {
      return entry.tier;
    }
  }
  return '其他';
}
