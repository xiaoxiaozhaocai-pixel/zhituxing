'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import FileImportModule from '@/components/admin/FileImportModule';
import { FileText,
  Megaphone,
  HelpCircle,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Pin,
  Eye,
  EyeOff,
  X } from 'lucide-react';

type ContentType = 'article' | 'announcement' | 'faq';

interface ContentItem {
  id: string;
  title: string;
  content: string;
  category: string | null;
  is_published: boolean;
  is_pinned: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const typeConfig = {
  article: { label: '求职干货', icon: FileText, color: 'purple' },
  announcement: { label: '网站公告', icon: Megaphone, color: 'blue' },
  faq: { label: '常见问题', icon: HelpCircle, color: 'orange' }
};

export default function ContentPage() {
  const { admin } = useAdminAuth();
  
  const [activeType, setActiveType] = useState<ContentType>('article');
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  const [modal, setModal] = useState<{ show: boolean; mode: 'create' | 'edit'; data?: ContentItem }>({
    show: false,
    mode: 'create'
  });
  const [form, setForm] = useState({ title: '', content: '', category: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: string; title: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType, page]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/admin/api/content?type=${activeType}&page=${page}&pageSize=20`);
      const data = await response.json();
      
      if (data.code === 200) {
        setItems(data.data.list);
        setTotal(data.data.pagination.total);
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = modal.mode === 'create' ? '/admin/api/content' : '/admin/api/content';
      const method = modal.mode === 'create' ? 'POST' : 'PUT';
      
      const body: Record<string, unknown> = {
        type: activeType,
        title: form.title,
        content: form.content,
        category: form.category,
        isPublished: true,
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
        setForm({ title: '', content: '', category: '' });
        fetchData();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    
    try {
      const response = await fetch(`/admin/api/content?type=${activeType}&id=${deleteConfirm.id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setDeleteConfirm(null);
        fetchData();
      }
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const handleTogglePublish = async (item: ContentItem) => {
    try {
      await fetch('/admin/api/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeType,
          id: item.id,
          title: item.title,
          content: item.content,
          category: item.category,
          isPublished: !item.is_published,
          adminId: admin?.id,
          adminUsername: admin?.username
        })
      });
      fetchData();
    } catch (error) {
      console.error('更新失败:', error);
    }
  };

  const openEdit = (item: ContentItem) => {
    setForm({
      title: item.title,
      content: item.content,
      category: item.category || ''
    });
    setModal({ show: true, mode: 'edit', data: item });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">内容管理</h1>

      {/* 类型切换 */}
      <div className="flex gap-2">
        {(Object.keys(typeConfig) as ContentType[]).map(type => {
          const config = typeConfig[type];
          const Icon = config.icon;
          return (
            <Button
              key={type}
              variant={activeType === type ? 'default' : 'outline'}
              onClick={() => { setActiveType(type); setPage(1); }}
              className={activeType === type ? `bg-${config.color}-600 hover:bg-${config.color}-700` : ''}
            >
              <Icon className="w-4 h-4 mr-2" />
              {config.label}
            </Button>
          );
        })}
      </div>

      {/* 操作栏 */}
      <div className="flex justify-between items-center">
        <span className="text-gray-500">共 {total} 条</span>
        <Button onClick={() => { setForm({ title: '', content: '', category: '' }); setModal({ show: true, mode: 'create' }); }}>
          <Plus className="w-4 h-4 mr-2" />
          新增{typeConfig[activeType].label}
        </Button>
      </div>

      {/* 列表 */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">标题</th>
                  {activeType !== 'announcement' && (
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">分类</th>
                  )}
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">状态</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">更新时间</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-600" />
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  items.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {item.is_pinned && <Pin className="w-4 h-4 text-purple-600" />}
                          <span className="font-medium">{item.title}</span>
                        </div>
                      </td>
                      {activeType !== 'announcement' && (
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {item.category || '-'}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <Badge className={item.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                          {item.is_published ? '已发布' : '草稿'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(item.updated_at).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleTogglePublish(item)}>
                            {item.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-red-600 hover:text-red-700"
                            onClick={() => setDeleteConfirm({ show: true, id: item.id, title: item.title })}
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
        </CardContent>
      </Card>

      {/* 创建/编辑弹窗 */}
      {modal.show && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  {modal.mode === 'create' ? '新增' : '编辑'}{typeConfig[activeType].label}
                </h2>
                <button onClick={() => setModal({ show: false, mode: 'create' })}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">标题</label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="请输入标题"
                  />
                </div>
                
                {activeType !== 'announcement' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">分类</label>
                    <Input
                      value={form.category}
                      onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                      placeholder="请输入分类"
                    />
                  </div>
                )}

                {/* 文件导入模块 */}
                {activeType !== 'announcement' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">导入内容（可选）</label>
                    <FileImportModule
                      onContentExtracted={(content) => setForm(prev => ({ ...prev, content }))}
                      existingContent={form.content}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">内容</label>
                  <textarea
                    value={form.content}
                    onChange={(e) => setForm(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="请输入内容"
                    rows={10}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setModal({ show: false, mode: 'create' })}>
                    取消
                  </Button>
                  <Button onClick={handleSave} disabled={saving || !form.title}>
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
              <p className="text-gray-600 mb-2">确定要删除这篇「{deleteConfirm.title}」吗？</p>
              <p className="text-red-500 text-sm">此操作不可撤销</p>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                  取消
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  确认删除
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
