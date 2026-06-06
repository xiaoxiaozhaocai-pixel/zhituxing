'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import {
  Building2, ArrowLeft, Users, GraduationCap, Globe, Plus, Trash2, _Shield, Mail, Loader2, ExternalLink
} from 'lucide-react';

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

interface AdminItem {
  id: number;
  university_id: number;
  user_id: string;
  role: string;
  email: string;
  name: string;
  created_at: string;
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  active: { label: '运营中', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  inactive: { label: '已停用', className: 'bg-gray-50 text-gray-500 border-gray-200' },
  trial: { label: '试用中', className: 'bg-blue-50 text-blue-600 border-blue-200' },
};

const PLAN_MAP: Record<string, { label: string; className: string }> = {
  free: { label: 'Free', className: 'bg-gray-50 text-gray-600 border-gray-200' },
  starter: { label: 'Starter', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  pro: { label: 'Pro', className: 'bg-purple-50 text-purple-700 border-purple-200' },
};

const ROLE_MAP: Record<string, { label: string; className: string }> = {
  super_admin: { label: '超级管理员', className: 'bg-red-50 text-red-700 border-red-200' },
  admin: { label: '管理员', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  viewer: { label: '观察者', className: 'bg-gray-50 text-gray-600 border-gray-200' },
};

// ============ 主组件 ============
export default function UniversityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [university, setUniversity] = useState<University | null>(null);
  const [admins, setAdmins] = useState<AdminItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 添加管理员弹窗
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newAdminUserId, setNewAdminUserId] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('admin');
  const [adding, setAdding] = useState(false);

  // 加载高校信息
  const fetchUniversity = useCallback(async () => {
    try {
      const res = await fetch(`/admin/api/universities?pageSize=100`);
      const data = await res.json();
      if (data.code === 200) {
        const found = data.data.list.find((u: University) => String(u.id) === id);
        setUniversity(found || null);
      }
    } catch (e) { console.error('fetchUniversity error', e); }
  }, [id]);

  // 加载管理员列表
  const fetchAdmins = useCallback(async () => {
    try {
      const res = await fetch(`/admin/api/universities/${id}/admins`);
      const data = await res.json();
      if (data.code === 200) {
        setAdmins(data.data);
      }
    } catch (e) { console.error('fetchAdmins error', e); }
  }, [id]);

  useEffect(() => {
    Promise.all([fetchUniversity(), fetchAdmins()]).finally(() => setLoading(false));
  }, [fetchUniversity, fetchAdmins]);

  // 添加管理员
  const handleAddAdmin = async () => {
    if (!newAdminUserId.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`/admin/api/universities/${id}/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: newAdminUserId.trim(), role: newAdminRole }),
      });
      const data = await res.json();
      if (data.code === 200) {
        setAddDialogOpen(false);
        setNewAdminUserId('');
        setNewAdminRole('admin');
        fetchAdmins();
        fetchUniversity();
      } else {
        alert(data.message || '添加失败');
      }
    } catch (e) { console.error('addAdmin error', e); }
    setAdding(false);
  };

  // 移除管理员
  const handleRemoveAdmin = async (adminId: number) => {
    if (!confirm('确定移除该管理员？')) return;
    try {
      const res = await fetch(`/admin/api/universities/${id}/admins?adminId=${adminId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.code === 200) {
        fetchAdmins();
        fetchUniversity();
      } else {
        alert(data.message || '操作失败');
      }
    } catch (e) { console.error('removeAdmin error', e); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!university) {
    return (
      <div className="text-center py-20">
        <Building2 className="h-12 w-12 text-[#94A3B8] mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-[#1E293B] mb-2">高校不存在</h2>
        <p className="text-[#64748B] mb-4">可能已被删除或不存在</p>
        <Button onClick={() => router.push('/admin/universities')} variant="outline">
          返回列表
        </Button>
      </div>
    );
  }

  const st = STATUS_MAP[university.status] || STATUS_MAP.inactive;
  const pl = PLAN_MAP[university.plan] || PLAN_MAP.free;

  return (
    <div className="space-y-6">
      {/* 返回按钮 */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.push('/admin/universities')}
          className="text-[#64748B] hover:text-[#1E293B] -ml-3"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />返回列表
        </Button>
      </div>

      {/* 基本信息卡片 */}
      <Card className="bg-white border-[#E2E8F0] shadow-sm">
        <CardHeader>
          <CardTitle className="text-[#1E293B] text-base flex items-center gap-3">
            {university.logo_url ? (
              <Image src={university.logo_url} alt={`${university.name}校徽`} width={40} height={40} className="rounded-lg object-cover" unoptimized />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
            )}
            <div>
              <div>{university.name}</div>
              <div className="text-sm font-normal text-[#64748B] flex items-center gap-1 mt-0.5">
                <Globe className="h-3 w-3" />{university.domain}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <InfoItem
              label="状态"
              value={<Badge className={st!.className}>{st!.label}</Badge>}
            />
            <InfoItem
              label="套餐"
              value={<Badge className={pl!.className}>{pl!.label}</Badge>}
            />
            <InfoItem
              label="学生数"
              value={
                <span className="flex items-center gap-1.5 text-[#1E293B] font-medium">
                  <GraduationCap className="h-4 w-4 text-[#94A3B8]" />
                  {university.student_count}
                </span>
              }
            />
            <InfoItem
              label="管理员数"
              value={
                <span className="flex items-center gap-1.5 text-[#1E293B] font-medium">
                  <Users className="h-4 w-4 text-[#94A3B8]" />
                  {university.admin_count}
                </span>
              }
            />
            <InfoItem
              label="创建时间"
              value={university.created_at ? new Date(university.created_at).toLocaleDateString('zh-CN') : '-'}
            />
            <InfoItem label="ID" value={<span className="font-mono text-[#64748B]">{university.id}</span>} />
          </div>
        </CardContent>
      </Card>

      {/* 管理员列表 */}
      <Card className="bg-white border-[#E2E8F0] shadow-sm">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[#1E293B] text-base">
              管理员列表
              <span className="text-[#64748B] text-sm font-normal ml-2">
                共 {admins.length} 人
              </span>
            </CardTitle>
            <Button onClick={() => setAddDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white" size="sm">
              <Plus className="h-4 w-4 mr-1" />添加管理员
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[#64748B]">用户ID</TableHead>
                  <TableHead className="text-[#64748B]">姓名</TableHead>
                  <TableHead className="text-[#64748B]">邮箱</TableHead>
                  <TableHead className="text-[#64748B]">角色</TableHead>
                  <TableHead className="text-[#64748B]">添加时间</TableHead>
                  <TableHead className="text-[#64748B] text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-[#64748B] py-8">
                      暂无管理员
                    </TableCell>
                  </TableRow>
                ) : admins.map(admin => {
                  const rl = ROLE_MAP[admin.role] || ROLE_MAP.viewer;
                  return (
                    <TableRow key={admin.id} className="hover:bg-blue-50/50">
                      <TableCell className="text-[#1E293B] font-mono text-sm">{admin.user_id}</TableCell>
                      <TableCell className="text-[#1E293B]">{admin.name || '-'}</TableCell>
                      <TableCell className="text-[#64748B]">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {admin.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={rl!.className}>{rl!.label}</Badge>
                      </TableCell>
                      <TableCell className="text-[#64748B] text-sm">
                        {admin.created_at ? new Date(admin.created_at).toLocaleDateString('zh-CN') : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAdmin(admin.id)}
                          className="text-red-500 hover:bg-red-50 h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 添加管理员弹窗 */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#1E293B]">添加管理员</DialogTitle>
            <DialogDescription className="text-[#64748B]">
              输入用户的系统ID，为其分配{university.name}的管理权限
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-[#1E293B]">用户ID <span className="text-red-500">*</span></label>
              <Input
                value={newAdminUserId}
                onChange={e => setNewAdminUserId(e.target.value)}
                placeholder="输入用户的 UUID"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-[#1E293B]">角色</label>
              <Select value={newAdminRole} onValueChange={setNewAdminRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">超级管理员</SelectItem>
                  <SelectItem value="admin">管理员</SelectItem>
                  <SelectItem value="viewer">观察者</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>取消</Button>
            <Button
              onClick={handleAddAdmin}
              disabled={adding || !newAdminUserId.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {adding ? '添加中...' : '确认添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 子组件：信息项
function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-[#64748B] mb-1">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
