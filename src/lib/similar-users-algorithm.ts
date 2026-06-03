/**
 * 相似用户推荐算法 — 纯函数，不直接操作数据库
 *
 * 核心思路：基于用户技能向量计算余弦相似度，按相似度降序返回 Top 10
 */

// ==================== 类型定义 ====================

/** 用户技能向量 */
export interface UserSkillVector {
  userId: number;
  skills: Record<string, number>; // skill_name → level (1-5)
  major?: string;
  jobIntention?: string;
}

/** 相似用户结果 */
export interface SimilarUser {
  userId: number;
  similarity: number; // 0~1 余弦相似度
  sharedSkills: string[]; // 共同掌握的技能
  reason: string; // 推荐理由
}

/** 候选用户过滤条件 */
export interface CandidateFilter {
  sameMajor?: boolean; // 仅同专业
  sameJobIntention?: boolean; // 仅同职业方向
  minSharedSkills?: number; // 最少共同技能数
}

// ==================== 核心算法 ====================

/**
 * 计算两个技能向量的余弦相似度
 * cos(A,B) = (A·B) / (|A| × |B|)
 */
export function cosineSimilarity(
  vectorA: Record<string, number>,
  vectorB: Record<string, number>
): number {
  // 取两个向量的技能并集
  const allSkills = new Set([...Object.keys(vectorA), ...Object.keys(vectorB)]);
  if (allSkills.size === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const skill of allSkills) {
    const a = vectorA[skill] ?? 0;
    const b = vectorB[skill] ?? 0;
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * 找出两个技能向量的共同技能
 */
export function findSharedSkills(
  vectorA: Record<string, number>,
  vectorB: Record<string, number>
): string[] {
  const skillsA = new Set(Object.keys(vectorA));
  return Object.keys(vectorB).filter((skill) => skillsA.has(skill));
}

/**
 * 生成推荐理由
 * 根据共同技能数量、相似度和专业/职业匹配度生成人性化理由
 */
export function generateReason(
  sharedSkills: string[],
  similarity: number,
  sameMajor: boolean,
  sameJobIntention: boolean
): string {
  const parts: string[] = [];

  // 共同技能描述
  if (sharedSkills.length > 0) {
    const topSkills = sharedSkills.slice(0, 3);
    if (sharedSkills.length <= 3) {
      parts.push(`你们都掌握了${topSkills.join('和')}`);
    } else {
      parts.push(`你们都掌握了${topSkills.join('、')}等${sharedSkills.length}项技能`);
    }
  }

  // 专业匹配
  if (sameMajor) {
    parts.push('同专业背景');
  }

  // 职业方向匹配
  if (sameJobIntention) {
    parts.push('求职方向一致');
  }

  // 综合评价
  if (similarity >= 0.8) {
    parts.push('技能画像高度相似');
  } else if (similarity >= 0.5) {
    parts.push('技能画像较为相似');
  }

  return parts.join('，');
}

/**
 * 过滤候选用户集
 * 根据专业、职业方向、最少共同技能数筛选
 */
export function filterCandidates(
  currentUser: UserSkillVector,
  candidates: UserSkillVector[],
  filter?: CandidateFilter
): UserSkillVector[] {
  if (!filter) return candidates;

  return candidates.filter((candidate) => {
    // 同专业过滤
    if (filter.sameMajor && currentUser.major && candidate.major) {
      if (currentUser.major !== candidate.major) return false;
    }

    // 同职业方向过滤
    if (filter.sameJobIntention && currentUser.jobIntention && candidate.jobIntention) {
      if (currentUser.jobIntention !== candidate.jobIntention) return false;
    }

    // 最少共同技能数
    if (filter.minSharedSkills && filter.minSharedSkills > 0) {
      const shared = findSharedSkills(currentUser.skills, candidate.skills);
      if (shared.length < filter.minSharedSkills) return false;
    }

    return true;
  });
}

/**
 * 主函数：计算相似用户推荐列表
 *
 * @param currentUser - 当前用户的技能向量
 * @param candidates - 候选用户技能向量列表
 * @param options - 过滤条件和返回数量
 * @returns 相似用户列表，按相似度降序排列
 */
export function findSimilarUsers(
  currentUser: UserSkillVector,
  candidates: UserSkillVector[],
  options?: {
    filter?: CandidateFilter;
    topN?: number; // 默认 10
  }
): SimilarUser[] {
  const topN = options?.topN ?? 10;

  // 过滤掉自己
  const filteredCandidates = candidates.filter(
    (c) => c.userId !== currentUser.userId
  );

  // 应用过滤条件
  const afterFilter = filterCandidates(
    currentUser,
    filteredCandidates,
    options?.filter
  );

  // 如果没有候选用户，先放宽条件重试
  const finalCandidates =
    afterFilter.length > 0
      ? afterFilter
      : filteredCandidates;

  // 计算每个候选用户的相似度
  const results: SimilarUser[] = finalCandidates.map((candidate) => {
    const similarity = cosineSimilarity(currentUser.skills, candidate.skills);
    const sharedSkills = findSharedSkills(currentUser.skills, candidate.skills);

    const sameMajor =
      !!currentUser.major &&
      !!candidate.major &&
      currentUser.major === candidate.major;

    const sameJobIntention =
      !!currentUser.jobIntention &&
      !!candidate.jobIntention &&
      currentUser.jobIntention === candidate.jobIntention;

    const reason = generateReason(
      sharedSkills,
      similarity,
      sameMajor,
      sameJobIntention
    );

    return {
      userId: candidate.userId,
      similarity: Math.round(similarity * 1000) / 1000, // 保留3位小数
      sharedSkills,
      reason,
    };
  });

  // 按相似度降序排列，取 Top N
  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topN);
}
