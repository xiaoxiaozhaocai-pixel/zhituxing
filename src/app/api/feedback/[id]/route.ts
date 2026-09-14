import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

/**
 * /api/feedback/[id] — 已下线（2026-09-14 安全收口）
 * 原因：GET/PUT 均无鉴权且无前端调用方（PUT 真身在受 admin_token 保护的
 * /admin/api/feedback/[id]）；裸露的 PUT 曾可匿名冒充官方回复、GET 可读任意反馈。
 * 用户提交反馈入口保留：POST /api/feedback
 */
export async function GET() {
  return NextResponse.json({ error: '接口已下线' }, { status: 404 });
}

export async function PUT() {
  return NextResponse.json({ error: '接口已下线' }, { status: 404 });
}
