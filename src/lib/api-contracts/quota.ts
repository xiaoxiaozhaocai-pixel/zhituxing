/**
 * /api/quota Zod 契约
 *
 * 端点：
 * - GET    /api/quota       取当前用户配额（5 分钟内存缓存）
 * - PUT    /api/quota       用户主动更新配额（usedQuota 等）
 * - POST   /api/quota       管理员重置所有用户配额（x-admin-key 鉴权）
 *
 * 历史：旧响应是 { success: true, data: {...} } 自定义包装，本次统一走 jsonOk。
 * 注意：当前 src/ 内无前端调用方，但定义契约为未来接入做规范。
 */
import { z } from 'zod';

export const QuotaDataSchema = z.object({
  userType: z.string(),
  quota: z.number(),
  usedQuota: z.number(),
  monthlyQuota: z.number(),
  monthlyUsed: z.number(),
  interviewQuota: z.number(),
  assessmentQuota: z.number(),
  memberExpiresAt: z.string().nullable(),
  quotaResetTime: z.string().nullable(),
});
export type QuotaData = z.infer<typeof QuotaDataSchema>;

export const QuotaResetDataSchema = z.object({
  message: z.string(),
  resetTime: z.string(),
});
export type QuotaResetData = z.infer<typeof QuotaResetDataSchema>;

export const QuotaUpdateRequestSchema = z.object({
  usedQuota: z.number().optional(),
  monthlyQuota: z.number().optional(),
  interviewQuota: z.number().optional(),
  assessmentQuota: z.number().optional(),
  memberExpiresAt: z.string().optional(),
  quotaResetTime: z.string().optional(),
});
export type QuotaUpdateRequest = z.infer<typeof QuotaUpdateRequestSchema>;

export const QuotaUpdateDataSchema = z.object({
  updated: z.boolean(),
});
export type QuotaUpdateData = z.infer<typeof QuotaUpdateDataSchema>;
