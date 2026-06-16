'use client';

import { useState, useEffect, useCallback } from 'react';

interface BiometricConsentState {
  consented: boolean;
  exists: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * 生物识别同意状态 Hook
 * 
 * 使用方式：
 * const { consented, loading, grant } = useBiometricConsent();
 * if (loading) return <Loading />;
 * if (!consented) return <BiometricConsentModal onConsent={grant} />;
 * // 正常进入面试
 */
export function useBiometricConsent() {
  const [state, setState] = useState<BiometricConsentState>({
    consented: false,
    exists: false,
    loading: true,
    error: null,
  });

  const checkConsent = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const resp = await fetch('/api/user/biometric-consent');
      if (!resp.ok) {
        setState({ consented: false, exists: false, loading: false, error: '查询失败' });
        return;
      }
      const data = await resp.json();
      setState({
        consented: data.consented === true,
        exists: data.exists === true,
        loading: false,
        error: null,
      });
    } catch {
      setState({ consented: false, exists: false, loading: false, error: '网络错误' });
    }
  }, []);

  const grant = useCallback(async (): Promise<boolean> => {
    try {
      const resp = await fetch('/api/user/biometric-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (resp.ok) {
        setState(prev => ({ ...prev, consented: true, exists: true, error: null }));
        return true;
      }
      return false;
    } catch {
      setState(prev => ({ ...prev, error: '授权失败' }));
      return false;
    }
  }, []);

  useEffect(() => {
    checkConsent();
  }, [checkConsent]);

  return {
    ...state,
    checkConsent,
    grant,
  };
}
