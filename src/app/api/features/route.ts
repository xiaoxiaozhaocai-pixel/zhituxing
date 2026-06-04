export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getAllFlags } from '@/lib/features/flags';

/**
 * GET /api/features — 获取所有 Feature Flag 状态
 * 管理员可查看所有，普通用户只返回已启用的
 */
export async function GET() {
  try {
    const flags = getAllFlags();
    return NextResponse.json({
      success: true,
      data: {
        flags,
        total: flags.length,
        enabled: flags.filter(f => f.enabled).length,
      },
    });
  } catch (err) {
    console.error('[features] Error:', err);
    return NextResponse.json({ success: false, message: '服务器异常' }, { status: 500 });
  }
}
