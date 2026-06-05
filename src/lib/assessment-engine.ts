// 简版职业测评引擎 — 12 题快速测评
// 无需 AI 调用，纯前端评分，即刻出结果

export interface QuizQuestion {
  id: number;
  text: string;
  dimension: string; // 归属维度
  options: { value: string; label: string; score: number }[];
}

export interface QuizResult {
  dimensions: {
    name: string;
    score: number;
    maxScore: number;
    level: string;
    percentile: number;
  }[];
  overallScore: number;
  overallGrade: string;
  gapSkills: string[];
  strengths: string[];
  suggestion: string;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  // === 自我认知 (3题) ===
  {
    id: 1,
    text: '你了解自己擅长什么、不擅长什么吗？',
    dimension: '自我认知',
    options: [
      { value: 'A', label: '非常清楚，能明确说出自己的优劣势', score: 5 },
      { value: 'B', label: '大概知道，但不够具体', score: 3 },
      { value: 'C', label: '不太确定，需要别人告诉我', score: 1 },
    ],
  },
  {
    id: 2,
    text: '你能描述自己理想中的工作状态是什么样的吗？',
    dimension: '自我认知',
    options: [
      { value: 'A', label: '很清楚，有明确的画面和标准', score: 5 },
      { value: 'B', label: '有一些想法，但还比较模糊', score: 3 },
      { value: 'C', label: '还没认真想过', score: 1 },
    ],
  },
  {
    id: 3,
    text: '在做重要决定时，你通常会：',
    dimension: '自我认知',
    options: [
      { value: 'A', label: '收集信息、分析利弊再决定', score: 5 },
      { value: 'B', label: '听别人的建议比较多', score: 3 },
      { value: 'C', label: '凭直觉快速决定', score: 1 },
    ],
  },
  // === 职业方向 (3题) ===
  {
    id: 4,
    text: '你有明确的求职目标行业或岗位吗？',
    dimension: '职业方向',
    options: [
      { value: 'A', label: '有明确的目标，知道想去哪些公司', score: 5 },
      { value: 'B', label: '有大方向，但还没有具体目标', score: 3 },
      { value: 'C', label: '完全不知道想做什么', score: 1 },
    ],
  },
  {
    id: 5,
    text: '你所学的专业和你理想的职业方向匹配吗？',
    dimension: '职业方向',
    options: [
      { value: 'A', label: '非常匹配，专业就是为这个方向准备的', score: 5 },
      { value: 'B', label: '有一定关联，但需要额外补充技能', score: 3 },
      { value: 'C', label: '不太匹配，想转行', score: 1 },
    ],
  },
  {
    id: 6,
    text: '你是否了解目标岗位的薪资范围和发展路径？',
    dimension: '职业方向',
    options: [
      { value: 'A', label: '很清楚，做过详细的调研', score: 5 },
      { value: 'B', label: '大概了解，看过一些招聘信息', score: 3 },
      { value: 'C', label: '没怎么了解过', score: 1 },
    ],
  },
  // === 技能匹配 (3题) ===
  {
    id: 7,
    text: '你是否已经掌握了目标岗位要求的核心技能？',
    dimension: '技能匹配',
    options: [
      { value: 'A', label: '大部分都掌握，还差一些进阶技能', score: 5 },
      { value: 'B', label: '掌握了一些，还有很多需要学', score: 3 },
      { value: 'C', label: '基本没有相关技能', score: 1 },
    ],
  },
  {
    id: 8,
    text: '你有可以写在简历上的项目经历或实习经历吗？',
    dimension: '技能匹配',
    options: [
      { value: 'A', label: '有2个以上可以详细展开的经历', score: 5 },
      { value: 'B', label: '有1个相关经历', score: 3 },
      { value: 'C', label: '目前还没有相关经历', score: 1 },
    ],
  },
  {
    id: 9,
    text: '你在团队合作中通常扮演什么角色？',
    dimension: '技能匹配',
    options: [
      { value: 'A', label: '能灵活切换领导和执行角色', score: 5 },
      { value: 'B', label: '偏向执行者，按照安排完成任务', score: 3 },
      { value: 'C', label: '不太习惯团队协作', score: 1 },
    ],
  },
  // === 求职准备 (3题) ===
  {
    id: 10,
    text: '你的简历目前处于什么状态？',
    dimension: '求职准备',
    options: [
      { value: 'A', label: '已经完善并找人审阅过', score: 5 },
      { value: 'B', label: '有初稿，还需要优化', score: 3 },
      { value: 'C', label: '还没开始写', score: 1 },
    ],
  },
  {
    id: 11,
    text: '你是否有面试经验或做过模拟面试？',
    dimension: '求职准备',
    options: [
      { value: 'A', label: '参加过多次面试或模拟面试', score: 5 },
      { value: 'B', label: '有过一两次经历', score: 3 },
      { value: 'C', label: '完全没有', score: 1 },
    ],
  },
  {
    id: 12,
    text: '你每周花多少时间在求职准备上？',
    dimension: '求职准备',
    options: [
      { value: 'A', label: '5小时以上', score: 5 },
      { value: 'B', label: '2-5小时', score: 3 },
      { value: 'C', label: '不到2小时或没有固定安排', score: 1 },
    ],
  },
];

export function calculateQuizResult(answers: Record<number, string>): QuizResult {
  const dimensions: Record<string, { total: number; count: number }> = {};

  QUIZ_QUESTIONS.forEach((q) => {
    const answer = answers[q.id];
    const option = q.options.find((o) => o.value === answer);
    const score = option ? option.score : 0;

    if (!dimensions[q.dimension]) {
      dimensions[q.dimension] = { total: 0, count: 0 };
    }
    dimensions[q.dimension]!.total += score;
    dimensions[q.dimension]!.count += 1;
  });

  // 每维度 3 题，每题最高 5 分，满分 15
  const dimResults = Object.entries(dimensions).map(([name, data]) => {
    const maxScore = data.count * 5;
    const score = data.total;
    const normalized = Math.round((score / maxScore) * 100);

    let level: string;
    let percentile: number;
    if (normalized >= 80) {
      level = '优秀';
      percentile = 85;
    } else if (normalized >= 60) {
      level = '良好';
      percentile = 55;
    } else if (normalized >= 40) {
      level = '达标';
      percentile = 30;
    } else {
      level = '待提升';
      percentile = 15;
    }

    return { name, score: normalized, maxScore: 100, level, percentile };
  });

  const overallScore = Math.round(
    dimResults.reduce((sum, d) => sum + d.score, 0) / dimResults.length
  );

  let overallGrade: string;
  if (overallScore >= 80) overallGrade = '优秀';
  else if (overallScore >= 60) overallGrade = '良好';
  else if (overallScore >= 40) overallGrade = '一般';
  else overallGrade = '需要提升';

  // 找短板（得分最低的维度）
  const sorted = [...dimResults].sort((a, b) => a.score - b.score);
  const gapSkills: string[] = sorted
    .filter((d) => d.score < 60)
    .map((d) => d.name);
  const strengths: string[] = sorted
    .filter((d) => d.score >= 60)
    .map((d) => d.name);

  // 综合建议
  let suggestion: string;
  if (overallScore >= 80) {
    suggestion = '你的求职准备很充分！建议聚焦目标企业精准投递，同时利用职途星的AI模拟面试提升面试技巧。';
  } else if (overallScore >= 60) {
    suggestion = '你有不错的基础，但部分维度还有提升空间。建议优先补充短板维度的技能和实践经历。';
  } else if (overallScore >= 40) {
    suggestion = '求职准备还需要加强。建议从明确职业方向开始，逐步完善简历、积累项目经历。';
  } else {
    suggestion = '别担心，现在开始准备完全来得及！建议从"认识自己"开始，使用小职对话帮你梳理方向。';
  }

  return {
    dimensions: dimResults,
    overallScore,
    overallGrade,
    gapSkills,
    strengths,
    suggestion,
  };
}
