'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Building2, Eye, EyeOff, ArrowRight } from 'lucide-react';

function SignupContent() {
  const router = useRouter();

  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    real_name: '',
    phone: '',
    title: '',
    company_name: '',
  });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.password || !form.real_name) {
      setError('请填写邮箱、密码和真实姓名');
      return;
    }
    if (form.password.length < 8) {
      setError('密码至少 8 位');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('两次密码不一致');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const r = await fetch('/api/employer/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          real_name: form.real_name.trim(),
          phone: form.phone.trim() || undefined,
          title: form.title.trim() || undefined,
          company_name: form.company_name.trim() || undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        setError(j.error?.message ?? '注册失败');
        return;
      }
      router.push('/employer/dashboard');
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
          <h1 className="text-2xl font-bold text-gray-900">雇主注册</h1>
          <p className="text-sm text-gray-500 mt-1">开启精准候选人匹配</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white/80 backdrop-blur-md border border-[#165DFF]/10 rounded-2xl p-6 shadow-xl shadow-[#165DFF]/5 space-y-4"
        >
          {/* 必填：邮箱 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              企业邮箱 <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="hr@company.com"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/20 outline-none transition"
              disabled={loading}
            />
          </div>
          {/* 必填：密码 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                密码 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  placeholder="至少 8 位"
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                确认密码 <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => set('confirmPassword', e.target.value)}
                placeholder="再输入一次"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/20 outline-none transition"
                disabled={loading}
              />
            </div>
          </div>
          {/* 必填：真实姓名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              真实姓名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.real_name}
              onChange={(e) => set('real_name', e.target.value)}
              placeholder="您的姓名"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/20 outline-none transition"
              disabled={loading}
            />
          </div>
          {/* 可选：公司 + 职位 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">公司名称</label>
              <input
                type="text"
                value={form.company_name}
                onChange={(e) => set('company_name', e.target.value)}
                placeholder="选填"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/20 outline-none transition"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">职位</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="选填"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/20 outline-none transition"
                disabled={loading}
              />
            </div>
          </div>
          {/* 可选：手机 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">手机号</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="选填"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/20 outline-none transition"
              disabled={loading}
            />
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
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            注册
          </button>
          <div className="text-center text-sm text-gray-500 pt-2 border-t border-gray-100">
            已有账号？{' '}
            <Link href="/employer/auth/login" className="text-[#165DFF] hover:underline font-medium">
              立即登录
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EmployerSignupPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-gray-400">加载中...</div>}>
      <SignupContent />
    </Suspense>
  );
}
