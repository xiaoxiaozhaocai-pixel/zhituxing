'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, ArrowLeft, Plus, Edit, Trash2, Eye, Search, CheckCircle } from 'lucide-react';

interface Referral {
  id: string;
  company: string;
  position: string;
  salary: string;
  location: string;
  requirements: string[];
  description: string;
  benefits: string[];
  views: number;
  applications: number;
  isActive: boolean;
  deadline: string;
  createdAt: string;
}

export default function AdminReferralsPage() {
  const { user, isAuthenticated } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingReferral, setEditingReferral] = useState<Partial<Referral>>({});

  useEffect(() => {
    fetchReferrals();
  }, []);

  const fetchReferrals = async () => {
    try {
      const res = await fetch('/api/referrals?limit=100');
      const data = await res.json();
      if (data.success) {
        setReferrals(data.data.referrals.map((r: Referral) => ({
          ...r,
          isActive: true
        })));
      }
    } catch (error) {
      console.error('获取内推失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条内推吗？')) return;
    
    try {
      const res = await fetch(`/api/referrals/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setReferrals(referrals.filter(r => r.id !== id));
      }
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const handleToggleActive = async (id: string) => {
    setReferrals(referrals.map(r => 
      r.id === id ? { ...r, isActive: !r.isActive } : r
    ));
  };

  const filteredReferrals = referrals.filter(r => 
    r.position.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    r.company.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p>请先登录</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">内推管理</h1>
          </div>
          <Button className="bg-[#165DFF]" onClick={() => {
            setEditingReferral({});
            setShowEditDialog(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            添加内推
          </Button>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="搜索公司或职位..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Referrals List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredReferrals.map((referral) => (
                  <div key={referral.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{referral.position}</h3>
                          <Badge className={referral.isActive ? 'bg-green-500' : 'bg-gray-400'}>
                            {referral.isActive ? '进行中' : '已结束'}
                          </Badge>
                        </div>
                        <p className="text-gray-600 mb-2">{referral.company} · {referral.location}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="text-orange-600 font-medium">{referral.salary}</span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            {referral.views} 阅读
                          </span>
                          <span>{referral.applications} 申请</span>
                          <span>截止: {new Date(referral.deadline).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleToggleActive(referral.id)}
                        >
                          {referral.isActive ? '关闭' : '开启'}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => {
                            setEditingReferral(referral);
                            setShowEditDialog(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(referral.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {filteredReferrals.length === 0 && !loading && (
          <div className="text-center py-16 text-gray-500">
            暂无内推信息
          </div>
        )}
      </div>

      {/* Edit Dialog - 简化版 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingReferral.id ? '编辑内推' : '添加内推'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">公司名称</label>
                <Input placeholder="请输入公司名称" defaultValue={editingReferral.company} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">职位名称</label>
                <Input placeholder="请输入职位名称" defaultValue={editingReferral.position} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">薪资范围</label>
                <Input placeholder="如：25-40K·14薪" defaultValue={editingReferral.salary} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">工作地点</label>
                <Input placeholder="如：北京" defaultValue={editingReferral.location} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">截止日期</label>
                <Input type="date" defaultValue={editingReferral.deadline?.split('T')[0]} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">职位描述</label>
              <textarea className="w-full px-3 py-2 border rounded-lg h-24" placeholder="请输入职位描述" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">岗位要求（每行一条）</label>
              <textarea className="w-full px-3 py-2 border rounded-lg h-20" placeholder="本科及以上学历&#10;3年以上工作经验&#10;熟练掌握React" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">福利待遇（每行一条）</label>
              <textarea className="w-full px-3 py-2 border rounded-lg h-20" placeholder="六险一金&#10;年度旅游&#10;弹性工作" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>取消</Button>
            <Button className="bg-[#165DFF]">保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
