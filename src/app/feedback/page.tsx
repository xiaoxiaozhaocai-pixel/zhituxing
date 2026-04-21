'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MessageSquare, Send, Loader2, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface Feedback {
  id: string;
  type: string;
  title: string;
  content: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
}

const feedbackTypes = [
  { value: 'bug', label: '功能问题' },
  { value: 'feature', label: '功能建议' },
  { value: 'content', label: '内容纠错' },
  { value: 'other', label: '其他问题' }
];

const statusLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: '待处理', color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-4 h-4" /> },
  processing: { label: '处理中', color: 'bg-blue-100 text-blue-700', icon: <Loader2 className="w-4 h-4 animate-spin" /> },
  resolved: { label: '已解决', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-4 h-4" /> },
  closed: { label: '已关闭', color: 'bg-gray-100 text-gray-700', icon: <AlertCircle className="w-4 h-4" /> }
};

export default function FeedbackPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'submit' | 'list'>('submit');
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 表单状态
  const [formData, setFormData] = useState({
    type: 'bug',
    title: '',
    content: '',
    contact: ''
  });

  useEffect(() => {
    if (isAuthenticated) {
      fetchFeedbacks();
    }
  }, [isAuthenticated]);

  const fetchFeedbacks = async () => {
    try {
      const res = await fetch('/api/feedback', {
        headers: { 'x-user-id': user!.id }
      });
      const data = await res.json();
      if (data.success) {
        setFeedbacks(data.data);
      }
    } catch (error) {
      console.error('获取反馈列表失败:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      alert('请填写标题和内容');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user!.id
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (data.success) {
        alert('反馈已提交成功');
        setFormData({ type: 'bug', title: '', content: '', contact: '' });
        setActiveTab('list');
        fetchFeedbacks();
      } else {
        alert(data.error || '提交失败');
      }
    } catch (error) {
      console.error('提交反馈失败:', error);
      alert('提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (time: string) => {
    return new Date(time).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 mb-4">请先登录提交反馈</p>
          <a
            href="/auth"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            登录
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">意见反馈</h1>

        {/* Tab 切换 */}
        <div className="flex space-x-4 mb-6 border-b">
          <button
            onClick={() => setActiveTab('submit')}
            className={`pb-3 px-2 font-medium transition-colors ${
              activeTab === 'submit'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            提交反馈
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`pb-3 px-2 font-medium transition-colors ${
              activeTab === 'list'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            我的反馈 ({feedbacks.length})
          </button>
        </div>

        {/* 提交表单 */}
        {activeTab === 'submit' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 反馈类型 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  反馈类型
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {feedbackTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: type.value })}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        formData.type === type.value
                          ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                          : 'bg-gray-50 text-gray-600 border-2 border-transparent hover:bg-gray-100'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 标题 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  问题标题 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="请简要描述您的问题"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  maxLength={100}
                />
                <p className="mt-1 text-sm text-gray-400 text-right">
                  {formData.title.length}/100
                </p>
              </div>

              {/* 内容 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  详细描述 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="请详细描述您遇到的问题或建议..."
                  rows={6}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                  maxLength={2000}
                />
                <p className="mt-1 text-sm text-gray-400 text-right">
                  {formData.content.length}/2000
                </p>
              </div>

              {/* 联系方式 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  联系方式（选填）
                </label>
                <input
                  type="text"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  placeholder="手机号或邮箱，方便我们联系您"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              {/* 提交按钮 */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    提交中...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    提交反馈
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* 反馈列表 */}
        {activeTab === 'list' && (
          <div className="space-y-4">
            {feedbacks.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">暂无反馈记录</p>
                <button
                  onClick={() => setActiveTab('submit')}
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  提交反馈
                </button>
              </div>
            ) : (
              feedbacks.map((feedback) => (
                <div key={feedback.id} className="bg-white rounded-xl shadow-sm p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                          {feedbackTypes.find(t => t.value === feedback.type)?.label}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded-full flex items-center gap-1 ${statusLabels[feedback.status]?.color}`}>
                          {statusLabels[feedback.status]?.icon}
                          {statusLabels[feedback.status]?.label}
                        </span>
                      </div>
                      <h3 className="font-medium text-gray-900">{feedback.title}</h3>
                    </div>
                    <span className="text-sm text-gray-400 whitespace-nowrap">
                      {formatTime(feedback.created_at)}
                    </span>
                  </div>

                  <p className="text-gray-600 text-sm mb-3">{feedback.content}</p>

                  {feedback.admin_reply && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
                      <p className="text-sm font-medium text-green-800 mb-1">官方回复</p>
                      <p className="text-sm text-green-700">{feedback.admin_reply}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
