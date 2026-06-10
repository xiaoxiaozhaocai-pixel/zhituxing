import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

// ============================================================
// POST — 上报行为事件（Coze平台注入的统计脚本）
// 无论什么情况都返回 success:true，不做数据库写入
// ============================================================
export async function POST(_request: NextRequest) {
  // 静默接收，不做任何处理
  return NextResponse.json({ success: true });
}

// ============================================================
// GET — 健康检查
// ============================================================
export async function GET() {
  return NextResponse.json({ success: true });
}
