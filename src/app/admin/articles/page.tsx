'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, ArrowLeft, Plus, Edit, Trash2, Eye, Star, Search } from 'lucide-react';

interface Article {
  id: string;
  title: string;
  summary: string | null;
  category: string;
  tags: string[];
  views: number;
  isFeatured: boolean;
  isPublished: boolean;
  createdAt: string;
}

const categories = [
  { value: 'resume', label: '简历指南' },
  { value: 'interview', label: '面试技巧' },
  { value: 'career', label: '职业规划' },
  { value: 'industry', label: '行业洞察' },
  { value: 'tips', label: '求职干货' }
];

const categoryColors: Record<string, string> = {
  resume: 'bg-blue-100 text-blue-700',
  interview: 'bg-green-100 text-green-700',
  career: 'bg-purple-100 text-purple-700',
  industry: 'bg-orange-100 text-orange-700',
  tips: 'bg-gray-100 text-gray-700'
};

export default function AdminArticlesPage() {
  const { user, isAuthenticated } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Partial<Article>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const res = await fetch('/api/articles?limit=100');
      const data = await res.json();
      if (data.success) {
        setArticles(data.data.articles.map((a: Article) => ({
          ...a,
          isPublished: true // 假设API返回的都是已发布的
        })));
      }
    } catch (error) {
      console.error('获取文章失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这篇文章吗？')) return;
    
    try {
      const res = await fetch(`/api/articles/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setArticles(articles.filter(a => a.id !== id));
      }
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const handlePublish = async (id: string, isFeatured: boolean) => {
    try {
      // 实际应该调用API更新
      setArticles(articles.map(a => 
        a.id === id ? { ...a, isFeatured: !isFeatured } : a
      ));
    } catch (error) {
      console.error('更新失败:', error);
    }
  };

  const filteredArticles = articles.filter(a => 
    a.title.toLowerCase().includes(searchKeyword.toLowerCase())
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
            <h1 className="text-2xl font-bold text-gray-900">文章管理</h1>
          </div>
          <Button className="bg-[#165DFF]" onClick={() => {
            setEditingArticle({});
            setShowEditDialog(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            添加文章
          </Button>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="搜索文章标题..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Articles List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredArticles.map((article) => (
                  <div key={article.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-medium text-gray-900">{article.title}</h3>
                        <Badge className={categoryColors[article.category] || 'bg-gray-100'}>
                          {categories.find(c => c.value === article.category)?.label || article.category}
                        </Badge>
                        {article.isFeatured && (
                          <Badge className="bg-orange-500 text-white">
                            <Star className="w-3 h-3 mr-1" />
                            精选
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {article.views} 阅读
                        </span>
                        <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handlePublish(article.id, article.isFeatured)}
                      >
                        {article.isFeatured ? '取消精选' : '设为精选'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => {
                          setEditingArticle(article);
                          setShowEditDialog(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(article.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {filteredArticles.length === 0 && !loading && (
          <div className="text-center py-16 text-gray-500">
            暂无文章
          </div>
        )}
      </div>

      {/* Edit Dialog - 简化版，实际应该是一个完整的表单 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingArticle.id ? '编辑文章' : '添加文章'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">文章标题</label>
              <Input placeholder="请输入文章标题" defaultValue={editingArticle.title} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
              <select className="w-full px-3 py-2 border rounded-lg">
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">摘要</label>
              <textarea className="w-full px-3 py-2 border rounded-lg h-20" placeholder="请输入文章摘要" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
              <textarea className="w-full px-3 py-2 border rounded-lg h-40" placeholder="请输入文章内容（支持Markdown）" />
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
