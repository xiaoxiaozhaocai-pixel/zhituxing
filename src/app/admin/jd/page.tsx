'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/* ─── 类型 ─── */
interface JdItem {
  id: number;
  job_name: string;
  industry: string;
  city: string;
  company_name: string;
  salary_min: number | null;
  salary_max: number | null;
  skills: string;
  source: string | null;
  status: string | null;
  created_at: string;
}

interface JdStats {
  total: number;
  active_count: number;
  disabled_count: number;
  expired_count: number;
  this_week_new: number;
}

interface TopSkill {
  skill: string;
  cnt: number;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export default function AdminJdPage() {
  /* ─── 状态 ─── */
  const [data, setData] = useState<JdItem[]>([]);
  const [stats, setStats] = useState<JdStats | null>(null);
  const [topSkills, setTopSkills] = useState<TopSkill[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 10, total: 0, totalPages: 0 });

  // 筛选
  const [keyword, setKeyword] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // 选中 & 批量操作
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState('');

  // 详情
  const [detailItem, setDetailItem] = useState<JdItem | null>(null);

  // 加载
  const [loading, setLoading] = useState(false);

  /* ─── 请求函数 ─── */
  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pagination.pageSize),
      });
      if (keyword) params.set('keyword', keyword);
      if (filterIndustry) params.set('industry', filterIndustry);
      if (filterCity) params.set('city', filterCity);
      if (filterStatus) params.set('status', filterStatus);

      const res = await fetch(`/api/admin/jd?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data || []);
        setPagination(json.pagination);
        setStats(json.stats);
        setTopSkills(json.topSkills || []);
      }
    } catch (err) {
      console.error('获取JD列表失败:', err);
    } finally {
      setLoading(false);
    }
  }, [keyword, filterIndustry, filterCity, filterStatus, pagination.pageSize]);

  useEffect(() => {
    fetchData(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── 操作 ─── */
  const handleSearch = () => {
    setSelectedIds([]);
    fetchData(1);
  };

  const handlePageChange = (newPage: number) => {
    fetchData(newPage);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === data.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(data.map((d) => d.id));
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedIds.length === 0) return;
    try {
      const res = await fetch('/api/admin/jd', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, status: bulkAction }),
      });
      const json = await res.json();
      if (json.success) {
        setSelectedIds([]);
        setBulkAction('');
        fetchData(pagination.page);
      }
    } catch (err) {
      console.error('批量操作失败:', err);
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await fetch('/api/admin/jd', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id], status: newStatus }),
      });
      fetchData(pagination.page);
    } catch (err) {
      console.error('状态更新失败:', err);
    }
  };

  /* ─── 辅助函数 ─── */
  const statusBadge = (status: string | null) => {
    const s = status || 'active';
    const map: Record<string, string> = {
      active: 'bg-green-50 text-green-700 border border-green-200',
      disabled: 'bg-red-50 text-red-700 border border-red-200',
      expired: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    };
    const labels: Record<string, string> = {
      active: '启用',
      disabled: '禁用',
      expired: '过期',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[s] || map.active}`}>
        {labels[s] || s}
      </span>
    );
  };

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return '-';
    return `${min ? (min / 1000).toFixed(0) : '?'}K-${max ? (max / 1000).toFixed(0) : '?'}K`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  /* ─── 渲染 ─── */
  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'JD总数', value: stats?.total ?? 0, color: 'text-blue-600' },
          { label: '启用', value: stats?.active_count ?? 0, color: 'text-green-600' },
          { label: '禁用', value: stats?.disabled_count ?? 0, color: 'text-red-600' },
          { label: '过期', value: stats?.expired_count ?? 0, color: 'text-yellow-600' },
          { label: '本周新增', value: stats?.this_week_new ?? 0, color: 'text-purple-600' },
        ].map((card) => (
          <Card key={card.label} className="p-4 bg-white border-[#E2E8F0] shadow-sm">
            <div className="text-xs text-[#64748B] mb-1">{card.label}</div>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
          </Card>
        ))}
      </div>

      {/* 热门技能 Top 10 */}
      {topSkills.length > 0 && (
        <Card className="p-4 bg-white border-[#E2E8F0] shadow-sm">
          <h3 className="text-sm font-medium text-[#1E293B] mb-3">热门技能 Top 10</h3>
          <div className="flex flex-wrap gap-2">
            {topSkills.map((s, i) => (
              <div
                key={s.skill}
                className="flex items-center gap-2 bg-[#F8FAFC] rounded-lg px-3 py-1.5 border border-[#E2E8F0]"
              >
                <span className={`text-xs font-bold ${i < 3 ? 'text-amber-500' : 'text-[#64748B]'}`}>
                  #{i + 1}
                </span>
                <span className="text-sm text-[#1E293B]">{s.skill.trim()}</span>
                <span className="text-xs text-[#64748B]">{s.cnt}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 筛选栏 */}
      <Card className="p-4 bg-white border-[#E2E8F0] shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-[#64748B] mb-1 block">关键词</label>
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="岗位名/技能/公司"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            />
          </div>
          <div className="w-36">
            <label className="text-xs text-[#64748B] mb-1 block">行业</label>
            <Input
              value={filterIndustry}
              onChange={(e) => setFilterIndustry(e.target.value)}
              placeholder="行业"
            />
          </div>
          <div className="w-36">
            <label className="text-xs text-[#64748B] mb-1 block">城市</label>
            <Input
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              placeholder="城市"
            />
          </div>
          <div className="w-28">
            <label className="text-xs text-[#64748B] mb-1 block">状态</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full h-9 rounded-md border border-[#E2E8F0] bg-white text-[#1E293B] text-sm px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部</option>
              <option value="active">启用</option>
              <option value="disabled">禁用</option>
              <option value="expired">过期</option>
            </select>
          </div>
          <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700 text-white">
            搜索
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setKeyword('');
              setFilterIndustry('');
              setFilterCity('');
              setFilterStatus('');
              setTimeout(() => fetchData(1), 0);
            }}
          >
            重置
          </Button>
        </div>
      </Card>

      {/* 批量操作栏 */}
      {selectedIds.length > 0 && (
        <Card className="p-3 bg-blue-50 border-blue-200 flex items-center gap-4">
          <span className="text-sm text-blue-700">
            已选 <strong>{selectedIds.length}</strong> 条
          </span>
          <select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value)}
            className="h-8 rounded-md border border-[#E2E8F0] bg-white text-[#1E293B] text-sm px-2"
          >
            <option value="">选择操作</option>
            <option value="active">批量启用</option>
            <option value="disabled">批量禁用</option>
            <option value="expired">标记过期</option>
          </select>
          <Button
            size="sm"
            onClick={handleBulkAction}
            disabled={!bulkAction}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            执行
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds([])}
            className="text-[#64748B]"
          >
            取消选择
          </Button>
        </Card>
      )}

      {/* 表格 */}
      <Card className="bg-white border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === data.length && data.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left text-[#64748B] font-medium">岗位名称</th>
                <th className="px-4 py-3 text-left text-[#64748B] font-medium">行业</th>
                <th className="px-4 py-3 text-left text-[#64748B] font-medium">城市</th>
                <th className="px-4 py-3 text-left text-[#64748B] font-medium">公司</th>
                <th className="px-4 py-3 text-left text-[#64748B] font-medium">薪资</th>
                <th className="px-4 py-3 text-left text-[#64748B] font-medium">状态</th>
                <th className="px-4 py-3 text-left text-[#64748B] font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[#64748B]">
                    加载中...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[#64748B]">
                    暂无数据
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-[#E2E8F0]/50 hover:bg-blue-50/30 transition"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setDetailItem(item)}
                        className="text-blue-600 hover:text-blue-800 hover:underline text-left"
                      >
                        {item.job_name}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-[#64748B]">{item.industry || '-'}</td>
                    <td className="px-4 py-3 text-[#64748B]">{item.city || '-'}</td>
                    <td className="px-4 py-3 text-[#64748B]">{item.company_name || '-'}</td>
                    <td className="px-4 py-3 text-[#1E293B] font-mono text-xs">
                      {formatSalary(item.salary_min, item.salary_max)}
                    </td>
                    <td className="px-4 py-3">{statusBadge(item.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {(item.status || 'active') !== 'active' && (
                          <button
                            onClick={() => handleStatusChange(item.id, 'active')}
                            className="px-2 py-0.5 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 border border-green-200"
                          >
                            启用
                          </button>
                        )}
                        {(item.status || 'active') !== 'disabled' && (
                          <button
                            onClick={() => handleStatusChange(item.id, 'disabled')}
                            className="px-2 py-0.5 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100 border border-red-200"
                          >
                            禁用
                          </button>
                        )}
                        {(item.status || 'active') !== 'expired' && (
                          <button
                            onClick={() => handleStatusChange(item.id, 'expired')}
                            className="px-2 py-0.5 text-xs bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100 border border-yellow-200"
                          >
                            过期
                          </button>
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
        <div className="px-4 py-3 border-t border-[#E2E8F0] flex items-center justify-between">
          <span className="text-xs text-[#64748B]">
            共 {pagination.total} 条，第 {pagination.page}/{pagination.totalPages || 1} 页
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.page <= 1}
              onClick={() => handlePageChange(pagination.page - 1)}
              className="h-7"
            >
              上一页
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => handlePageChange(pagination.page + 1)}
              className="h-7"
            >
              下一页
            </Button>
          </div>
        </div>
      </Card>

      {/* 详情弹窗 */}
      {detailItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setDetailItem(null)}
        >
          <Card
            className="w-full max-w-2xl bg-white border-[#E2E8F0] p-6 max-h-[80vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#1E293B]">{detailItem.job_name}</h3>
              <button
                onClick={() => setDetailItem(null)}
                className="text-[#64748B] hover:text-[#1E293B] text-xl"
              >
                x
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-[#64748B]">行业：</span><span className="text-[#1E293B]">{detailItem.industry || '-'}</span></div>
              <div><span className="text-[#64748B]">城市：</span><span className="text-[#1E293B]">{detailItem.city || '-'}</span></div>
              <div><span className="text-[#64748B]">公司：</span><span className="text-[#1E293B]">{detailItem.company_name || '-'}</span></div>
              <div><span className="text-[#64748B]">薪资：</span><span className="text-[#1E293B]">{formatSalary(detailItem.salary_min, detailItem.salary_max)}</span></div>
              <div><span className="text-[#64748B]">来源：</span><span className="text-[#1E293B]">{detailItem.source || '-'}</span></div>
              <div><span className="text-[#64748B]">状态：</span>{statusBadge(detailItem.status)}</div>
              <div><span className="text-[#64748B]">创建时间：</span><span className="text-[#1E293B]">{formatDate(detailItem.created_at)}</span></div>
            </div>

            {detailItem.skills && (
              <div className="mt-4">
                <span className="text-[#64748B] text-sm">技能要求：</span>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {detailItem.skills.split(',').map((skill, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs border border-blue-200"
                    >
                      {skill.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex gap-2">
              <Button
                size="sm"
                onClick={() => { handleStatusChange(detailItem.id, 'active'); setDetailItem(null); }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                启用
              </Button>
              <Button
                size="sm"
                onClick={() => { handleStatusChange(detailItem.id, 'disabled'); setDetailItem(null); }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                禁用
              </Button>
              <Button
                size="sm"
                onClick={() => { handleStatusChange(detailItem.id, 'expired'); setDetailItem(null); }}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                标记过期
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
