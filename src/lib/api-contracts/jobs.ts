/**
 * /api/jobs 系列契约
 *
 * 当前覆盖：
 *   - GET /api/jobs   公开+登录两态都走，未登录返回精简字段
 *
 * 历史问题（契约缺失导致）：
 *   - skill-portrait 读 data.data?.jobs，从未存在过该嵌套结构 → 热门岗位永远空
 *   - profile/info 读 data.code === 200 && data.data?.jobs，code 字段从未存在 → jobOptions 永远空
 *   - jobs/page 读对的 data.data，但字段叫 `data` 语义不清（容易和包装层混淆）
 *
 * 新契约：列表字段统一为 items，包装层 { ok: true, data: { items, total, page, ... } }
 */

import { z } from 'zod';

// 单条岗位（已登录返回完整字段，未登录返回精简字段）
// 用 partial：所有业务字段都 optional，契约只校验"出现的字段命名要对"
export const JobsItemSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string(),               // 显示名（formatJob 已统一为 name）
  industry: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  salary: z.string().optional(),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  skills: z.array(z.string()).optional(),
  hardSkills: z.array(z.string()).optional(),
  softSkills: z.array(z.string()).optional(),
  education: z.string().optional(),
  experience: z.string().optional(),
  companyType: z.string().optional(),
  friendliness: z.string().optional(),
  isFreshFriendly: z.boolean().optional(),
  jdContent: z.string().nullable().optional(),
  coreDutyModule: z.string().optional(),
  majorRequire: z.string().optional(),
  bonusSkillCert: z.string().optional(),
  postCategory: z.string().optional(),
  graduateFriendlyLevel: z.string().optional(),
  competencyWeights: z.unknown().nullable().optional(),
  _relevance: z.number().optional(),
});
export type JobsItem = z.infer<typeof JobsItemSchema>;

export const JobsListDataSchema = z.object({
  items: z.array(JobsItemSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalPages: z.number().int(),
  message: z.string().optional(),
});
export type JobsListData = z.infer<typeof JobsListDataSchema>;


// /api/jobs/stats 契约（首页"数据信任区"动态文案用）
export const JobsStatsDataSchema = z.object({
  total: z.number().int().nonnegative(),
  industries: z.number().int().nonnegative(),
  updated_at: z.string().nullable(),
});
export type JobsStatsData = z.infer<typeof JobsStatsDataSchema>;
