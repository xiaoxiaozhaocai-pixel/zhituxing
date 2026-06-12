'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Building2, Eye, EyeOff } from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/employer/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError('请填写邮箱和密码');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const r = await fetch('/api/employer/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        setError(j.error?.message ?? '登录失败');
        return;
      }
      router.push(redirect);
      router.refresh();
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-8 -mx-4 -my-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#165DFF] to-[#3D7FFF] shadow-lg shadow-[#165DFF]/30 mb-3">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">雇主登录</h1>
          <p className="text-sm text-gray-500 mt-1">职途星·候选人精准匹配</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white/80 backdrop-blur-md border border-[#165DFF]/10 rounded-2xl p-6 shadow-xl shadow-[#165DFF]/5 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">企业邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hr@company.com"
              autoComplete="email"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/20 outline-none transition"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">密码</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 8 位"
                autoComplete="current-password"
                className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/20 outline-none transition"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] text-white font-medium rounded-lg shadow-md shadow-[#165DFF]/20 hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            登录
          </button>
          <div className="text-center text-sm text-gray-500 pt-2 border-t border-gray-100">
            还没有账号？{' '}
            <Link href="/employer/auth/signup" className="text-[#165DFF] hover:underline font-medium">
              立即注册
            </Link>
          </div>
        </form>
        <div className="text-center text-xs text-gray-400 mt-4">
          <Link href="/" className="hover:text-[#165DFF]">← 返回职途星首页（学生端）</Link>
        </div>
      </div>
    </div>
  );
}

export default function EmployerLoginPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-gray-400">加载中...</div>}>
      <LoginContent />
    </Suspense>
  );
}
