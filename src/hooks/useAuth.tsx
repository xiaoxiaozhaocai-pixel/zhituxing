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
      // 从 localStorage 获取用户 ID
      const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      const userId = storedUser ? JSON.parse(storedUser)?.id : null;
      
      const response = await fetch('/api/auth/me', {
        headers: userId ? { 'x-user-id': userId } : {}
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

  // 刷新配额信息
  const refreshQuota = useCallback(async () => {
    try {
      // 从 localStorage 获取用户 ID
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

  const sendCode = async (phone: string, type: string = 'login'): Promise<{ success: boolean; message: string; code?: string }> => {
    try {
      // 自动拼接 @test.com 形成邮箱
      const email = `${phone}@test.com`;
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type }),
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
      // 自动拼接 @test.com 形成邮箱
      const email = `${phone}@test.com`;
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, code }),
      });
      
      const data = await response.json();
      
      if (data.success && data.user) {
        // 存储用户信息到 localStorage
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // 登录后获取完整用户信息（包含配额）
        const meResponse = await fetch('/api/auth/me', {
          headers: { 'x-user-id': data.user.id }
        });
        const meData = await meResponse.json();
        
        if (meData.success && meData.user) {
          setUser(meData.user);
          setQuota(meData.user.quota);
          // 更新 localStorage 中的用户信息
          localStorage.setItem('user', JSON.stringify(meData.user));
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
      // 自动拼接 @test.com 形成邮箱
      const email = `${phone}@test.com`;
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, code, nickname, invite_code: inviteCode }),
      });
      
      const data = await response.json();
      
      if (data.success && data.user) {
        // 存储用户信息到 localStorage
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        
        // 根据用户类型设置配额
        const isMember = data.user.user_type === 'member' || data.user.membership_type === 'member';
        setQuota({
          career_planning: { remaining: -1, unlimited: isMember },
          interview: { remaining: isMember ? -1 : 3, unlimited: isMember },
          assessment: { remaining: isMember ? -1 : 1, unlimited: isMember },
          competency: { is_member_only: true, requires_report: true },
          decision: { remaining: isMember ? -1 : 3, unlimited: isMember },
          remaining: isMember ? -1 : 3,
          reset_time: '',
          is_member: isMember,
          member_type: isMember ? 'member' : 'free',
          member_expire_time: data.user.membership_expires_at || null
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
      localStorage.removeItem('user');
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
