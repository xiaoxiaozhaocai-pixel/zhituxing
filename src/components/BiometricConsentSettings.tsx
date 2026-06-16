'use client';

import { useState, useEffect, useCallback } from 'react';
import { Fingerprint, Shield, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface ConsentStatus {
  consented: boolean;
  exists: boolean;
  withdrawn: boolean;
  consented_at?: string;
  withdrawn_at?: string;
}

const BiometricConsentSettings = () => {
  const [status, setStatus] = useState<ConsentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/user/biometric-consent');
      if (resp.ok) {
        const data = await resp.json();
        setStatus(data);
      }
    } catch {
      // 静默失败
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleWithdraw = async () => {
    if (!confirm('撤回后，AI模拟面试将不再处理您的生物识别信息。确认撤回？')) return;
    setActionLoading(true);
    setMessage('');
    try {
      const resp = await fetch('/api/user/biometric-consent', { method: 'DELETE' });
      if (resp.ok) {
        setMessage('已成功撤回授权');
        await fetchStatus();
      } else {
        setMessage('撤回失败，请稍后重试');
      }
    } catch {
      setMessage('网络错误');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReauthorize = async () => {
    setActionLoading(true);
    setMessage('');
    try {
      const resp = await fetch('/api/user/biometric-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (resp.ok) {
        setMessage('已重新授权');
        await fetchStatus();
      } else {
        setMessage('授权失败，请稍后重试');
      }
    } catch {
      setMessage('网络错误');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-1/3 mb-3" />
        <div className="h-4 bg-gray-100 rounded w-2/3" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <Fingerprint className="w-6 h-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">生物识别信息管理</h3>
      </div>

      {!status?.exists || !status?.consented ? (
        /* 未授权状态 */
        <div>
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="w-5 h-5 text-gray-400" />
            <span className="text-gray-600">您尚未授权AI模拟面试的生物识别信息处理</span>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            授权后，AI面试将分析您的语音、表情等特征以提供面试评估和改进建议。
            数据在面试结束后立即删除。
          </p>
          <button
            onClick={handleReauthorize}
            disabled={actionLoading}
            type="button"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {actionLoading ? '处理中...' : '前往授权'}
          </button>
        </div>
      ) : (
        /* 已授权状态 */
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-green-700 font-medium">已授权</span>
            {status.consented_at && (
              <span className="text-xs text-gray-400">
                授权时间：{new Date(status.consented_at).toLocaleString('zh-CN')}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-4">
            您已授权职途星在AI模拟面试中处理语音、表情等生物识别信息。
            您可以随时撤回此授权，撤回后不会影响其他功能。
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleWithdraw}
              disabled={actionLoading}
              type="button"
              className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              {actionLoading ? '处理中...' : '撤回授权'}
            </button>
            <button
              onClick={fetchStatus}
              type="button"
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              title="刷新状态"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 状态消息 */}
      {message && (
        <div className={`mt-3 p-3 rounded-lg text-sm ${
          message.includes('成功') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message}
        </div>
      )}

      {/* 法律依据 */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Shield className="w-3 h-3" />
          <span>依据《个人信息保护法》第29条，处理生物识别信息需取得您的单独同意</span>
        </div>
      </div>
    </div>
  );
};

export default BiometricConsentSettings;
