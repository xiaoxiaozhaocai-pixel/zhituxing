'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import BatchImportModal from '@/components/admin/BatchImportModal';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Building2,
  MapPin,
  DollarSign,
  X,
  Upload
} from 'lucide-react';

interface Job {
  id: string;
  job_name: string;
  company_name: string;
  city: string;
  salary_min: number;
  salary_max: number;
  industry: string;
  source: string;
  is_fresh_friendly: boolean;
  created_at: string;
}

export default function JobsPage() {
  const { admin } = useAdminAuth();
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  const [filters, setFilters] = useState({ keyword: '', source: '', city: '' });
  const [modal, setModal] = useState<{ show: boolean; mode: 'create' | 'edit'; data?: Job }>({
    show: false,
    mode: 'create'
  });
  const [form, setForm] = useState({
    job_name: '', company_name: '', company_type: '', city: '',
    salary_min: '', salary_max: '', industry: '', skills: '',
    jd_content: '', is_fresh_friendly: true
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [showBatchImport, setShowBatchImport] = useState(false);

  useEffect(() => {
    fetchData();
  }, [page]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '20',
        ...(filters.keyword && { keyword: filters.keyword }),
        ...(filters.source && { source: filters.source }),
        ...(filters.city && { city: filters.city })
      });
      
      const response = await fetch(`/admin/api/jobs?${params}`);
      const data = await response.json();
      
      if (data.code === 200) {
        setJobs(data.data.list);
        setSources(data.data.sources);
        setCities(data.data.cities);
        setTotal(data.data.pagination.total);
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = modal.mode === 'create' ? '/admin/api/jobs' : '/admin/api/jobs';
      const method = modal.mode === 'create' ? 'POST' : 'PUT';
      
      const body: any = {
        ...form,
        salary_min: parseInt(form.salary_min) || 0,
        salary_max: parseInt(form.salary_max) || 0,
        adminId: admin?.id,
        adminUsername: admin?.username
      };
      
      if (modal.mode === 'edit' && modal.data) {
        body.id = modal.data.id;
      }
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (response.ok) {
        setModal({ show: false, mode: 'create' });
        fetchData();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    
    try {
      await fetch(`/admin/api/jobs?id=${deleteConfirm.id}`, { method: 'DELETE' });
      setDeleteConfirm(null);
      fetchData();
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const openEdit = (job: Job) => {
    setForm({
      job_name: job.job_name,
      company_name: job.company_name,
      company_type: '',
      city: job.city,
      salary_min: job.salary_min?.toString() || '',
      salary_max: job.salary_max?.toString() || '',
      industry: job.industry || '',
      skills: '',
      jd_content: '',
      is_fresh_friendly: job.is_fresh_friendly
    });
    setModal({ show: true, mode: 'edit', data: job });
  };

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return '面议';
    return `${min || 0}-${max || 0}K`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">JD管理</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowBatchImport(true)}>
            <Upload className="w-4 h-4 mr-2" />
            批量导入JD
          </Button>
          <Button onClick={() => { setForm({
            job_name: '', company_name: '', company_type: '', city: '',
            salary_min: '', salary_max: '', industry: '', skills: '',
            jd_content: '', is_fresh_friendly: true
          }); setModal({ show: true, mode: 'create' }); }}>
            <Plus className="w-4 h-4 mr-2" />
            新增JD
          </Button>
        </div>
      </div>

      {/* 筛选 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="搜索岗位名称、企业名称..."
                value={filters.keyword}
                onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <select
              value={filters.source}
              onChange={(e) => { setFilters(prev => ({ ...prev, source: e.target.value })); setPage(1); }}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            >
              <option value="">全部来源</option>
              {sources.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={filters.city}
              onChange={(e) => { setFilters(prev => ({ ...prev, city: e.target.value })); setPage(1); }}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            >
              <option value="">全部城市</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <Button onClick={handleSearch}>搜索</Button>
          </div>
        </CardContent>
      </Card>

      {/* 列表 */}
      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <span className="text-sm text-gray-500">共 {total} 条</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">岗位名称</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">企业</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">城市</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">薪资</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">来源</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-600" />
                    </td>
                  </tr>
                ) : jobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">暂无数据</td>
                  </tr>
                ) : (
                  jobs.map(job => (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-medium">{job.job_name}</span>
                        {job.is_fresh_friendly && (
                          <Badge className="ml-2 bg-green-100 text-green-700 text-xs">应届</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{job.company_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{job.city}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="text-orange-600 font-medium">{formatSalary(job.salary_min, job.salary_max)}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant="outline">{job.source || '手动添加'}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(job)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600"
                            onClick={() => setDeleteConfirm({ show: true, id: job.id })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {total > 20 && (
            <div className="px-4 py-3 border-t flex justify-center">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>上一页</Button>
                <span className="px-3 py-1 text-sm">第 {page} 页</span>
                <Button size="sm" variant="outline" onClick={() => setPage(p => p + 1)} disabled={page * 20 >= total}>下一页</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 新增/编辑弹窗 */}
      {modal.show && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{modal.mode === 'create' ? '新增' : '编辑'}JD</h2>
                <button onClick={() => setModal({ show: false, mode: 'create' })}><X className="w-5 h-5" /></button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">岗位名称 *</label>
                    <Input value={form.job_name} onChange={(e) => setForm(prev => ({ ...prev, job_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">企业名称 *</label>
                    <Input value={form.company_name} onChange={(e) => setForm(prev => ({ ...prev, company_name: e.target.value }))} />
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">城市 *</label>
                    <Input value={form.city} onChange={(e) => setForm(prev => ({ ...prev, city: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">薪资下限(K)</label>
                    <Input type="number" value={form.salary_min} onChange={(e) => setForm(prev => ({ ...prev, salary_min: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">薪资上限(K)</label>
                    <Input type="number" value={form.salary_max} onChange={(e) => setForm(prev => ({ ...prev, salary_max: e.target.value }))} />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">行业</label>
                    <Input value={form.industry} onChange={(e) => setForm(prev => ({ ...prev, industry: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">企业类型</label>
                    <select className="w-full px-3 py-2 border rounded-lg" value={form.company_type} onChange={(e) => setForm(prev => ({ ...prev, company_type: e.target.value }))}>
                      <option value="">请选择</option>
                      <option value="国企">国企</option>
                      <option value="民企">民企</option>
                      <option value="上市公司">上市公司</option>
                      <option value="外企">外企</option>
                      <option value="事业单位">事业单位</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">岗位描述</label>
                  <textarea
                    value={form.jd_content}
                    onChange={(e) => setForm(prev => ({ ...prev, jd_content: e.target.value }))}
                    rows={5}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.is_fresh_friendly} onChange={(e) => setForm(prev => ({ ...prev, is_fresh_friendly: e.target.checked }))} />
                  <span className="text-sm">应届生友好</span>
                </label>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setModal({ show: false, mode: 'create' })}>取消</Button>
                  <Button onClick={handleSave} disabled={saving || !form.job_name || !form.company_name || !form.city}>
                    {saving ? '保存中...' : '保存'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 删除确认 */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">确认删除</h2>
              <p className="text-gray-600 mb-6">确定要删除这条JD吗？此操作不可撤销。</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteConfirm(null)}>取消</Button>
                <Button variant="destructive" onClick={handleDelete}>确认删除</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 批量导入弹窗 */}
      <BatchImportModal
        show={showBatchImport}
        onClose={() => setShowBatchImport(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
