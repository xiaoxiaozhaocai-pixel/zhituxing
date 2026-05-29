/**
 * /api/match 系列契约
 *
 * 当前覆盖：
 *   - POST /api/match  请求体含技能，返回扁平 snake_case 匹配项
 *   - GET  /api/match  默认通用技能，返回前端 MatchJobResult 嵌套 camelCase 结构
 *
 * 历史问题（契约缺失导致）：
 *   - learning-path/page.tsx 读 matchData.data || []，但 GET /api/match 返回字段是 matches，
 *     dead bug 导致学习路径页面对真实匹配从未工作过；契约定型后该错配会被 ts 编译期捕获。
 *   - POST 用 snake_case (job_title, match_score)，GET 用 camelCase (jobName, matchScore)。
 *     这是历史包袱，暂分两套 schema 保留，后续治理统一为 camelCase。
 */

import { z } from 'zod';

// ============================================================
// POST /api/match — 请求 + 响应
// ============================================================

export const MatchPostRequestSchema = z.object({
  skills: z.array(z.string()).min(1, '请提供技能列表'),
  targetPosition: z.string().optional(),
  industry: z.string().optional(),
});
export type MatchPostRequest = z.infer<typeof MatchPostRequestSchema>;

export const MatchPostItemSchema = z.object({
  id: z.union([z.string(), z.number()]),
  job_title: z.string(),
  company: z.string().nullable(),
  city: z.string().nullable(),
  salary_range: z.string(),
  education: z.string().nullable(),
  experience: z.string().nullable(),
  industry: z.string().nullable(),
  match_score: z.number(),
  skill_match_score: z.number(),
  matched_skills: z.array(z.string()),
  gap_skills: z.array(z.string()),
  fresh_graduate_friendly: z.boolean().nullable(),
});
export type MatchPostItem = z.infer<typeof MatchPostItemSchema>;

export const MatchPostDataSchema = z.object({
  matches: z.array(MatchPostItemSchema),
  user_skills: z.array(z.string()),
  total: z.number().int(),
  message: z.string().optional(),
});
export type MatchPostData = z.infer<typeof MatchPostDataSchema>;

// ============================================================
// GET /api/match — 响应（嵌套 MatchJobResult 结构）
// ============================================================

export const MatchJobSchema = z.object({
  id: z.union([z.string(), z.number()]),
  jobName: z.string(),
  city: z.string(),
  industry: z.string(),
  salaryMin: z.number(),
  salaryMax: z.number(),
  salaryRange: z.string(),
  requiredSkills: z.array(z.string()),
});

export const MatchGetItemSchema = z.object({
  job: MatchJobSchema,
  matchScore: z.number(),
  weightedScore: z.number(),
  matchedSkills: z.array(z.string()),
  gapSkills: z.array(z.string()),
  requiredGaps: z.array(z.string()),
  learningPath: z.array(z.unknown()), // 当前未填充
  salary: z.object({
    estimatedMin: z.number(),
    estimatedMax: z.number(),
    estimatedMedian: z.number(),
  }),
});
export type MatchGetItem = z.infer<typeof MatchGetItemSchema>;

export const MatchGetDataSchema = z.object({
  matches: z.array(MatchGetItemSchema),
  user_skills: z.array(z.string()),
  total: z.number().int(),
});
export type MatchGetData = z.infer<typeof MatchGetDataSchema>;

