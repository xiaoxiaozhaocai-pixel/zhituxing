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

// ============================================================
// S6 P5-B · 雇主端计费 API schemas
// ============================================================

// 余额响应
export const EmployerBalanceDataSchema = z.object({
  credit_balance: z.number().int().nonnegative(),
  total_recharged: z.number().int().nonnegative(),
  total_consumed: z.number().int().nonnegative(),
});
export type EmployerBalanceData = z.infer<typeof EmployerBalanceDataSchema>;

// 解锁请求
export const EmployerUnlockRequestSchema = z.object({
  candidate_user_id: z.string().uuid(),
});
export type EmployerUnlockRequest = z.infer<typeof EmployerUnlockRequestSchema>;

// 解锁响应（ok / cached 都用这个）
export const EmployerUnlockDataSchema = z.object({
  status: z.enum(['ok', 'cached']),
  unlock_id: z.string().uuid(),
  expires_at: z.string(), // ISO timestamp
  balance_after: z.number().int().nonnegative().nullable(),
  message: z.string(),
});
export type EmployerUnlockData = z.infer<typeof EmployerUnlockDataSchema>;

// 流水单条
export const EmployerTransactionItemSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['recharge', 'consume', 'refund', 'adjust']),
  amount: z.number().int(),
  balance_after: z.number().int().nonnegative(),
  related_candidate_id: z.string().uuid().nullable(),
  related_payment_id: z.string().nullable(),
  note: z.string().nullable(),
  created_at: z.string(),
});

// 流水分页响应
export const EmployerTransactionsDataSchema = z.object({
  items: z.array(EmployerTransactionItemSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
  has_more: z.boolean(),
});
export type EmployerTransactionsData = z.infer<typeof EmployerTransactionsDataSchema>;

// 充值回调请求（Xorpay webhook 占位 schema，等实名后再细化签名验证字段）
export const EmployerRechargeCallbackSchema = z.object({
  payment_id: z.string().min(1),
  employer_id: z.string().uuid(),
  credits: z.number().int().positive(),
  amount: z.number().nonnegative().optional(), // 元
  sign: z.string().min(1),
  note: z.string().optional(),
});
export type EmployerRechargeCallback = z.infer<typeof EmployerRechargeCallbackSchema>;

// 充值回调响应
export const EmployerRechargeCallbackDataSchema = z.object({
  status: z.enum(['ok', 'duplicate']),
  balance_after: z.number().int().nonnegative().nullable(),
  message: z.string(),
});
export type EmployerRechargeCallbackData = z.infer<typeof EmployerRechargeCallbackDataSchema>;
