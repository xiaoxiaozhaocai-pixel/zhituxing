"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, FileText, ChevronRight, Loader2, BarChart3 } from 'lucide-react';

interface Portrait {
  id: string;
  title: string;
  status: string;
  candidate_count: number;
  evaluated_count: number;
  report_generated: boolean;
  created_at: string;
}

export default function PortraitListPage() {
  const router = useRouter();
  const [portraits, setPortraits] = useState<Portrait[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/employer/portrait', { credentials: 'include' })
      .then(r => r.json())
      .then(res => {
        if (res.error === 'UNAUTHORIZED') { router.push('/employer/auth/login'); return; }
        if (res.ok) setPortraits(res.data.items || []);
      })
      .finally(() => setLoading(false));
  }, [router]);

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-600',
      active: 'bg-blue-100 text-[#165DFF]',
      closed: 'bg-gray-100 text-gray-400',
    };
    const label: Record<string, string> = { draft: '草稿', active: '评估中', closed: '已关闭' };
    return <span className={`text-xs px-2 py-0.5 rounded-full ${map[s] || map.draft}`}>{label[s] || s}</span>;
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-[#165DFF]" />
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">岗位真实画像</h1>
          <p className="text-sm text-gray-500 mt-1">创建岗位画像项目，让HR批量评估候选人，自动生成该岗位的真实人才画像</p>
        </div>
        <Link
          href="/employer/portrait/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] text-white text-sm font-medium rounded-lg shadow-md shadow-[#165DFF]/20 hover:shadow-lg hover:from-[#165DFF]/90 hover:to-[#3D7FFF]/90 transition-all"
        >
          <Plus className="w-4 h-4" />
          新建画像项目
        </Link>
      </div>

      {portraits.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">还没有画像项目</p>
          <p className="text-sm text-gray-400 mt-2">创建一个项目，导入候选人后开始盲评</p>
          <Link
            href="/employer/portrait/new"
            className="inline-block mt-4 text-sm text-[#165DFF] hover:underline"
          >
            立即创建 →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {portraits.map(p => (
            <Link
              key={p.id}
              href={`/employer/portrait/${p.id}`}
              className="block bg-white rounded-xl border border-gray-100 p-4 hover:border-[#165DFF]/20 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900">{p.title}</h3>
                    {statusBadge(p.status)}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span>候选人 {p.candidate_count}人</span>
                    <span>已评 {p.evaluated_count}人</span>
                    {p.evaluated_count > 0 && (
                      <span className="text-[#165DFF]">
                        完成度 {Math.round(p.evaluated_count / Math.max(p.candidate_count, 1) * 100)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {p.report_generated && (
                    <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                      <BarChart3 className="w-3 h-3" />
                      报告已生成
                    </span>
                  )}
                  <ChevronRight className="w-5 h-5 text-gray-300" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
