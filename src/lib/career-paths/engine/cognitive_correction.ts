// 职途星认知校正引擎 · L1 专业→岗位认知校正
// 核心命题：学生不知道自己能投什么。本引擎用「反推法」：
//   ① 从专业反推二级子类（encodeMajor → MAJ_CAT）
//   ② 从子类反推核心课程与派生能力
//   ③ 从能力反推可投岗位方向
//   ④ 每项岗位给出「为什么」的校正解释 — 让学生被看见、被理解
//
// 用法：cognitiveCorrection(major, grade?) → 结构化认知校正结果

import {
  ALL_COGNITIVE_KNOWLEDGE,
  CognitiveJobDirection,
  CognitiveKnowledgeEntry,
} from './cognitive_knowledge';
import { encodeMajor, getSubCategoryLabel } from './major_mapping';

export interface CognitiveCorrectionResult {
  major: string;
  subCategory: string;
  categoryLabel: string;
  category: string;
  isKnown: boolean;          // 专业是否命中知识底座
  coreCourses: string[];
  derivedSkills: string[];
  jobDirections: CognitiveJobDirection[];
  summary: string;           // 一句话认知校正结论
  actions: string[];         // 分年级行动建议
  fallback?: boolean;        // 是否走了兜底逻辑
}

/** 分年级行动建议 */
function buildActions(grade?: string): string[] {
  const g = grade || '';
  if (!g) {
    return ['建议先确认专业所属大类，再对照下方岗位方向判断自己更适合哪条路。'];
  }
  if (g.includes('大一') || g.includes('大二')) {
    return [
      '先修好下方列出的核心课程，建立扎实的能力地图，不急着投递。',
      '利用低年级参加1-2段相关的实习或项目，为日后匹配积累作品与经历。',
      '对照下方岗位方向，圈定1-2个感兴趣的方向，作为长期目标。',
    ];
  }
  if (g.includes('大四') || g.includes('毕业')) {
    return [
      '对照下方岗位方向，优先投递「高度对口」的岗位，保底「中等对口」。',
      '针对目标岗位补短板：补齐岗位要求的硬技能，并优化简历针对性。',
      '用模拟面试提前演练，提高面试通过率，秋招/春招集中冲刺。',
    ];
  }
  // 大三/研一研二等中间年级
  return [
    '对照下方岗位方向，确定1-2个主攻方向，避免盲目海投。',
    '用剩余的实习窗口补一段目标岗位相关实习，这是最有效的敲门砖。',
    '把专业课程与岗位要求做对照，缺什么补什么，早做准备。',
  ];
}

/** 生成一句话认知校正结论 */
function buildSummary(entry: CognitiveKnowledgeEntry): string {
  const top = entry.jobDirections[0];
  if (!top) {
    return `${entry.label}属于${entry.category}大类，对应的岗位方向待进一步确认，建议补充技能与经历后再匹配。`;
  }
  const topJobs = top.jobs.slice(0, 2).join('/');
  return `你学的「${entry.label}」其实不是只能做一件事——它培养的核心能力（${entry.derivedSkills.slice(0, 3).join('、')}），能支撑你投 ${topJobs} 等 ${entry.jobDirections.length} 类岗位方向，关键是找到能力与岗位的交点。`;
}

/**
 * 认知校正主入口
 * @param major 用户输入的专业名称
 * @param grade 年级（用于行动建议）
 */
export function cognitiveCorrection(major: string, grade?: string): CognitiveCorrectionResult {
  const clean = (major || '').trim();
  const subCategory = encodeMajor(clean);
  const categoryLabel = getSubCategoryLabel(subCategory);

  // 命中知识底座
  // ① 优先精确匹配复合专业（如信管），按专业名兜住
  const byMajor = ALL_COGNITIVE_KNOWLEDGE.find((e) => e.coveredMajors?.includes(clean));
  // ② 其次按二级子类匹配普通条目（跳过复合专业条目，避免专业名不同的同类专业被截胡）
  const entry = byMajor || ALL_COGNITIVE_KNOWLEDGE.find((e) => e.subCategory === subCategory && !e.coveredMajors);

  if (entry) {
    return {
      major: clean,
      subCategory,
      categoryLabel: entry.label,
      category: entry.category,
      isKnown: true,
      coreCourses: entry.coreCourses,
      derivedSkills: entry.derivedSkills,
      jobDirections: entry.jobDirections,
      summary: buildSummary(entry),
      actions: buildActions(grade),
      fallback: false,
    };
  }

  // 未命中 → 降级：基于专业分类给一个通用兜底（保证不崩）
  let jobDirections: CognitiveJobDirection[] = [];
  if (subCategory && subCategory !== '其他') {
    jobDirections = [
      {
        job: `${categoryLabel}相关岗位`,
        jobs: ['相关技术岗', '相关职能岗', '相关研究岗'],
        matchLevel: '中等对口',
        skills: [],
        why: `你学的「${clean}」属于${categoryLabel}方向，当前知识底座暂未收录该专业的具体岗位映射，建议先补充课程与技能，小职再给你更精准的校正。`,
      },
    ];
  } else {
    jobDirections = [
      {
        job: '待确认方向',
        jobs: ['技术类', '职能类', '市场类'],
        matchLevel: '需发力',
        skills: [],
        why: '小职暂时没看懂你的专业，建议补充完整专业名或课程清单，帮助我准确反推你的能力方向。',
      },
    ];
  }

  return {
    major: clean,
    subCategory,
    categoryLabel,
    category: '其他',
    isKnown: false,
    coreCourses: [],
    derivedSkills: [],
    jobDirections,
    summary: buildSummaryFallback(clean, categoryLabel),
    actions: buildActions(grade),
    fallback: true,
  };
}

function buildSummaryFallback(major: string, categoryLabel: string): string {
  if (categoryLabel && categoryLabel !== '其他') {
    return `「${major}」可归入${categoryLabel}方向，小职已为你识别大类，但需要更详细的课程/技能才能给出精准的岗位校正。`;
  }
  return `小职暂时没能识别出「${major}」的专业大类，但没关系——补全你的核心课程和技能，就能精准校正你的可投方向。`;
}

export type { CognitiveJobDirection, CognitiveKnowledgeEntry };
