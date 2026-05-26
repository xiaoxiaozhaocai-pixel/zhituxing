'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

interface QuotaInfo {
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
  member_type: string;
  member_expire_time: string | null;
}

interface User {
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
  user: User | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // 安全修复：不再从 localStorage 读取用户信息
      // 认证状态完全由 httpOnly cookie 管理
      const response = await fetch('/api/auth/me', {
        credentials: 'include' // 确保发送 cookie
      });
      const data = await response.json();
      
      if (data.success && data.user) {
        setUser(data.user);
        setQuota(data.user.quota);
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
      
      if (data.success && data.user) {
        setUser(data.user);
        setQuota(data.user.quota);
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
      
      // 清理 cookie（通过服务端）
      if (typeof document !== 'undefined') {
        document.cookie = 'sb-access-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0';
        document.cookie = 'sb-refresh-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0';
      }
      
      // 调用服务端清理 cookie
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
