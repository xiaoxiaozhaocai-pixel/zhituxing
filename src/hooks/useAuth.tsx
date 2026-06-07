'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export interface QuotaInfo {
  career_planning: { remaining: number; unlimited: boolean };
  interview: { remaining: number; unlimited: boolean; reset_time?: string };
  assessment: { remaining: number; unlimited: boolean; reset_time?: string };
  competency: { is_member_only: boolean; requires_report: boolean };
  decision: { remaining: number; unlimited: boolean };
  remaining: number;
  reset_time: string;
  is_member: boolean;
  is_lifetime_member?: boolean;
  member_type: string;
  member_expire_time: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  phone?: string;
  nickname: string;
  avatar_url?: string;
  created_at?: string;
  quota?: QuotaInfo;
  role?: string;
  is_vip?: boolean;
}

interface AuthResult { success: boolean; message: string; needsVerification?: boolean }

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  quota: QuotaInfo | null;
  refreshQuota: () => Promise<void>;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (email: string, password: string, nickname?: string) => Promise<AuthResult>;
  verifyOtp: (email: string, token: string) => Promise<AuthResult>;
  // 手机号登录/注册
  sendPhoneCode: (phone: string, type: 'login' | 'register') => Promise<AuthResult>;
  sendEmailCode: (email: string, type: 'login' | 'register') => Promise<AuthResult>;
  verifyPhoneCode: (phone: string, code: string, type: 'login' | 'register') => Promise<AuthResult>;
  verifyEmailCode: (email: string, code: string, type: 'login' | 'register') => Promise<AuthResult>;
  registerWithPhone: (phone: string, code: string, password: string, nickname?: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);

  useEffect(() => { checkAuth(); }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkAuth();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  function buildQuotaFromMembership(m: { isMember: boolean; type: string; expiresAt: string | null } | null | undefined): QuotaInfo {
    const isMember = m?.isMember ?? false;
    const isLifetime = m?.type === 'lifetime';
    return {
      career_planning: { remaining: isMember ? -1 : 3, unlimited: isMember },
      interview: { remaining: isMember ? -1 : 3, unlimited: isMember },
      assessment: { remaining: isMember ? -1 : 1, unlimited: isMember },
      competency: { is_member_only: true, requires_report: true },
      decision: { remaining: isMember ? -1 : 3, unlimited: isMember },
      remaining: isMember ? -1 : 3,
      reset_time: new Date(Date.now() + 86400000).toISOString(),
      is_member: isMember,
      is_lifetime_member: isLifetime,
      member_type: m?.type || 'free',
      member_expire_time: m?.expiresAt ?? null,
    };
  }

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'include' });
      const data = await response.json();
      if (data.ok && data.data?.user) {
        setUser(data.data.user);
        setQuota(buildQuotaFromMembership(data.data.user.membership));
      } else {
        setUser(null);
        setQuota(null);
      }
    } catch {
      setUser(null);
      setQuota(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshQuota = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'include' });
      const data = await response.json();
      if (data.ok && data.data?.user) {
        setUser(data.data.user);
        setQuota(buildQuotaFromMembership(data.data.user.membership));
      }
    } catch { /* ignore */ }
  }, []);

  // ========== 邮箱登录（保留兼容） ==========
  const login = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success && data.user) {
        setUser(data.user);
        const isM = data.user.is_member || data.user.user_type === 'member';
        setQuota({
          career_planning: { remaining: -1, unlimited: isM },
          interview: { remaining: isM ? -1 : 3, unlimited: isM },
          assessment: { remaining: isM ? -1 : 1, unlimited: isM },
          competency: { is_member_only: true, requires_report: true },
          decision: { remaining: isM ? -1 : 3, unlimited: isM },
          remaining: isM ? -1 : 3,
          reset_time: new Date(Date.now() + 86400000).toISOString(),
          is_member: isM,
          member_type: isM ? 'member' : 'free',
          member_expire_time: null,
        });
      }
      return { success: data.success, message: data.message || data.error || '登录失败' };
    } catch {
      return { success: false, message: '登录失败，请稍后重试' };
    }
  };

  const register = async (email: string, password: string, nickname?: string): Promise<AuthResult> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, nickname }),
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success && data.user) setUser(data.user);
      return { success: data.success, message: data.message || data.error || '注册失败', needsVerification: data.needsVerification };
    } catch {
      return { success: false, message: '注册失败，请稍后重试' };
    }
  };

  const verifyOtp = async (email: string, token: string): Promise<AuthResult> => {
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, type: 'magiclink', flowType: 'signup' }),
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success && data.user) setUser(data.user);
      return { success: data.success, message: data.message || data.error || '验证失败' };
    } catch {
      return { success: false, message: '验证失败，请稍后重试' };
    }
  };

  // ========== 手机号登录/注册 ==========

  /** 发送手机验证码 */
  const sendPhoneCode = async (phone: string, type: 'login' | 'register'): Promise<AuthResult> => {
    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, type }),
      });
      const data = await response.json();
      return { success: data.success, message: data.error || data.message || '发送成功' };
    } catch {
      return { success: false, message: '发送失败，请稍后重试' };
    }
  };

  /** 发送邮箱验证码 */
  const sendEmailCode = async (email: string, type: 'login' | 'register'): Promise<AuthResult> => {
    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type }),
      });
      const data = await response.json();
      return { success: data.success, message: data.error || data.message || '发送成功' };
    } catch {
      return { success: false, message: '发送失败，请稍后重试' };
    }
  };

  /** 验证手机验证码并登录 */
  const verifyPhoneCode = async (phone: string, code: string, type: 'login' | 'register'): Promise<AuthResult> => {
    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, type }),
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success && data.user) setUser(data.user);
      return { success: data.success, message: data.error || data.message || '验证失败' };
    } catch {
      return { success: false, message: '验证失败，请稍后重试' };
    }
  };

  /** 验证邮箱验证码并登录 */
  const verifyEmailCode = async (email: string, code: string, type: 'login' | 'register'): Promise<AuthResult> => {
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token: code, type: 'magiclink', flowType: type === 'register' ? 'signup' : 'login' }),
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success && data.user) setUser(data.user);
      return { success: data.success, message: data.error || data.message || '验证失败' };
    } catch {
      return { success: false, message: '验证失败，请稍后重试' };
    }
  };
  /** 手机号注册：验证码+设置密码 */
  const registerWithPhone = async (phone: string, code: string, password: string, nickname?: string): Promise<AuthResult> => {
    try {
      const response = await fetch('/api/auth/register-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, password, nickname }),
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success && data.user) setUser(data.user);
      return { success: data.success, message: data.error || data.message || '注册失败' };
    } catch {
      return { success: false, message: '注册失败，请稍后重试' };
    }
  };

  const logout = async () => {
    setUser(null);
    setQuota(null);
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
  };

  return (
    <AuthContext.Provider value={{
      user, loading, isAuthenticated: !!user, isLoading: loading, quota, refreshQuota,
      login, register, verifyOtp,
      sendPhoneCode, sendEmailCode, verifyPhoneCode, verifyEmailCode, registerWithPhone,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
