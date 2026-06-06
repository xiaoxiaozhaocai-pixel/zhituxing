'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import {Loader2, ArrowLeft, Search, RefreshCw, Send} from 'lucide-react';

interface Feedback {
  id: string;
  userId: string;
  userPhone: string;
  userName: string;
  content: string;
  type: string;
  status: 'pending' | 'processing' | 'resolved' | 'closed';
  contact: string | null;
  reply: string | null;
  createdAt: string;
  updatedAt: string;
}

const typeConfig: Record<string, { label: string; className: string }> = {
  bug: { label: '功能问题', className: 'bg-red-100 text-red-700' },
  suggestion: { label: '功能建议', className: 'bg-blue-100 text-blue-700' },
  correction: { label: '内容纠错', className: 'bg-orange-100 text-orange-700' },
  other: { label: '其他', className: 'bg-gray-100 text-gray-700' }
};

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: '待处理', className: 'bg-yellow-100 text-yellow-700' },
  processing: { label: '处理中', className: 'bg-blue-100 text-blue-700' },
  resolved: { label: '已解决', className: 'bg-green-100 text-green-700' },
  closed: { label: '已关闭', className: 'bg-gray-100 text-gray-700' }
};

export default function AdminFeedbackPage() {
  const { isAuthenticated } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFeedbacks();
    }
  }, [isAuthenticated, statusFilter, page]);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const res = await fetch(`/api/admin/feedback?${params}`);
      const data = await res.json();
      if (data.success) {
        setFeedbacks(data.data.feedbacks);
        setTotalPages(data.data.totalPages);
      }
    } catch (error) {
      console.error('获取工单失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!selectedFeedback || !replyContent.trim()) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/feedback/${selectedFeedback.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reply: replyContent,
          status: 'resolved'
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchFeedbacks();
        setShowDetailDialog(false);
        setReplyContent('');
      }
    } catch (error) {
      console.error('回复失败:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedFeedback) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/feedback/${selectedFeedback.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        fetchFeedbacks();
        setShowDetailDialog(false);
      }
    } catch (error) {
      console.error('更新状态失败:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredFeedbacks = feedbacks.filter(f =>
    f.content.includes(searchKeyword) ||
    f.userPhone.includes(searchKeyword) ||
    f.userName.includes(searchKeyword)
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
            <h1 className="text-2xl font-bold text-gray-900">工单管理</h1>
          </div>
          <Button variant="outline" onClick={fetchFeedbacks}>
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="text-center py-4">
              <p className="text-2xl font-bold text-yellow-600">
                {feedbacks.filter(f => f.status === 'pending').length}
              </p>
              <p className="text-sm text-yellow-600">待处理</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="text-center py-4">
              <p className="text-2xl font-bold text-blue-600">
                {feedbacks.filter(f => f.status === 'processing').length}
              </p>
              <p className="text-sm text-blue-600">处理中</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="text-center py-4">
              <p className="text-2xl font-bold text-green-600">
                {feedbacks.filter(f => f.status === 'resolved').length}
              </p>
              <p className="text-sm text-green-600">已解决</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="text-center py-4">
              <p className="text-2xl font-bold text-gray-600">{totalPages}</p>
              <p className="text-sm text-gray-600">总页数</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="搜索内容/手机号/用户名..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <select
                className="px-4 py-2 border rounded-lg"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">全部状态</option>
                <option value="pending">待处理</option>
                <option value="processing">处理中</option>
                <option value="resolved">已解决</option>
                <option value="closed">已关闭</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Feedback List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredFeedbacks.map((feedback) => (
                  <div
                    key={feedback.id}
                    className="p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setSelectedFeedback(feedback);
                      setShowDetailDialog(true);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className={typeConfig[feedback.type]?.className || 'bg-gray-100'}>
                            {typeConfig[feedback.type]?.label || feedback.type}
                          </Badge>
                          <Badge className={statusConfig[feedback.status]!.className}>
                            {statusConfig[feedback.status]!.label}
                          </Badge>
                        </div>
                        <p className="text-gray-900 mb-2 line-clamp-2">{feedback.content}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{feedback.userName || '游客'}</span>
                          <span>{feedback.userPhone}</span>
                          <span>{new Date(feedback.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {feedback.reply && (
                        <div className="ml-4 p-2 bg-green-50 rounded-lg max-w-[200px]">
                          <p className="text-xs text-green-600 mb-1">已回复</p>
                          <p className="text-sm text-gray-600 line-clamp-3">{feedback.reply}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {filteredFeedbacks.length === 0 && !loading && (
          <div className="text-center py-16 text-gray-500">
            暂无工单
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              上一页
            </Button>
            <span className="px-4 py-2 text-gray-600">
              第 {page} / {totalPages} 页
            </span>
            <Button
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              下一页
            </Button>
          </div>
        )}
      </div>

      {/* Feedback Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>工单详情</DialogTitle>
          </DialogHeader>
          {selectedFeedback && (
            <div className="space-y-4 py-4">
              {/* Info */}
              <div className="flex gap-4">
                <Badge className={typeConfig[selectedFeedback.type]?.className}>
                  {typeConfig[selectedFeedback.type]?.label}
                </Badge>
                <Badge className={statusConfig[selectedFeedback.status]!.className}>
                  {statusConfig[selectedFeedback.status]!.label}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">用户</p>
                  <p>{selectedFeedback.userName || '游客'}</p>
                </div>
                <div>
                  <p className="text-gray-500">手机号</p>
                  <p>{selectedFeedback.userPhone || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500">联系方式</p>
                  <p>{selectedFeedback.contact || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500">提交时间</p>
                  <p>{new Date(selectedFeedback.createdAt).toLocaleString()}</p>
                </div>
              </div>

              {/* Content */}
              <div>
                <p className="text-gray-500 text-sm mb-1">反馈内容</p>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="whitespace-pre-wrap">{selectedFeedback.content}</p>
                </div>
              </div>

              {/* Reply History */}
              {selectedFeedback.reply && (
                <div>
                  <p className="text-gray-500 text-sm mb-1">回复内容</p>
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="whitespace-pre-wrap">{selectedFeedback.reply}</p>
                  </div>
                </div>
              )}

              {/* Reply Input */}
              <div>
                <p className="text-gray-500 text-sm mb-1">回复内容</p>
                <Textarea
                  placeholder="请输入回复内容..."
                  rows={4}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  className="flex-1 bg-[#165DFF]"
                  onClick={handleReply}
                  disabled={actionLoading || !replyContent.trim()}
                >
                  <Send className="w-4 h-4 mr-2" />
                  发送回复
                </Button>
                {selectedFeedback.status === 'pending' && (
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateStatus('processing')}
                    disabled={actionLoading}
                  >
                    标记处理中
                  </Button>
                )}
                {selectedFeedback.status !== 'closed' && (
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateStatus('closed')}
                    disabled={actionLoading}
                  >
                    关闭
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
