/**
 * 雇主端 API 契约 schemas
 * 配合 jsonOk / jsonError 使用
 */

import { z } from 'zod';

// 公司信息（嵌套对象）
export const CompanyInfoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  industry: z.string().nullable(),
  size_range: z.string().nullable(),
  city: z.string().nullable(),
  verified: z.boolean(),
}).nullable();

// 注册请求
export const EmployerSignupRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, '密码至少 8 位'),
  real_name: z.string().min(1).max(50),
  phone: z.string().optional(),
  title: z.string().max(50).optional(),
  company_name: z.string().max(100).optional(),
});
export type EmployerSignupRequest = z.infer<typeof EmployerSignupRequestSchema>;

// 登录请求
export const EmployerLoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type EmployerLoginRequest = z.infer<typeof EmployerLoginRequestSchema>;

// 注册/登录响应数据
export const EmployerAuthDataSchema = z.object({
  employer_id: z.string().uuid(),
  user_id: z.string().uuid(),
  email: z.string().nullable(),
  real_name: z.string(),
  role: z.enum(['owner', 'recruiter', 'viewer']),
  company_id: z.string().uuid().nullable(),
  credit_balance: z.number().int().nonnegative(),
});
export type EmployerAuthData = z.infer<typeof EmployerAuthDataSchema>;

// /me 响应数据（含公司）
export const EmployerMeDataSchema = z.object({
  employer_id: z.string().uuid(),
  user_id: z.string().uuid(),
  email: z.string().nullable(),
  real_name: z.string(),
  role: z.enum(['owner', 'recruiter', 'viewer']),
  status: z.enum(['active', 'frozen', 'disabled']),
  credit_balance: z.number().int().nonnegative(),
  company: CompanyInfoSchema,
});
export type EmployerMeData = z.infer<typeof EmployerMeDataSchema>;

// 登出响应
export const EmployerLogoutDataSchema = z.object({
  message: z.string(),
});
