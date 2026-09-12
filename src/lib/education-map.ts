/**
 * 学历筛选归一化 —— 单一事实源
 *
 * 问题：job_descriptions.education 是 JD 解析产出的自由文本，直接 group by 会把
 * 「120元/天（税后」「本科及以上（经验丰富者可放宽至统招大专学）」等残渣当筛选项暴露。
 * 方案：归一化到 5 个学历档位（+不限），/api/filters（facet 展示）与
 * /api/jobs（查询过滤）共用本表，保证「下拉显示什么、查询就匹配什么」。
 */
export const EDUCATION_TIER_ORDER = ['高中及以下', '大专', '本科', '硕士', '博士'] as const;
export type EducationTier = (typeof EDUCATION_TIER_ORDER)[number];

/**
 * 档位 → education 原文 ilike 模式（/api/jobs 查询用）。
 * 判断优先级 = 数组顺序（博士 > 硕士 > 本科 > 大专 > 高中及以下），
 * 保证「研究生及以上」归硕士、「本科及以上（可放宽至大专）」归本科（按最低学历要求归档）。
 */
export const EDUCATION_TIER_PATTERNS: Record<EducationTier, string[]> = {
  '博士': ['%博士%'],
  '硕士': ['%硕士%', '%研究生%'],
  '本科': ['%本科%', '%学士%'],
  '大专': ['%大专%', '%专科%', '%高职%', '%高专%'],
  '高中及以下': ['%高中%', '%中专%', '%中技%', '%职高%', '%技校%', '%初中%'],
};

/** 原文 → 档位（/api/filters facet 归一用）。无法归档的脏数据不计入任何档位。 */
export function normalizeEducationTier(raw: string): EducationTier | null {
  const v = raw.trim();
  if (!v || v.includes('不限')) return null; // 「不限」由调用方单独聚合
  for (const tier of EDUCATION_TIER_ORDER) {
    for (const p of EDUCATION_TIER_PATTERNS[tier]) {
      if (v.includes(p.replaceAll('%', ''))) return tier;
    }
  }
  return null;
}
