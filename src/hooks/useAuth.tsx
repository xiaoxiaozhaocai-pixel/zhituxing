'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export interface QuotaInfo {
  career_planning: {
    remaining: number;
    unlimited: boolean;
  };
  interview: {
    remaining: number;
    unlimited: boolean;
    reset_time?: string;
  };
  assessment: {
    remaining: number;
    unlimited: boolean;
    reset_time?: string;
  };
  competency: {
    is_member_only: boolean;
    requires_report: boolean;
  };
  decision: {
    remaining: number;
    unlimited: boolean;
  };
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

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  quota: QuotaInfo | null;
  refreshQuota: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (email: string, password: string, nickname?: string) => Promise<{ success: boolean; message: string; needsVerification?: boolean }>;
  verifyOtp: (email: string, token: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  // P0 修复：用户切回标签页时重新校验会话（防"假在线"）
  // 配合 /api/auth/me 服务端 refresh_token 自动续期能力，
  // 实现 access_token 过期后无感续期；refresh 失败则自动登出。
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAuth();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const checkAuth = async () => {
    try {
      // 安全修复：不再从 localStorage 读取用户信息
      // 认证状态完全由 httpOnly cookie 管理
      const response = await fetch('/api/auth/me', {
        credentials: 'include' // 确保发送 cookie
      });
      const data = await response.json();
      
      if (data.ok && data.data?.user) {
        setUser(data.data.user);
        // 从 /api/membership 获取会员状态填充 quota.is_member
        // 解决全站组件依赖 quota?.is_member 但 checkAuth 置 null 的问题
        fetch('/api/membership', { credentials: 'include' })
          .then(r => r.json())
          .then(d => {
            if (d.ok) {
              const isMember = d.data?.isMember || false;
              setQuota(prev => {
                if (!prev) return null;
                return { ...prev, is_member: isMember };
              });
            } else {
              setQuota(null);
            }
          })
          .catch(() => setQuota(null));
      } else {
        setUser(null);
        setQuota(null);
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
      setUser(null);
      setQuota(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshQuota = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.ok && data.data?.user) {
        setUser(data.data.user);
        // 从 /api/membership 获取会员状态
        fetch('/api/membership', { credentials: 'include' })
          .then(r => r.json())
          .then(d => {
            if (d.ok) {
              const isMember = d.data?.isMember || false;
              setQuota(prev => {
                if (!prev) return null;
                return { ...prev, is_member: isMember };
              });
            } else {
              setQuota(null);
            }
          })
          .catch(() => setQuota(null));
      }
    } catch (error) {
      console.error('刷新配额失败:', error);
    }
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success && data.user) {
        // 安全修复：不再将用户数据存储到 localStorage
        // 用户数据从 /api/auth/me API 获取，认证由 httpOnly cookie 管理
        setUser(data.user);
        
        const isMemberUser = data.user.is_member || data.user.user_type === 'member';
        setQuota({
          career_planning: { remaining: -1, unlimited: isMemberUser },
          interview: { remaining: isMemberUser ? -1 : 3, unlimited: isMemberUser },
          assessment: { remaining: isMemberUser ? -1 : 1, unlimited: isMemberUser },
          competency: { is_member_only: true, requires_report: true },
          decision: { remaining: isMemberUser ? -1 : 3, unlimited: isMemberUser },
          remaining: isMemberUser ? -1 : 3,
          reset_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          is_member: isMemberUser,
          member_type: isMemberUser ? 'member' : 'free',
          member_expire_time: null
        });
      }
      
      return { success: data.success, message: data.message || data.error || '登录失败' };
    } catch (error) {
      console.error('登录失败:', error);
      return { success: false, message: '登录失败，请稍后重试' };
    }
  };

  const register = async (email: string, password: string, nickname?: string): Promise<{ success: boolean; message: string; needsVerification?: boolean }> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, nickname }),
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success && data.needsVerification) {
        return { success: true, message: data.message, needsVerification: true };
      }
      
      if (data.success && data.user) {
        // 安全修复：不再将用户数据存储到 localStorage
        setUser(data.user);
      }
      
      return { success: data.success, message: data.message || data.error || '注册失败', needsVerification: data.needsVerification };
    } catch (error) {
      console.error('注册失败:', error);
      return { success: false, message: '注册失败，请稍后重试' };
    }
  };

  const verifyOtp = async (email: string, token: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, type: 'magiclink', flowType: 'signup' }),
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success && data.user) {
        // 安全修复：不再将用户数据存储到 localStorage
        setUser(data.user);
      }
      
      return { success: data.success, message: data.message || data.error || '验证失败' };
    } catch (error) {
      console.error('OTP验证失败:', error);
      return { success: false, message: '验证失败，请稍后重试' };
    }
  };

  const logout = async () => {
    try {
      // 安全修复：不再操作 localStorage
      // 清理内存状态
      setUser(null);
      setQuota(null);

      // 调用服务端清理 cookie（HttpOnly cookie 必须服务端清，客户端 document.cookie 写不动）
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    } catch (error) {
      console.error('退出登录失败:', error);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated: !!user,
      isLoading: loading,
      quota,
      refreshQuota,
      login,
      register,
      verifyOtp,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
