'use client';

import { useState, useEffect, useCallback } from 'react';
import { Fingerprint, Shield, Clock, X, AlertTriangle } from 'lucide-react';

interface BiometricConsentModalProps {
  /** 是否强制模式（首次使用面试功能时） */
  required?: boolean;
  /** 同意后回调 */
  onConsent?: () => void;
  /** 拒绝后回调（仅在非强制模式下生效） */
  onDecline?: () => void;
  /** 外部控制显示/隐藏 */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const CONSENT_DISCLOSURE = {
  purpose: 'AI模拟面试生物特征识别',
  scope: '面试过程中的语音特征、面部表情特征、回答内容的行为特征分析，用于评估面试表现和提供改进建议',
  retention: '面试会话结束后立即删除，不保留原始生物特征数据',
};

const BiometricConsentModal = ({
  required = true,
  onConsent,
  onDecline,
  open: externalOpen,
  onOpenChange,
}: BiometricConsentModalProps) => {
  const [mounted, setMounted] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 使用外部或内部状态控制
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (onOpenChange) onOpenChange(v);
    setInternalOpen(v);
  };

  // 检查是否已有同意记录
  const checkConsent = useCallback(async () => {
    try {
      const resp = await fetch('/api/user/biometric-consent');
      if (resp.ok) {
        const data = await resp.json();
        if (data.consented) {
          return true; // 已同意，跳过弹窗
        }
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    if (externalOpen === undefined) {
      // 内部控制：自动检查是否需要弹窗
      checkConsent().then((alreadyConsented) => {
        if (!alreadyConsented) {
          setInternalOpen(true);
        }
      });
    }
  }, [externalOpen, checkConsent]);

  const handleAgree = async () => {
    if (!checked) return;
    setLoading(true);
    setError('');

    try {
      const resp = await fetch('/api/user/biometric-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(CONSENT_DISCLOSURE),
      });

      if (resp.ok) {
        setOpen(false);
        onConsent?.();
      } else {
        setError('授权失败，请稍后重试');
      }
    } catch {
      setError('网络错误，请检查连接');
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = () => {
    setOpen(false);
    onDecline?.();
  };

  if (!mounted) return null;
  if (!isOpen) return null;

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 bg-black/60 z-[100]"
        onClick={required ? undefined : handleDecline}
      />

      {/* 弹窗主体 */}
      <div
        className="fixed inset-0 z-[101] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label="生物识别信息单独同意"
      >
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
          {/* 头部 */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Fingerprint className="w-7 h-7" />
                <h2 className="text-xl font-bold">生物识别信息授权</h2>
              </div>
              {!required && (
                <button
                  onClick={handleDecline}
                  className="text-white/80 hover:text-white transition-colors"
                  aria-label="关闭"
                  type="button"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            <p className="mt-2 text-blue-100 text-sm">
              依据《个人信息保护法》第29条，处理生物识别信息需取得您的单独同意
            </p>
          </div>

          {/* 内容 */}
          <div className="p-6 space-y-5">
            {/* 法律提示 */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">敏感个人信息提示</p>
                <p className="mt-1">
                  您在AI模拟面试中产生的语音、面部表情等属于
                  <strong>生物识别信息</strong>
                  ，是受法律特殊保护的敏感个人信息。我们仅在您明确授权后处理。
                </p>
              </div>
            </div>

            {/* 告知事项 */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Fingerprint className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">处理目的</h4>
                  <p className="text-sm text-gray-600 mt-1">{CONSENT_DISCLOSURE.purpose}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Shield className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">处理范围</h4>
                  <p className="text-sm text-gray-600 mt-1">{CONSENT_DISCLOSURE.scope}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">保存期限</h4>
                  <p className="text-sm text-gray-600 mt-1">{CONSENT_DISCLOSURE.retention}</p>
                </div>
              </div>
            </div>

            {/* 用户权利说明 */}
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
              <p>
                <strong>您的权利：</strong>
                您可以随时在
                <a href="/privacy" className="text-blue-600 underline mx-1">隐私设置</a>
                中撤回本授权。撤回后，我们不会在后续面试中处理您的生物识别信息。
                撤回不影响撤回前已完成的处理。
              </p>
            </div>

            {/* 勾选框 */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative flex-shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-5 h-5 rounded border-2 border-gray-300 peer-checked:border-blue-600 peer-checked:bg-blue-600 transition-colors flex items-center justify-center">
                  {checked && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                我已阅读并理解上述告知内容，同意职途星按照上述目的、范围和期限处理我的生物识别信息。
                我知晓可以随时在隐私设置中撤回此授权。
              </span>
            </label>

            {/* 错误提示 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* 底部按钮 */}
          <div className="border-t border-gray-100 p-4 flex flex-col sm:flex-row gap-3">
            {!required && (
              <button
                onClick={handleDecline}
                type="button"
                className="flex-1 px-6 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                暂不使用
              </button>
            )}
            <button
              onClick={handleAgree}
              disabled={!checked || loading}
              type="button"
              className={`flex-1 px-6 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                checked && !loading
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {loading ? '提交中...' : '同意并继续'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default BiometricConsentModal;
