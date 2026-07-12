'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus, Loader2, Briefcase, Search, ChevronRight,
  Clock, Users,
} from 'lucide-react';

interface JobPost {
  id: number;
  job_title: string;
  status: 'active' | 'paused' | 'closed';
  auto_push: boolean;
  push_frequency: string;
  created_at: string;
  updated_at: string;
  match_count?: number;
}

export default function JobPostsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    if (statusFilter) params.set('status', statusFilter);

    fetch(`/api/employer/job-posts?${params}`, { credentials: 'include' })
      .then(async (r) => {
        if (r.status === 404) {
          router.push('/employer/auth/login');
          return null;
        }
        const j = await r.json();
        return j;
      })
      .then((data) => {
        if (data && data.success) {
          setJobs(data.data.items);
          setTotal(data.data.total);
        }
      })
      .finally(() => setLoading(false));
  }, [page, statusFilter, router]);

  const statusLabels: Record<string, { label: string; color: string }> = {
    active: { label: '进行中', color: 'bg-green-100 text-green-700' },
    paused: { label: '已暂停', color: 'bg-yellow-100 text-yellow-700' },
    closed: { label: '已关闭', color: 'bg-gray-100 text-gray-500' },
  };

  const statusTabs = [
    { value: '', label: '全部' },
    { value: 'active', label: '进行中' },
    { value: 'paused', label: '已暂停' },
    { value: 'closed', label: '已关闭' },
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-[#165DFF]" />
            岗位管理
          </h1>
          <p className="text-sm text-gray-500 mt-1">管理岗位画像与候选人匹配</p>
        </div>
        <Link
          href="/employer/jobs/new"
          className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] rounded-lg hover:opacity-90 transition shadow-md shadow-[#165DFF]/20"
        >
          <Plus className="w-4 h-4" />
          创建新岗位
        </Link>
      </div>

      {/* 状态筛选 */}
      <div className="flex items-center gap-2">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setStatusFilter(tab.value); setPage(1); }}
            className={`px-3 py-1.5 text-sm rounded-lg transition ${
              statusFilter === tab.value
                ? 'bg-[#165DFF] text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">
          <Loader2 className="w-8 h-8 mx-auto animate-spin mb-2" />
          加载中...
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-100">
          <Briefcase className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-base font-medium text-gray-500 mb-1">暂无岗位</p>
          <p className="text-sm text-gray-400 mb-4">创建你的第一个岗位画像，开始匹配候选人</p>
          <Link
            href="/employer/jobs/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] rounded-lg hover:opacity-90 transition"
          >
            <Plus className="w-4 h-4" />
            创建新岗位
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const st = statusLabels[job.status] || statusLabels.active;
            return (
              <Link
                key={job.id}
                href={`/employer/jobs/${job.id}`}
                className="block bg-white rounded-xl border border-gray-100 hover:border-[#165DFF]/30 hover:shadow-md transition p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-gray-900 truncate">
                        {job.job_title}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${st.color}`}>
                        {st.label}
                      </span>
                      {job.auto_push && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#165DFF]/10 text-[#165DFF]">
                          自动推送
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(job.created_at).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* 分页 */}
      {total > pageSize && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition"
          >
            上一页
          </button>
          <span className="px-3 py-1.5 text-sm text-gray-500">
            第 {page} 页 / 共 {Math.ceil(total / pageSize)} 页
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= Math.ceil(total / pageSize)}
            className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
