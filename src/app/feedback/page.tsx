'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const PAGE_OPTIONS = [
  { value: '首页', label: '首页' },
  { value: '匹配', label: '岗位匹配' },
  { value: '测评', label: '能力测评' },
  { value: '面试', label: '模拟面试' },
  { value: '职业规划', label: '职业规划' },
  { value: '学习路径', label: '学习路径' },
  { value: '技能图谱', label: '技能图谱' },
  { value: '个人中心', label: '个人中心' },
  { value: '其他', label: '其他页面' }
];

const TYPE_OPTIONS = [
  { value: 'bug', label: 'Bug反馈' },
  { value: 'slow', label: '页面卡顿' },
  { value: 'ux', label: '体验问题' },
  { value: 'suggest', label: '功能建议' },
  { value: 'praise', label: '表扬鼓励' }
];

const SEVERITY_OPTIONS = [
  { value: 'P0', label: 'P0 - 紧急（系统崩溃）' },
  { value: 'P1', label: 'P1 - 严重（核心功能不可用）' },
  { value: 'P2', label: 'P2 - 一般（功能可用但有问题）' },
  { value: 'P3', label: 'P3 - 轻微（UI显示等小问题）' }
];

export default function FeedbackPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    page: '',
    type: '',
    severity: '',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.page || !formData.type || !formData.description) {
      setError('请填写必填字段');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          page: formData.page,
          type: formData.type,
          severity: formData.severity,
          description: formData.description
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/');
        }, 5000);
      } else {
        setError(data.error || '提交失败，请稍后重试');
      }
    } catch (err) {
      setError('网络异常，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">感谢反馈！</h2>
          <p className="text-gray-600 mb-6">
            您的反馈已提交，我们会尽快处理。<br />
            页面将在 <span className="text-blue-600 font-semibold">5秒</span> 后自动返回首页...
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            立即返回
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8">
            <h1 className="text-2xl font-bold text-white mb-2">提交反馈</h1>
            <p className="text-blue-100">帮助我们改进产品，让职途星更好用</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                在哪个页面 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.page}
                onChange={(e) => setFormData({ ...formData, page: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
              >
                <option value="">请选择页面</option>
                {PAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                反馈类型 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
              >
                <option value="">请选择类型</option>
                {TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                严重程度
              </label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
              >
                <option value="">请选择（可选）</option>
                {SEVERITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                问题描述 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={5}
                maxLength={2000}
                placeholder="请详细描述您遇到的问题或建议..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none bg-white"
              />
              <p className="mt-1 text-sm text-gray-400 text-right">
                {formData.description.length}/2000
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  提交中...
                </span>
              ) : (
                '提交反馈'
              )}
            </button>
          </form>

          <div className="bg-gray-50 px-6 py-4 border-t">
            <p className="text-sm text-gray-500 text-center">
              您的反馈对我们非常重要，感谢您的支持！
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}