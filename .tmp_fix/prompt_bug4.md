# 任务：诊断并修复 P1 Bug #4 — MembershipContext 与 quota 契约字段名不一致

## 用户视角
某些消费 `quota` 的页面拿不到数据（remaining 显示 NaN 或 undefined），怀疑前端 `MembershipContext` 用的字段名与 `quota.ts` 契约 / `/api/quota` 实际返回不一致。

## 关键已知
- `/api/quota` 路由的实际 response shape 见下方 bug4_quota_api.txt
- 契约定义见 bug4_quota_contract.txt（全驼峰）
- 消费 context 见 bug4_ctx.txt（MembershipContext 用 MembershipData 类型，不是 QuotaData）
- 怀疑点：MembershipContext.fetchQuota() 收到 /api/quota 返回后，赋给 state 时字段名映射错（snake_case vs camelCase）

## 输出要求
1. **先确认 3 处字段名是否真的不一致**：契约 / API 实际返回 / context 消费
2. **如果一致就说"描述不准"**
3. **如果不一致**给 unified diff 修 context（不要动 API 路由，因为后端契约已发布）
4. **不要重写整个文件**

---

## 代码上下文

### src/lib/api-contracts/quota.ts（契约）
```ts
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
```

### src/app/api/quota/route.ts（API 实际返回）
```ts
export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUserId } from '@/lib/auth';
import {
  jsonOk,
  jsonError,
  parseRequestBody,
  ErrorCode,
} from '@/lib/api-contracts/_shared';
import {
  QuotaDataSchema,
  QuotaResetDataSchema,
  QuotaUpdateRequestSchema,
  QuotaUpdateDataSchema,
} from '@/lib/api-contracts/quota';

// in-memory 缓存（5 分钟 TTL）
type QuotaCacheEntry = { data: ReturnType<typeof buildQuotaData>; expires: number };
const quotaCache = new Map<string, QuotaCacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function invalidateQuotaCache(userId: string) {
  quotaCache.delete(userId);
}

type ProfileRow = { user_type?: string | null; member_expires_at?: string | null } | null;
type QuotaRow = {
  quota?: number | null;
  monthly_quota?: number | null;
  used_quota?: number | null;
  interview_quota?: number | null;
  assessment_quota?: number | null;
  member_expires_at?: string | null;
  quota_reset_time?: string | null;
} | null;

function buildQuotaData(profile: ProfileRow, q: QuotaRow) {
  return {
    userType: profile?.user_type || 'free',
    quota: q?.quota ?? q?.monthly_quota ?? 10,
    usedQuota: q?.used_quota ?? 0,
    monthlyQuota: q?.monthly_quota ?? 10,
    monthlyUsed: q?.used_quota ?? 0,
    interviewQuota: q?.interview_quota ?? 3,
    assessmentQuota: q?.assessment_quota ?? 1,
    memberExpiresAt: q?.member_expires_at ?? profile?.member_expires_at ?? null,
    quotaResetTime: q?.quota_reset_time ?? null,
  };
}

// 获取用户配额信息
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return jsonError(ErrorCode.UNAUTHORIZED, '请先登录');
    }

    // 检查缓存
    const cached = quotaCache.get(userId);
    if (cached && cached.expires > Date.now()) {
      return jsonOk(QuotaDataSchema, cached.data);
    }

    const supabase = getSupabaseAdmin();

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_type, member_expires_at')
      .eq('user_id', userId)
      .maybeSingle();

    const { data: q, error: quotaError } = await supabase
      .from('user_quotas')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError || quotaError) {
      console.error('查询配额失败:', profileError?.message, quotaError?.message);
      return jsonError(ErrorCode.INTERNAL_ERROR, '查询失败');
    }

    const responseData = buildQuotaData(profile as ProfileRow, q as QuotaRow);
    quotaCache.set(userId, { data: responseData, expires: Date.now() + CACHE_TTL_MS });
    return jsonOk(QuotaDataSchema, responseData);
  } catch (error) {
    console.error('获取配额信息失败:', error);
    return jsonError(ErrorCode.INTERNAL_ERROR, '服务器错误');
  }
}

// 手动重置所有用户配额（管理员专用）
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const adminKey = request.headers.get('x-admin-key');
    if (adminKey !== process.env.ADMIN_SECRET_KEY && adminKey !== 'admin-reset-key') {
      return jsonError(ErrorCode.FORBIDDEN, '无权限');
    }

    // 计算下个月最后一天
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    const nextMonthLastDay = nextMonth.toISOString().slice(0, 10);

    const { error } = await supabase
      .from('user_quotas')
      .update({
        quota: 5,
        used_quota: 0,
        quota_reset_time: nextMonthLastDay,
        updated_at: new Date().toISOString(),
      })
      .neq('quota', 5);

    if (error) {
      return jsonError(ErrorCode.INTERNAL_ERROR, error.message);
    }

    quotaCache.clear();

    return jsonOk(QuotaResetDataSchema, {
      message: '配额重置成功',
      resetTime: nextMonthLastDay,
    });
  } catch (error) {
    console.error('配额重置失败:', error);
    return jsonError(ErrorCode.INTERNAL_ERROR, '服务器错误');
  }
}

// 更新单个用户配额（用户操作后调用）
export async function PUT(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return jsonError(ErrorCode.UNAUTHORIZED, '请先登录');
    }

    const parsed = await parseRequestBody(request, QuotaUpdateRequestSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    const supabase = getSupabaseAdmin();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (body.usedQuota !== undefined) updateData.used_quota = body.usedQuota;
    if (body.monthlyQuota !== undefined) updateData.monthly_quota = body.monthlyQuota;
    if (body.interviewQuota !== undefined) updateData.interview_quota = body.interviewQuota;
    if (body.assessmentQuota !== undefined) updateData.assessment_quota = body.assessmentQuota;
    if (body.memberExpiresAt !== undefined) updateData.member_expires_at = body.memberExpiresAt;
    if (body.quotaResetTime !== undefined) updateData.quota_reset_time = body.quotaResetTime;

    const { error } = await supabase
      .from('user_quotas')
      .update(updateData)
      .eq('user_id', userId);

    if (error) {
      return jsonError(ErrorCode.INTERNAL_ERROR, error.message);
    }

    invalidateQuotaCache(userId);

    return jsonOk(QuotaUpdateDataSchema, { updated: true });
  } catch (error) {
    console.error('更新配额失败:', error);
    return jsonError(ErrorCode.INTERNAL_ERROR, '服务器错误');
  }
}
```

### src/contexts/MembershipContext.tsx（消费方）
```tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { MembershipDataSchema, type MembershipData } from '@/lib/api-contracts/membership';
import { successResponse } from '@/lib/api-contracts/_shared';

// 从 localStorage 获取当前用户 ID（仅作 cookie 不存在时的兜底；实际依赖 cookie 凭据）
function getCurrentUserId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user?.id || null;
    }
  } catch {
    // ignore
  }
  return null;
}

export interface MembershipState {
  /** 'free' 或 'member'，UI 简化用 */
  membershipType: 'free' | 'member';
  /** 是否当前生效会员（非 free 且未过期） */
  isMember: boolean;
  /** 当前生效套餐 key（monthly/semester/annual/lifetime），free 或过期时 null */
  membershipPlan: string | null;
  /** 会员到期 ISO 字符串（lifetime / 非会员时 null） */
  expiresAt: string | null;
  loading: boolean;
}

interface MembershipContextValue extends MembershipState {
  refresh: () => Promise<void>;
}

const defaultState: MembershipState = {
  membershipType: 'free',
  isMember: false,
  membershipPlan: null,
  expiresAt: null,
  loading: true,
};

const MembershipContext = createContext<MembershipContextValue>({
  ...defaultState,
  refresh: async () => {},
});

const ResponseSchema = successResponse(MembershipDataSchema);

function applyData(data: MembershipData): MembershipState {
  return {
    membershipType: data.isMember ? 'member' : 'free',
    isMember: data.isMember,
    membershipPlan: data.membershipPlan,
    expiresAt: data.membershipExpiresAt,
    loading: false,
  };
}

export function MembershipProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<MembershipState>(defaultState);

  const refresh = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true }));
      const userId = getCurrentUserId();
      const headers: HeadersInit = {};
      if (userId) headers['x-user-id'] = userId;

      const res = await fetch('/api/membership', {
        headers,
        credentials: 'include',
      });

      if (!res.ok) {
        // 401 视为未登录，重置为默认 free
        setState({ ...defaultState, loading: false });
        return;
      }

      const json = await res.json();
      const parsed = ResponseSchema.safeParse(json);
      if (!parsed.success) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('[MembershipContext] /api/membership 响应不符合契约', parsed.error.issues);
        } else {
          console.warn('[MembershipContext] /api/membership 响应不符合契约');
        }
        setState({ ...defaultState, loading: false });
        return;
      }

      setState(applyData(parsed.data.data));
    } catch (err) {
      console.warn('[MembershipContext] refresh 异常', err);
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <MembershipContext.Provider value={{ ...state, refresh }}>
      {children}
    </MembershipContext.Provider>
  );
}

export function useMembership() {
  return useContext(MembershipContext);
}
```
