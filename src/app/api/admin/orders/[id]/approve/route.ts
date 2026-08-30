import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


/**
 * POST /api/admin/orders/[id]/approve
 *
 * admin 审批通过：调用 PostgreSQL RPC `approve_pending_order` 完成事务化审批。
 * - 一次 RPC 调用完成：行锁 → 状态校验 → lifetime 防降级 → 写 membership_orders → 更新 user_profiles → mark approved
 * - 任何步骤失败 → 整个事务回滚，不留半成品数据
 * - lifetime 防降级返回 409；订单不存在 404；订单非 pending 400
 *
 * 历史 bug 防御：
 *   1. plpgsql RAISE EXCEPTION 会被 WHEN OTHERS 吞成 500，业务码丢失 → 用 RETURN code:409
 *   2. SELECT FOR UPDATE 行锁防 admin 并发审批同一订单导致双开会员
 */

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(',').map((id) => id.trim().toLowerCase()) || [];

async function checkAdmin(request: NextRequest): Promise<string | null> {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return null;
  if (ADMIN_USER_IDS.length === 0) return null; // 防 env 漏配
  return ADMIN_USER_IDS.includes(userId.toLowerCase()) ? userId : null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // 1. 鉴权
    const adminId = await checkAdmin(request);
    if (!adminId) {
      return NextResponse.json({ code: 403, message: '无权限' }, { status: 403 });
    }

    // 2. 参数校验（Next.js 15: params 是 Promise）
    const { id } = await params;
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ code: 400, message: '无效的订单 ID' }, { status: 400 });
    }

    // 3. 解析 body
    let adminNote: string | null = null;
    try {
      const body = await request.json();
      if (body && typeof body.admin_note === 'string') {
        adminNote = body.admin_note.slice(0, 500);
      }
    } catch {
      // body 为空时忽略
    }

    // 4. 调用 RPC（service_role 客户端，绕过 RLS）
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc('approve_pending_order', {
      p_order_id: id,
      p_admin_id: adminId,
      p_admin_note: adminNote,
    });

    if (error) {
      console.error('[admin/orders approve] RPC error:', error.message);
      return NextResponse.json({ code: 500, message: '审批失败：' + error.message }, { status: 500 });
    }

    // 5. 处理 RPC 返回（业务错误码映射 HTTP 状态）
    const result = data as {
      success: boolean;
      code: number;
      message: string;
      data?: {
        id: string;
        user_id: string;
        plan: string;
        starts_at: string;
        expires_at: string | null;
      };
    };

    if (!result || typeof result.success !== 'boolean') {
      console.error('[admin/orders approve] RPC 返回格式异常:', data);
      return NextResponse.json({ code: 500, message: '审批失败：返回格式异常' }, { status: 500 });
    }

    if (!result.success) {
      const statusMap: Record<number, number> = {
        400: 400,
        404: 404,
        409: 409,
        500: 500,
      };
      const httpStatus = statusMap[result.code] || 500;
      return NextResponse.json(
        { code: result.code, message: result.message },
        { status: httpStatus },
      );
    }

    // 6. 成功返回
    return NextResponse.json({
      code: 200,
      data: result.data,
    });
  } catch (err) {
    console.error('[admin/orders approve] unexpected:', err);
    return NextResponse.json({ code: 500, message: '服务器内部错误' }, { status: 500 });
  }
}
