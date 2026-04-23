'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

interface QuotaInfo {
  // 职业规划
  career_planning: {
    remaining: number;
    unlimited: boolean;
  };
  // 模拟面试配额
  interview: {
    remaining: number;
    unlimited: boolean;
    reset_time?: string;
  };
  // 能力测评配额
  assessment: {
    remaining: number;
    unlimited: boolean;
    reset_time?: string;
  };
  // 胜任力评估
  competency: {
    is_member_only: boolean;
    requires_report: boolean;
  };
  // 考研就业决策
  decision: {
    remaining: number;
    unlimited: boolean;
  };
  // 兼容旧字段
  remaining: number;
  reset_time: string;
  is_member: boolean;
  member_type: string;
  member_expire_time: string | null;
}

interface User {
  id: string;
  phone: string;
  nickname: string;
  avatar_url?: string;
  created_at: string;
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
  login: (phone: string, password?: string, code?: string) => Promise<{ success: boolean; message: string }>;
  register: (phone: string, password: string, code: string, nickname?: string, inviteCode?: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  sendCode: (phone: string, type?: string) => Promise<{ success: boolean; message: string; code?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);

  // 检查登录状态
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
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

  // 刷新配额信息
  const refreshQuota = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();
      
      if (data.success && data.user) {
        setUser(data.user);
        setQuota(data.user.quota);
      }
    } catch (error) {
      console.error('刷新配额失败:', error);
    }
  }, []);

  const sendCode = async (phone: string, type: string = 'login'): Promise<{ success: boolean; message: string; code?: string }> => {
    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, type }),
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('发送验证码失败:', error);
      return { success: false, message: '发送失败，请稍后重试' };
    }
  };

  const login = async (phone: string, password?: string, code?: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password, code }),
      });
      
      const data = await response.json();
      
      if (data.success && data.user) {
        // 登录后获取完整用户信息（包含配额）
        const meResponse = await fetch('/api/auth/me');
        const meData = await meResponse.json();
        
        if (meData.success && meData.user) {
          setUser(meData.user);
          setQuota(meData.user.quota);
        } else {
          setUser(data.user);
        }
        
        return { success: true, message: '登录成功' };
      } else {
        return { success: false, message: data.error || '登录失败' };
      }
    } catch (error) {
      console.error('登录失败:', error);
      return { success: false, message: '登录失败，请稍后重试' };
    }
  };

  const register = async (phone: string, password: string, code: string, nickname?: string, inviteCode?: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password, code, nickname, invite_code: inviteCode }),
      });
      
      const data = await response.json();
      
      if (data.success && data.user) {
        setUser(data.user);
        // 注册后设置默认配额
        setQuota({
          career_planning: { remaining: -1, unlimited: true },
          interview: { remaining: 3, unlimited: false },
          assessment: { remaining: 1, unlimited: false },
          competency: { is_member_only: true, requires_report: true },
          decision: { remaining: 3, unlimited: false },
          remaining: 3,
          reset_time: '',
          is_member: false,
          member_type: 'free',
          member_expire_time: null
        });
        return { success: true, message: '注册成功' };
      } else {
        return { success: false, message: data.error || '注册失败' };
      }
    } catch (error) {
      console.error('注册失败:', error);
      return { success: false, message: '注册失败，请稍后重试' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setQuota(null);
    } catch (error) {
      console.error('登出失败:', error);
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
      logout, 
      sendCode 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
