import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

/**
 * /api/admin/orders
 *
 * admin 订单审核工作台 - 列表 + 单条签名截图 URL
 * - GET：所有 pending_orders（默认按 status 升序 + created_at 倒序）
 *   - 支持 ?status=pending|approved|rejected|all 过滤
 *   - 支持 ?sign=ID 单独签 signed URL（用 service_role）
 *
 * admin 校验：复用 ADMIN_USER_IDS 环境变量（项目统一规范）
 */

async function checkAdmin(request: NextRequest): Promise<boolean> {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return false;
  const adminIds = process.env.ADMIN_USER_IDS;
  if (!adminIds) {
    console.warn('[admin/orders] ADMIN_USER_IDS not configured');
    return false;
  }
  const list = adminIds.split(',').map((x) => x.trim().toLowerCase());
  return list.includes(userId.toLowerCase());
}

export async function GET(request: NextRequest) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ code: 403, message: '无权限' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status') || 'all';
  const signPath = searchParams.get('sign'); // ?sign=path 单独签 URL

  const supabase = getSupabaseAdmin();

  // 单独签 URL 模式
  if (signPath) {
    try {
      const { data, error } = await supabase.storage
        .from('payment-screenshots')
        .createSignedUrl(signPath, 3600);
      if (error || !data) {
        return NextResponse.json({ code: 500, message: error?.message || '签名失败' }, { status: 500 });
      }
      return NextResponse.json({ code: 200, data: { signed_url: data.signedUrl } });
    } catch (err) {
      console.error('[admin/orders sign] err:', err);
      return NextResponse.json({ code: 500, message: '服务器错误' }, { status: 500 });
    }
  }

  try {
    let query = supabase
      .from('pending_orders')
      .select('id, user_id, user_email, plan, amount, payment_method, payment_screenshot_url, user_note, status, admin_note, approved_at, approved_by, created_at, updated_at')
      .order('status', { ascending: true })   // pending 先
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[admin/orders GET] db err:', error.message);
      return NextResponse.json({ code: 500, message: '查询失败' }, { status: 500 });
    }

    // 统计卡片：待审核 / 今日通过 / 今日拒绝 / 总收入（approved sum）
    const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
    const all = (data || []) as Array<Record<string, unknown>>;
    const stats = {
      pending_count: all.filter((o) => o.status === 'pending').length,
      today_approved: all.filter(
        (o) => o.status === 'approved' && typeof o.approved_at === 'string' && (o.approved_at as string).startsWith(todayStr),
      ).length,
      today_rejected: all.filter(
        (o) => o.status === 'rejected' && typeof o.approved_at === 'string' && (o.approved_at as string).startsWith(todayStr),
      ).length,
      total_revenue: all
        .filter((o) => o.status === 'approved')
        .reduce((sum, o) => sum + Number(o.amount || 0), 0),
    };

    return NextResponse.json({
      code: 200,
      data: { orders: data || [], stats },
    });
  } catch (err) {
    console.error('[admin/orders GET] unexpected:', err);
    return NextResponse.json({ code: 500, message: '服务器错误' }, { status: 500 });
  }
}
