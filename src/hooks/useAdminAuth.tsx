'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AdminUser {
  id: number;
  username: string;
  role: string;
}

interface AdminAuthContextType {
  admin: AdminUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 检查本地存储中的token
    const token = localStorage.getItem('admin_token');
    const adminData = localStorage.getItem('admin_user');
    
    if (token && adminData) {
      try {
        setAdmin(JSON.parse(adminData));
      } catch {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch('/admin/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (data.code === 200) {
        const adminData: AdminUser = {
          id: data.data.id,
          username: data.data.username,
          role: data.data.role
        };
        
        // 生成简单token
        const token = Buffer.from(`${adminData.id}:${adminData.username}:${Date.now()}`).toString('base64');
        
        localStorage.setItem('admin_token', token);
        localStorage.setItem('admin_user', JSON.stringify(adminData));
        setAdmin(adminData);
        
        return { success: true, message: '登录成功' };
      } else {
        return { success: false, message: data.message || '登录失败' };
      }
    } catch (error) {
      return { success: false, message: '网络错误' };
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setAdmin(null);
  };

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
