/**
 * /api/auth/* 系列契约
 *
 * 当前覆盖：
 *   - GET /api/auth/me
 *
 * 历史问题（契约缺失导致）：
 *   - useAuth.tsx 调用 setQuota(data.user.quota)，但 me route 从未返回 user.quota
 *     => 前端 quota 始终 undefined，靠后续 /api/quota fetch 补；契约定型后该错配会被 ts 编译期捕获
 */

import { z } from 'zod';
import { successResponse } from './_shared';

// ============================================================
// /api/auth/me
// ============================================================
export const MeUserSchema = z.object({
  id: z.string(),                       // supabase user uuid
  email: z.string().email().nullable(), // 第三方登录时可能没邮箱
  phone: z.string().nullable(),
  nickname: z.string(),
});
export type MeUser = z.infer<typeof MeUserSchema>;

export const MeDataSchema = z.object({
  user: MeUserSchema,
  refreshed: z.literal(true).optional(), // refresh_token 续期产生的响应才带
});
export type MeData = z.infer<typeof MeDataSchema>;

export const MeResponseSchema = successResponse(MeDataSchema);
export type MeResponse = z.infer<typeof MeResponseSchema>;

