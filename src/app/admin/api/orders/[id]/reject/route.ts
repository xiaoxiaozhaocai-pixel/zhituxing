import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


/**
 * POST /api/admin/orders/[id]/reject
 * body: { admin_note: string }  // 拒绝原因必填
 *
 * 仅更新 pending_orders.status='rejected' + admin_note + approved_at + approved_by
 * 不影响 user_profiles / membership_orders
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const _authCheck = requireAdmin(request);
  if (_authCheck) return _authCheck;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ code: 400, message: '缺少订单 id' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({} as { admin_note?: string }));
  const adminNote = typeof body.admin_note === 'string' ? body.admin_note.trim() : '';
  if (!adminNote) {
    return NextResponse.json({ code: 400, message: '拒绝原因必填' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  try {
    const { data: existing, error: fetchErr } = await supabase
      .from('pending_orders')
      .select('id, status')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr || !existing) {
      return NextResponse.json({ code: 404, message: '订单不存在' }, { status: 404 });
    }
    if (existing.status !== 'pending') {
      return NextResponse.json({ code: 400, message: `订单已是 ${existing.status} 状态` }, { status: 400 });
    }

    const { error: updErr } = await supabase
      .from('pending_orders')
      .update({
        status: 'rejected',
        admin_note: adminNote.slice(0, 500),
        approved_at: new Date().toISOString(),
        approved_by: 'admin',
      })
      .eq('id', id);
    if (updErr) {
      console.error('[admin/orders reject] err:', updErr.message);
      return NextResponse.json({ code: 500, message: '拒绝失败：' + updErr.message }, { status: 500 });
    }

    return NextResponse.json({ code: 200, data: { id } });
  } catch (err) {
    console.error('[admin/orders reject] unexpected:', err);
    return NextResponse.json({ code: 500, message: '服务器错误' }, { status: 500 });
  }
}
