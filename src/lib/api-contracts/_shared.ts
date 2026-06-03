/**
 * API 契约层 - 共享基础设施
 *
 * 设计目标：根治字段名错配（5/27-5/28 一周内 6+ 次 bug 的根因）
 *
 * 核心原则：
 * 1. 所有 API 响应必须走 jsonOk / jsonError，禁止裸 NextResponse.json
 * 2. 响应体统一格式：成功 { ok: true, data: T } / 失败 { ok: false, error: { code, message } }
 * 3. 前端硬编码 ErrorCode 常量做错误分支判断，绝对禁止靠 message 字符串匹配
 * 4. dev 环境 schema 校验失败抛错（逼修字段）；prod 环境只 warn（不让小错配 5xx 整个 API）
 *
 * 维护：肖赵才 + 小扣 / 2026-05-29 初版
 */

import { NextResponse } from 'next/server';
import { z, ZodError, ZodSchema } from 'zod';

// ============================================================
// 1. 错误码常量（前端硬编码匹配，禁止靠 message 字符串）
// ============================================================
export const ErrorCode = {
  // 认证类
  UNAUTHORIZED: 'UNAUTHORIZED',          // 未登录
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',        // token 过期
  FORBIDDEN: 'FORBIDDEN',                // 已登录但无权限

  // 请求类
  INVALID_REQUEST: 'INVALID_REQUEST',    // 请求体格式错误（zod 校验失败）
  MISSING_FIELD: 'MISSING_FIELD',        // 必填字段缺失
  NOT_FOUND: 'NOT_FOUND',                // 资源不存在
  ALREADY_EXISTS: 'ALREADY_EXISTS',      // 资源已存在

  // 业务类
  RATE_LIMITED: 'RATE_LIMITED',          // 限流
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',      // 配额不足
  BUSINESS_ERROR: 'BUSINESS_ERROR',      // 通用业务异常

  // 系统类
  INTERNAL_ERROR: 'INTERNAL_ERROR',      // 服务器内部错误
  UPSTREAM_ERROR: 'UPSTREAM_ERROR',      // 上游服务异常（Coze/DeepSeek/Supabase）
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

// 错误码 -> HTTP 状态码映射
const STATUS_MAP: Record<ErrorCodeType, number> = {
  UNAUTHORIZED: 401,
  TOKEN_EXPIRED: 401,
  FORBIDDEN: 403,
  INVALID_REQUEST: 400,
  MISSING_FIELD: 400,
  NOT_FOUND: 404,
  ALREADY_EXISTS: 409,
  RATE_LIMITED: 429,
  QUOTA_EXCEEDED: 429,
  BUSINESS_ERROR: 400,
  INTERNAL_ERROR: 500,
  UPSTREAM_ERROR: 502,
};

// ============================================================
// 2. 通用 schema：响应包装
// ============================================================

// 失败响应 payload
export const ErrorPayloadSchema = z.object({
  code: z.enum([
    'UNAUTHORIZED', 'TOKEN_EXPIRED', 'FORBIDDEN',
    'INVALID_REQUEST', 'MISSING_FIELD', 'NOT_FOUND', 'ALREADY_EXISTS',
    'RATE_LIMITED', 'QUOTA_EXCEEDED', 'BUSINESS_ERROR',
    'INTERNAL_ERROR', 'UPSTREAM_ERROR',
  ]),
  message: z.string(),
  details: z.unknown().optional(), // dev 环境带 zod issues，prod 环境不带
});

export const FailureResponseSchema = z.object({
  ok: z.literal(false),
  error: ErrorPayloadSchema,
});

// 成功响应工厂：传入 data schema，返回包装 schema
export function successResponse<T extends ZodSchema>(dataSchema: T) {
  return z.object({
    ok: z.literal(true),
    data: dataSchema,
  });
}

// 分页查询参数
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// 分页响应工厂
export function paginatedSchema<T extends ZodSchema>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int(),
    hasMore: z.boolean(),
  });
}

// ============================================================
// 3. 响应工具函数（route.ts 里直接用）
// ============================================================

const isDev = process.env.NODE_ENV !== 'production';

/**
 * 返回成功响应。dev 环境会用 dataSchema 校验 data；prod 环境只 warn
 *
 * 用法：jsonOk(MeDataSchema, { user: {...} })  // 直接传 data schema，无须包 successResponse
 * 函数内部会自动包装为 { ok: true, data }
 */
export function jsonOk<T extends ZodSchema>(
  dataSchema: T,
  data: z.infer<T>,
  init?: ResponseInit,
): NextResponse {
  if (isDev) {
    const result = dataSchema.safeParse(data);
    if (!result.success) {
      console.error('[api-contract] jsonOk schema validation failed:', result.error.issues);
      throw new Error(
        `API 响应不符合契约: ${JSON.stringify(result.error.issues, null, 2)}`,
      );
    }
  } else {
    const result = dataSchema.safeParse(data);
    if (!result.success) {
      console.warn(
        '[api-contract] response schema mismatch (prod warn only):',
        result.error.issues,
      );
    }
  }
  return NextResponse.json({ ok: true, data }, init);
}

/**
 * 返回失败响应
 */
export function jsonError(
  code: ErrorCodeType,
  message: string,
  options?: { details?: unknown; status?: number },
): NextResponse {
  const status = options?.status ?? STATUS_MAP[code] ?? 500;
  const payload: {
    ok: false;
    error: { code: ErrorCodeType; message: string; details?: unknown };
  } = {
    ok: false,
    error: { code, message },
  };
  // details 只在 dev 环境带出，避免泄漏内部错误细节
  if (isDev && options?.details !== undefined) {
    payload.error.details = options.details;
  }
  return NextResponse.json(payload, { status });
}

/**
 * 将 ZodError 转成标准 INVALID_REQUEST 响应
 */
export function zodErrorToResponse(err: ZodError, message = '请求参数不合法'): NextResponse {
  return jsonError('INVALID_REQUEST', message, { details: err.issues });
}

/**
 * 解析请求体并 zod 校验。失败直接抛响应；成功返回 typed data
 */
export async function parseRequestBody<T extends ZodSchema>(
  request: Request,
  schema: T,
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; response: NextResponse }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      ok: false,
      response: jsonError('INVALID_REQUEST', '请求体不是合法 JSON'),
    };
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      ok: false,
      response: zodErrorToResponse(result.error),
    };
  }
  return { ok: true, data: result.data };
}

