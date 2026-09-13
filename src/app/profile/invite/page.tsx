'use client';

/**
 * 邀请奖励页 — 占位版（2026-09-13）
 * 旧"3次AI次数+7天会员"邀请奖励已下线（断头链路+方案更换），
 * 新版邀请奖励方案确定后在此重构。领奖 API /api/invite/claim-reward 已同步短路。
 */

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function InvitePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F8FF] to-white flex items-center justify-center px-5">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-[#165DFF] to-[#3D7FFF] flex items-center justify-center shadow-xl shadow-[#165DFF]/20 text-white text-4xl">
          🎁
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">邀请奖励升级中</h1>
        <p className="text-slate-500 mb-8 leading-relaxed">
          我们正在准备一份更好的邀请礼物，
          <br />
          新的奖励方案即将上线，敬请期待！
        </p>
        <Link href="/">
          <Button className="bg-[#165DFF] hover:bg-[#165DFF]/90 text-white px-8">返回首页</Button>
        </Link>
      </div>
    </div>
  );
}
