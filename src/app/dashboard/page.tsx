'use client';

import DashboardContent from '@/components/DashboardContent';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/60 via-white to-blue-50/40">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1E293B]">我的求职档案</h1>
          <p className="text-[#64748B] text-sm mt-1">一站式查看你的求职进度与推荐</p>
        </div>
        <DashboardContent />
      </div>
    </div>
  );
}
