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
      const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      const userId = storedUser ? JSON.parse(storedUser)?.id : null;
      
      const response = await fetch('/api/auth/me', {
        headers: userId ? { 'x-user-id': userId } : {},
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success && data.user) {
        setUser(data.user);
        setQuota(data.user.quota);
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(data.user));
        }
      } else {
        setUser(null);
        setQuota(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('user');
        }
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
      const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      const userId = storedUser ? JSON.parse(storedUser)?.id : null;
      
      const response = await fetch('/api/auth/me', {
        headers: userId ? { 'x-user-id': userId } : {}
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
      });
      
      const data = await response.json();
      
      if (data.success && data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
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
      });
      
      const data = await response.json();
      
      if (data.success && data.needsVerification) {
        return { success: true, message: data.message, needsVerification: true };
      }
      
      if (data.success && data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
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
      });
      
      const data = await response.json();
      
      if (data.success && data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
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
      localStorage.removeItem('user');
      setUser(null);
      setQuota(null);
      
      // Clear cookies by setting them to expired
      document.cookie = 'sb-access-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0';
      document.cookie = 'sb-refresh-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0';
      
      // Also call the server to clear cookies
      await fetch('/api/auth/me', { method: 'GET' }).catch(() => {});
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
