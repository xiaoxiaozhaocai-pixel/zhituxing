'use client';

import { useState, useEffect, useCallback } from 'react';
import { Database, Shield, CheckCircle, XCircle, RefreshCw, Info } from 'lucide-react';

interface ContributionStatus {
  enabled: boolean;
  exists: boolean;
  withdrawn: boolean;
  consented_at?: string;
  withdrawn_at?: string;
}

const DataContributionToggle = () => {
  const [status, setStatus] = useState<ContributionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/user/data-contribution');
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

  const toggleContribution = async (enable: boolean) => {
    if (enable) {
      // 开启前明确告知
      const confirmed = confirm(
        '开启后，您的脱敏聚合数据将用于训练和优化小职的AI模型，提升回答质量和匹配精准度。\n\n' +
        '数据经脱敏处理，不包含个人身份信息、对话原文或简历内容。\n您可随时关闭此功能，不影响个性化推荐服务。\n\n确认开启？'
      );
      if (!confirmed) return;
    }

    setActionLoading(true);
    setMessage('');
    try {
      const resp = await fetch('/api/user/data-contribution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: enable }),
      });
      if (resp.ok) {
        setMessage(enable ? '已开启数据贡献' : '已关闭数据贡献');
        await fetchStatus();
      } else {
        setMessage('操作失败，请稍后重试');
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
        <Database className="w-6 h-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">数据贡献设置</h3>
      </div>

      <div className="flex items-center gap-2 mb-3">
        {status?.enabled ? (
          <>
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-green-700 font-medium">数据贡献已开启</span>
            {status.consented_at && (
              <span className="text-xs text-gray-400">
                开启时间：{new Date(status.consented_at).toLocaleString('zh-CN')}
              </span>
            )}
          </>
        ) : (
          <>
            <XCircle className="w-5 h-5 text-gray-400" />
            <span className="text-gray-600">数据贡献已关闭</span>
          </>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">开启后我们将如何使用您的数据：</p>
            <ul className="list-disc pl-4 space-y-1 text-blue-700">
              <li>仅收集脱敏后的聚合统计特征（如岗位偏好、匹配反馈、能力评估分数等）</li>
              <li>不收集个人身份信息、对话原文或原始简历内容</li>
              <li>训练后仅保留统计特征，不保留个人原始数据</li>
              <li>此功能与个性化推荐独立，关闭不影响您的基础服务体验</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {status?.enabled ? (
          <button
            onClick={() => toggleContribution(false)}
            disabled={actionLoading}
            type="button"
            className="px-4 py-2 text-sm font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors disabled:opacity-50"
          >
            {actionLoading ? '处理中...' : '关闭数据贡献'}
          </button>
        ) : (
          <button
            onClick={() => toggleContribution(true)}
            disabled={actionLoading}
            type="button"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {actionLoading ? '处理中...' : '开启数据贡献'}
          </button>
        )}
        <button
          onClick={fetchStatus}
          type="button"
          className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
          title="刷新状态"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* 状态消息 */}
      {message && (
        <div className={`mt-3 p-3 rounded-lg text-sm ${
          message.includes('开启') ? 'bg-green-50 text-green-700' :
          message.includes('关闭') ? 'bg-gray-50 text-gray-700' :
          'bg-red-50 text-red-700'
        }`}>
          {message}
        </div>
      )}

      {/* 法律依据 */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Shield className="w-3 h-3" />
          <span>您在《个人信息保护法》下的权利：数据贡献为单独授权，与基础服务相互独立，可随时撤回</span>
        </div>
      </div>
    </div>
  );
};

export default DataContributionToggle;
