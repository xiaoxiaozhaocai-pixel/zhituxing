'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Search, 
  CheckCircle, 
  XCircle, 
  Eye,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RefreshCw } from 'lucide-react';

interface Submission {
  id: number;
  job_name: string;
  company_name: string;
  city: string;
  salary_min: number;
  salary_max: number;
  jd_content: string;
  status: number;
  reject_reason: string | null;
  auto_review_result: unknown;
  created_at: string;
  review_time: string | null;
  username: string;
}

export default function JdReviewPage() {
  const { admin } = useAdminAuth();
  
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('0');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [selected, setSelected] = useState<number[]>([]);
  const [detailItem, setDetailItem] = useState<Submission | null>(null);
  const [rejectModal, setRejectModal] = useState<{ show: boolean; id: number | null; reason: string }>({
    show: false,
    id: null,
    reason: ''
  });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [status, page]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: status,
        page: page.toString(),
        pageSize: '20',
        ...(keyword && { keyword })
      });
      
      const response = await fetch(`/admin/api/jobs/review?${params}`);
      const data = await response.json();
      
      if (data.code === 200) {
        setSubmissions(data.data.list);
        setTotal(data.data.pagination.total);
        setStatusCounts(data.data.statusCounts);
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchData();
  };

  const handleApprove = async (id: number) => {
    setActionLoading(true);
    try {
      const response = await fetch('/admin/api/jobs/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          action: 'approve',
          adminId: admin?.id,
          adminUsername: admin?.username
        })
      });
      
      if (response.ok) {
        fetchData();
        setDetailItem(null);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectModal.id || !rejectModal.reason) return;
    
    setActionLoading(true);
    try {
      const response = await fetch('/admin/api/jobs/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: rejectModal.id,
          action: 'reject',
          reason: rejectModal.reason,
          adminId: admin?.id,
          adminUsername: admin?.username
        })
      });
      
      if (response.ok) {
        fetchData();
        setRejectModal({ show: false, id: null, reason: '' });
        setDetailItem(null);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleBatchApprove = async () => {
    if (selected.length === 0) return;
    
    setActionLoading(true);
    try {
      const response = await fetch('/admin/api/jobs/review', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selected,
          action: 'approve',
          adminId: admin?.id,
          adminUsername: admin?.username
        })
      });
      
      if (response.ok) {
        setSelected([]);
        fetchData();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleBatchReject = async () => {
    if (selected.length === 0 || !rejectModal.reason) return;
    
    setActionLoading(true);
    try {
      const response = await fetch('/admin/api/jobs/review', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selected,
          action: 'reject',
          reason: rejectModal.reason,
          adminId: admin?.id,
          adminUsername: admin?.username
        })
      });
      
      if (response.ok) {
        setSelected([]);
        setRejectModal({ show: false, id: null, reason: '' });
        fetchData();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelected(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selected.length === submissions.length) {
      setSelected([]);
    } else {
      setSelected(submissions.map(s => s.id));
    }
  };

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return '面议';
    const format = (n: number) => n >= 10000 ? `${n/10000}万` : `${n/1000}k`;
    if (min && max) return `${format(min)}-${format(max)}`;
    if (min) return `${format(min)}+`;
    return `${format(max!)}以下`;
  };

  const statusLabels = [
    { value: '0', label: '待审核', count: statusCounts.pending, color: 'bg-yellow-100 text-yellow-700' },
    { value: '1', label: '已通过', count: statusCounts.approved, color: 'bg-green-100 text-green-700' },
    { value: '2', label: '已拒绝', count: statusCounts.rejected, color: 'bg-red-100 text-red-700' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">JD审核管理</h1>
        <Button onClick={() => fetchData()} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          刷新
        </Button>
      </div>

      {/* 状态Tab */}
      <div className="flex gap-4">
        {statusLabels.map(item => (
          <button
            key={item.value}
            onClick={() => { setStatus(item.value); setPage(1); }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              status === item.value 
                ? 'bg-purple-600 text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-50 border'
            }`}
          >
            {item.label}
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
              status === item.value ? 'bg-white/20' : item.color
            }`}>
              {item.count}
            </span>
          </button>
        ))}
      </div>

      {/* 搜索 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="搜索岗位名称、企业名称..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch}>搜索</Button>
          </div>
        </CardContent>
      </Card>

      {/* 批量操作 */}
      {selected.length > 0 && (
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="pt-4 pb-4 flex items-center justify-between">
            <span className="text-purple-700 font-medium">已选择 {selected.length} 项</span>
            <div className="flex gap-2">
              <Button 
                onClick={handleBatchApprove} 
                disabled={actionLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                批量通过
              </Button>
              <Button 
                onClick={() => setRejectModal({ show: true, id: null, reason: '' })}
                variant="destructive"
              >
                <XCircle className="w-4 h-4 mr-2" />
                批量拒绝
              </Button>
              <Button onClick={() => setSelected([])} variant="outline">
                取消选择
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 数据列表 */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selected.length === submissions.length && submissions.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">岗位名称</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">企业名称</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">城市</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">薪资</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">提交者</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">提交时间</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-600" />
                    </td>
                  </tr>
                ) : submissions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  submissions.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.includes(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.job_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.company_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.city || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatSalary(item.salary_min, item.salary_max)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.username || '未知'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(item.created_at).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => setDetailItem(item)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {item.status === 0 && (
                            <>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleApprove(item.id)}
                                disabled={actionLoading}
                                className="text-green-600 hover:text-green-700"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => setRejectModal({ show: true, id: item.id, reason: '' })}
                                className="text-red-600 hover:text-red-700"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {total > 20 && (
            <div className="px-4 py-3 border-t flex items-center justify-between">
              <span className="text-sm text-gray-500">共 {total} 条</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="px-3 py-1 text-sm">{page}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * 20 >= total}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 详情弹窗 */}
      {detailItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">JD详情</h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">岗位名称</label>
                    <p className="font-medium">{detailItem.job_name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">企业名称</label>
                    <p className="font-medium">{detailItem.company_name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">工作城市</label>
                    <p>{detailItem.city || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">薪资范围</label>
                    <p>{formatSalary(detailItem.salary_min, detailItem.salary_max)}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-500 mb-2 block">JD内容</label>
                  <div className="bg-gray-50 p-4 rounded-lg text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">
                    {detailItem.jd_content}
                  </div>
                </div>

                {detailItem.reject_reason && (
                  <div className="bg-red-50 p-4 rounded-lg">
                    <label className="text-sm text-red-500">拒绝原因</label>
                    <p className="text-red-700">{detailItem.reject_reason}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setDetailItem(null)}>
                  关闭
                </Button>
                {detailItem.status === 0 && (
                  <>
                    <Button 
                      variant="destructive"
                      onClick={() => {
                        setRejectModal({ show: true, id: detailItem.id, reason: '' });
                        setDetailItem(null);
                      }}
                    >
                      拒绝
                    </Button>
                    <Button 
                      onClick={() => handleApprove(detailItem.id)}
                      disabled={actionLoading}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      通过
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 拒绝弹窗 */}
      {rejectModal.show && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">拒绝原因</h2>
              <textarea
                value={rejectModal.reason}
                onChange={(e) => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="请输入拒绝原因（将通知用户）"
                rows={4}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
              />
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setRejectModal({ show: false, id: null, reason: '' })}>
                  取消
                </Button>
                <Button 
                  variant="destructive"
                  onClick={rejectModal.id ? handleReject : handleBatchReject}
                  disabled={!rejectModal.reason || actionLoading}
                >
                  确认拒绝
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
