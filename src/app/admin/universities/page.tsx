'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import Image from 'next/image';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Building2, Search, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, X, GraduationCap, Users } from 'lucide-react';

// ============ 类型 ============
interface University {
  id: number;
  name: string;
  domain: string;
  logo_url: string | null;
  status: 'active' | 'inactive' | 'trial';
  plan: 'free' | 'starter' | 'pro';
  student_count: number;
  admin_count: number;
  created_at: string;
}

interface UniversityForm {
  name: string;
  domain: string;
  logo_url: string;
  status: string;
  plan: string;
}

const defaultForm: UniversityForm = {
  name: '',
  domain: '',
  logo_url: '',
  status: 'trial',
  plan: 'free',
};

// ============ 常量 ============
const STATUS_MAP: Record<string, { label: string; className: string }> = {
  active: { label: '运营中', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  inactive: { label: '已停用', className: 'bg-gray-50 text-gray-500 border-gray-200' },
  trial: { label: '试用中', className: 'bg-blue-50 text-blue-600 border-blue-200' },
};

const PLAN_MAP: Record<string, { label: string; className: string }> = {
  free: { label: 'Free', className: 'bg-gray-50 text-gray-600 border-gray-200' },
  starter: { label: 'Starter', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  pro: { label: 'Pro', className: 'bg-blue-50 text-blue-700 border-blue-200' },
};

// ============ 主组件 ============
export default function AdminUniversitiesPage() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });

  // 筛选
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // 弹窗
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<UniversityForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [_deleteConfirmId, _setDeleteConfirmId] = useState<number | null>(null);

  // 加载列表
  const fetchList = useCallback(async (page = 1) => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
      });
      if (keyword) params.set('keyword', keyword);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/admin/api/universities?${params}`);
      const data = await res.json();
      if (data.code === 200) {
        setUniversities(data.data.list);
        setPagination(data.data.pagination);
      }
    } catch (e) { console.error('fetchList error', e); }
  }, [keyword, statusFilter]);

  useEffect(() => { fetchList(1); }, [fetchList]);

  // 打开创建弹窗
  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  // 打开编辑弹窗
  const openEdit = (uni: University) => {
    setEditingId(uni.id);
    setForm({
      name: uni.name,
      domain: uni.domain,
      logo_url: uni.logo_url || '',
      status: uni.status,
      plan: uni.plan,
    });
    setDialogOpen(true);
  };

  // 保存
  const handleSave = async () => {
    if (!form.name.trim() || !form.domain.trim()) return;
    setSaving(true);
    try {
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId ? { id: editingId, ...form } : form;
      const res = await fetch('/admin/api/universities', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.code === 200) {
        setDialogOpen(false);
        fetchList(pagination.page);
      } else {
        alert(data.message || '操作失败');
      }
    } catch (e) { console.error('save error', e); }
    setSaving(false);
  };

  // 停用
  const handleDeactivate = async (id: number) => {
    if (!confirm('确定停用该高校？')) return;
    try {
      const res = await fetch(`/admin/api/universities?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.code === 200) {
        fetchList(pagination.page);
      } else {
        alert(data.message || '操作失败');
      }
    } catch (e) { console.error('deactivate error', e); }
  };

  // 跳转详情
  const goDetail = (id: number) => {
// eslint-disable-next-line react-hooks/immutability
    window.location.href = `/admin/universities/${id}`;
  };

  return (
    <div className="space-y-6">
      {/* 顶部操作栏 */}
      <Card className="bg-white border-[#E2E8F0] shadow-sm">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                <Input
                  placeholder="搜索高校名称..."
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  className="pl-9 w-[240px]"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="active">运营中</SelectItem>
                  <SelectItem value="trial">试用中</SelectItem>
                  <SelectItem value="inactive">已停用</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => fetchList(1)} className="bg-blue-600 hover:bg-blue-700 text-white">
                搜索
              </Button>
              {(keyword || statusFilter !== 'all') && (
                <Button
                  variant="ghost"
                  onClick={() => { setKeyword(''); setStatusFilter('all'); }}
                  className="text-[#64748B] hover:text-[#1E293B]"
                >
                  <X className="h-4 w-4 mr-1" />清除
                </Button>
              )}
            </div>
            <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-1" />创建高校
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 高校列表 */}
      <Card className="bg-white border-[#E2E8F0] shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="text-[#1E293B] text-base">
            高校列表
            <span className="text-[#64748B] text-sm font-normal ml-2">
              共 {pagination.total} 所
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[#64748B]">名称</TableHead>
                  <TableHead className="text-[#64748B]">域名</TableHead>
                  <TableHead className="text-[#64748B]">状态</TableHead>
                  <TableHead className="text-[#64748B]">套餐</TableHead>
                  <TableHead className="text-[#64748B]">学生数</TableHead>
                  <TableHead className="text-[#64748B]">管理员</TableHead>
                  <TableHead className="text-[#64748B]">创建时间</TableHead>
                  <TableHead className="text-[#64748B] text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {universities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-[#64748B] py-8">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : universities.map(uni => {
                  const st = STATUS_MAP[uni.status] || STATUS_MAP.inactive;
                  const pl = PLAN_MAP[uni.plan] || PLAN_MAP.free;
                  return (
                    <TableRow key={uni.id} className="hover:bg-blue-50/50 cursor-pointer" onClick={() => goDetail(uni.id)}>
                      <TableCell className="text-[#1E293B] font-medium">
                        <div className="flex items-center gap-2">
                          {uni.logo_url ? (
                            <Image src={uni.logo_url} alt={`${uni.name}校徽`} width={24} height={24} className="rounded object-cover" unoptimized />
                          ) : (
                            <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center">
                              <Building2 className="h-3.5 w-3.5 text-blue-600" />
                            </div>
                          )}
                          {uni.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-[#64748B] font-mono text-sm">{uni.domain}</TableCell>
                      <TableCell>
                        <Badge className={st!.className}>{st!.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={pl!.className}>{pl!.label}</Badge>
                      </TableCell>
                      <TableCell className="text-[#1E293B]">
                        <div className="flex items-center gap-1">
                          <GraduationCap className="h-3.5 w-3.5 text-[#94A3B8]" />
                          {uni.student_count}
                        </div>
                      </TableCell>
                      <TableCell className="text-[#1E293B]">
                        <div className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-[#94A3B8]" />
                          {uni.admin_count}
                        </div>
                      </TableCell>
                      <TableCell className="text-[#64748B] text-sm">
                        {uni.created_at ? new Date(uni.created_at).toLocaleDateString('zh-CN') : '-'}
                      </TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(uni)}
                            className="text-blue-600 hover:bg-blue-50 h-8 w-8 p-0"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {uni.status !== 'inactive' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeactivate(uni.id)}
                              className="text-red-500 hover:bg-red-50 h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* 分页 */}
          {pagination.total > pagination.pageSize && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-[#64748B]">
                第 {pagination.page} / {Math.ceil(pagination.total / pagination.pageSize)} 页
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline" size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchList(pagination.page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline" size="sm"
                  disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
                  onClick={() => fetchList(pagination.page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 创建/编辑弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#1E293B]">
              {editingId ? '编辑高校' : '创建高校'}
            </DialogTitle>
            <DialogDescription className="text-[#64748B]">
              {editingId ? '修改高校基本信息' : '填写信息创建新的高校账号'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-[#1E293B]">名称 <span className="text-red-500">*</span></label>
              <Input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="如：清华大学"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-[#1E293B]">域名 <span className="text-red-500">*</span></label>
              <Input
                value={form.domain}
                onChange={e => setForm({ ...form, domain: e.target.value })}
                placeholder="如：tsinghua.edu.cn"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-[#1E293B]">Logo URL</label>
              <Input
                value={form.logo_url}
                onChange={e => setForm({ ...form, logo_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-[#1E293B]">状态</label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">试用中</SelectItem>
                    <SelectItem value="active">运营中</SelectItem>
                    <SelectItem value="inactive">已停用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-[#1E293B]">套餐</label>
                <Select value={form.plan} onValueChange={v => setForm({ ...form, plan: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.name.trim() || !form.domain.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
