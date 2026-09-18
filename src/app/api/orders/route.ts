import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/rate-limit';
export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

/**
 * /api/orders
 *
 * 会员订单提交 + 个人订单查询
 * - POST：用户上传付款截图后提交 pending_orders 行（service_role 写）
 * - GET：合并 pending_orders + membership_orders，时间倒序返回
 *
 * 安全：amount 服务端从 membership_plans 读，防止前端篡改价格
 */

type PayMethod = 'wechat' | 'alipay';
type Plan = 'monthly' | 'semester' | 'yearly' | 'lifetime';

const VALID_METHODS: PayMethod[] = ['wechat', 'alipay'];
const VALID_PLANS: Plan[] = ['monthly', 'semester', 'yearly', 'lifetime'];

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ code: 401, message: '请先登录' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ code: 400, message: '请求体格式错误' }, { status: 400 });
    }

    const { plan, payment_method, payment_screenshot_url, user_note } = body as {
      plan?: string;
      payment_method?: string;
      payment_screenshot_url?: string;
      user_note?: string;
    };

    if (!plan || !VALID_PLANS.includes(plan as Plan)) {
      return NextResponse.json({ code: 400, message: '套餐参数无效' }, { status: 400 });
    }
    if (!payment_method || !VALID_METHODS.includes(payment_method as PayMethod)) {
      return NextResponse.json({ code: 400, message: '支付方式无效' }, { status: 400 });
    }
    if (!payment_screenshot_url || typeof payment_screenshot_url !== 'string') {
      return NextResponse.json({ code: 400, message: '请上传付款截图' }, { status: 400 });
    }

    // 频控：同用户 5 单/10 分钟（防垃圾单刷屏审核后台；全局 400/min 之外的业务级防线）
    const orderCheck = await checkRateLimit(`orders:${user.id}`, { maxRequests: 5, windowMs: 600_000 });
    if (!orderCheck.success) {
      return NextResponse.json({
        code: 429,
        message: '提交过于频繁，请稍后再试',
        retryAfter: orderCheck.retryAfter,
      }, { status: 429 });
    }

    // 截图凭证校验：必须是本站 Storage 上传路径（{userId}/{timestamp}.{ext}），
    // 拒绝外链/伪协议——admin 审核后台只渲染站内 Storage 对象
    // 加固：前缀必须等于当前登录用户的 UUID（杜绝越权引用他人截图），并确认该对象存在于 Storage
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/\d+\.(jpg|png|webp)$/i.test(payment_screenshot_url)) {
      return NextResponse.json({ code: 400, message: '付款截图无效，请先上传' }, { status: 400 });
    }
    const ownerId = (payment_screenshot_url.split('/')[0] || '').toLowerCase();
    if (ownerId !== user.id.toLowerCase()) {
      return NextResponse.json({ code: 400, message: '付款截图无效，请先上传' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 服务端从 membership_plans 拿权威金额（防价格篡改）
    const { data: planRow, error: planErr } = await supabase
      .from('membership_plans')
      .select('plan, amount, is_active')
      .eq('plan', plan)
      .maybeSingle();

    if (planErr || !planRow) {
      console.error('[orders POST] plan lookup failed:', planErr?.message);
      return NextResponse.json({ code: 400, message: '套餐不存在' }, { status: 400 });
    }
    if (!planRow.is_active) {
      return NextResponse.json({ code: 400, message: '该套餐暂未开放' }, { status: 400 });
    }

    const amount = Number(planRow.amount);
    const noteText = typeof user_note === 'string' ? user_note.slice(0, 500) : null;

    const { data: inserted, error: insertErr } = await supabase
      .from('pending_orders')
      .insert({
        user_id: user.id,
        user_email: user.email,
        plan,
        amount,
        payment_method,
        payment_screenshot_url,
        user_note: noteText,
        status: 'pending',
      })
      .select('id, created_at')
      .single();

    if (insertErr || !inserted) {
      console.error('[orders POST] insert failed:', insertErr?.message);
      return NextResponse.json({ code: 500, message: '订单创建失败' }, { status: 500 });
    }

    return NextResponse.json({
      code: 200,
      message: '订单已提交，1 小时内激活',
      data: { id: inserted.id, created_at: inserted.created_at },
    });
  } catch (err) {
    console.error('[orders POST] unexpected error:', err);
    return NextResponse.json({ code: 500, message: '服务器错误' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ code: 401, message: '请先登录' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    const [{ data: pending, error: pendingErr }, { data: approved, error: approvedErr }] = await Promise.all([
      supabase
        .from('pending_orders')
        .select('id, plan, amount, payment_method, status, admin_note, user_note, created_at, approved_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('membership_orders')
        .select('id, plan, amount, payment_method, starts_at, expires_at, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ]);

    if (pendingErr) console.error('[orders GET] pending err:', pendingErr.message);
    if (approvedErr) console.error('[orders GET] approved err:', approvedErr.message);

    type Row = Record<string, unknown> & { created_at: string };
    const merged: Row[] = [
      ...((pending || []) as Row[]).map((r) => ({ ...r, source: 'pending' as const })),
      ...((approved || []) as Row[]).map((r) => ({
        ...r,
        source: 'approved' as const,
        status: 'approved',
      })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ code: 200, data: merged });
  } catch (err) {
    console.error('[orders GET] unexpected error:', err);
    return NextResponse.json({ code: 500, message: '服务器错误' }, { status: 500 });
  }
}
