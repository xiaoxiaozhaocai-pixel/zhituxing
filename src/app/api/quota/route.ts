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
export const dynamic = 'force-dynamic';
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
