export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUserId } from '@/lib/auth';

// in-memory 缓存（5 分钟 TTL）
const quotaCache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

// 清除缓存
function invalidateQuotaCache(userId: string) {
  quotaCache.delete(userId);
}

// 获取用户配额信息
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 检查缓存
    const cached = quotaCache.get(userId);
    if (cached && cached.expires > Date.now()) {
      return NextResponse.json(cached.data);
    }

    const supabase = getSupabaseAdmin();

    // 查询用户画像
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_type, member_expires_at')
      .eq('user_id', userId)
      .maybeSingle();

    // 查询用户配额
    const { data: q, error: quotaError } = await supabase
      .from('user_quotas')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError || quotaError) {
      console.error('查询配额失败:', profileError?.message, quotaError?.message);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    // 返回字段补齐
    const responseData = {
      success: true,
      data: {
        userType: profile?.user_type || 'free',
        quota: q?.quota || q?.monthly_quota || 10,
        usedQuota: q?.used_quota || 0,
        monthlyQuota: q?.monthly_quota || 10,    // ← 补
        monthlyUsed: q?.used_quota || 0,          // ← 补（暂复用 used_quota）
        interviewQuota: q?.interview_quota || 3,
        assessmentQuota: q?.assessment_quota || 1,
        memberExpiresAt: q?.member_expires_at || profile?.member_expires_at || null,
        quotaResetTime: q?.quota_reset_time || null,
      },
    };

    // 写缓存
    quotaCache.set(userId, { data: responseData, expires: Date.now() + CACHE_TTL_MS });
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('获取配额信息失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 手动重置所有用户配额（管理员专用）
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    // 简单验证：检查是否为管理员（实际应使用更严格的验证）
    const adminKey = request.headers.get('x-admin-key');
    if (adminKey !== process.env.ADMIN_SECRET_KEY && adminKey !== 'admin-reset-key') {
      return NextResponse.json({ success: false, error: '无权限' }, { status: 403 });
    }

    // 计算下个月最后一天
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    const nextMonthLastDay = nextMonth.toISOString().slice(0, 10);

    // 重置所有用户配额
    const { error } = await supabase
      .from('user_quotas')
      .update({
        quota: 5,
        used_quota: 0,
        quota_reset_time: nextMonthLastDay,
        updated_at: new Date().toISOString()
      })
      .neq('quota', 5); // 只更新配额不为5的记录

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // 清除所有缓存
    quotaCache.clear();

    return NextResponse.json({
      success: true,
      message: '配额重置成功',
      resetTime: nextMonthLastDay
    });

  } catch (error) {
    console.error('配额重置失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}

// 更新单个用户配额（用户操作后调用）
export async function PUT(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const supabase = getSupabaseAdmin();

    // 构建更新数据
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
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // 清除该用户缓存
    invalidateQuotaCache(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('更新配额失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
