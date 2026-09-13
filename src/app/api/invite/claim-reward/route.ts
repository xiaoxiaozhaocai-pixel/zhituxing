import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

/**
 * 领取邀请奖励 — 已下线（2026-09-13）
 * 旧"3次AI次数+7天会员"奖励链路移除，本端点短路拒绝。
 * 新版邀请奖励上线时与 /api/invite/* 一并重构。
 */
export async function POST() {
  return NextResponse.json({ success: false, error: '邀请奖励升级中，暂停领取，敬请期待' });
}
