'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

interface AdminUser {
  id: number;
  username: string;
  role: string;
}

interface AdminAuthContextType {
  admin: AdminUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  // 安全修复 P0-6：不再从 localStorage 读取 admin token
  // 改用 httpOnly cookie（由服务端设置），XSS 攻击无法窃取
  useEffect(() => {
    // 检查是否已有有效会话（通过 API 验证 cookie）
    const checkSession = async () => {
      try {
        // 使用 /api/admin/auth 检查管理员状态
        const response = await fetch('/api/admin/auth', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          if (data.isAdmin) {
            setAdmin({ id: 0, username: 'admin', role: 'admin' });
          }
        }
      } catch {
        // 会话检查失败，忽略
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const response = await fetch('/admin/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (data.code === 200) {
        setAdmin(data.data.admin);
        return { success: true, message: '登录成功' };
      } else {
        return { success: false, message: data.message || '登录失败' };
      }
    } catch {
      return { success: false, message: '网络错误' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/admin/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // 忽略网络错误
    }
    setAdmin(null);
  }, []);

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        loading,
        login,
        logout,
        isAuthenticated: !!admin
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
