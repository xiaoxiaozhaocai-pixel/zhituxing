'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Mail, Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';

type Tab = 'password' | 'otp' | 'register';

const ERROR_MAP: Record<string, string> = {
  'Invalid login credentials': '邮箱或密码错误',
  'User already registered': '该邮箱已注册，请直接登录',
  'Password should be at least': '密码需≥8位，含大写+小写+数字',
  'Invalid verification code': '验证码错误',
  'Code expired': '验证码已过期，请重新获取',
  'Too many requests': '操作过于频繁，请稍后再试',
  'User not found': '该账号未注册，请先注册',
  'Email not confirmed': '请先验证邮箱',
};

const friendlyError = (msg: string) => {
  for (const [key, val] of Object.entries(ERROR_MAP)) {
    if (msg.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return msg || '操作失败，请稍后重试';
};

function AuthContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { login, verifyEmailCode, sendEmailCode } = useAuth();
  const [nickname, setNickname] = useState('');

  const [tab, setTab] = useState<Tab>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [code, setCode] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  const redirectTo = params.get('redirect') || '/';

  // 已登录跳走
  useEffect(() => {
    if (loginSuccess) {
      const safe = redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/';
      setTimeout(() => { router.push(safe); router.refresh(); }, 300);
    }
  }, [loginSuccess, router, redirectTo]);

  // 倒计时
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // 切换tab清状态
  const switchTab = (t: Tab) => {
    setTab(t);
    setError('');
    setSuccess('');
    setCode('');
    setCountdown(0);
  };

  // 发送验证码
  const handleSendCode = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('请输入正确的邮箱地址');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const r = await sendEmailCode(email, tab === 'register' ? 'register' : 'login');
      if (r.success) {
        setSuccess('验证码已发送到您的邮箱');
        setCountdown(60);
        setTimeout(() => codeInputRef.current?.focus(), 200);
      } else {
        setError(friendlyError(r.message));
      }
    } catch {
      setError('发送失败，请稍后重试');
    }
    setLoading(false);
  };

  // 密码登录
  const handlePwdLogin = async () => {
    if (!email || !password) { setError('请输入邮箱和密码'); return; }
    setLoading(true);
    setError('');
    try {
      const r = await login(email, password);
      if (r.success) {
        setSuccess('登录成功！');
        setLoginSuccess(true);
      } else {
        setError(friendlyError(r.message));
      }
    } catch {
      setError('登录失败，请稍后重试');
    }
    setLoading(false);
  };

  // 验证码登录
  const handleCodeLogin = async () => {
    if (!email) { setError('请输入邮箱'); return; }
    if (!code || code.length < 4) { setError('请输入验证码'); return; }
    setLoading(true);
    setError('');
    try {
      const r = await verifyEmailCode(email, code, 'login');
      if (r.success) {
        setSuccess('登录成功！');
        setLoginSuccess(true);
      } else {
        setError(friendlyError(r.message));
      }
    } catch {
      setError('验证失败，请稍后重试');
    }
    setLoading(false);
  };

  // 注册（直调API传password，hook不传密码）
  const handleRegister = async () => {
    if (!email) { setError('请输入邮箱'); return; }
    if (!password || password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      setError('密码需≥8位，含大写+小写+数字');
      return;
    }
    if (password !== confirmPwd) { setError('两次密码不一致'); return; }
    if (!code || code.length < 4) { setError('请输入验证码'); return; }
    if (!agreeTerms) { setError('请同意服务条款和隐私政策'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, token: code, type: 'magiclink', flowType: 'signup',
          password, nickname: nickname || undefined,
        }),
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('注册成功！');
        setLoginSuccess(true);
      } else {
        setError(friendlyError(data.error || data.message));
      }
    } catch {
      setError('注册失败，请稍后重试');
    }
    setLoading(false);
  };

  const tabCls = (t: Tab) =>
    `flex-1 py-3 text-sm font-medium text-center cursor-pointer transition-colors border-b-2 ${
      tab === t
        ? 'text-blue-600 border-blue-600'
        : 'text-gray-400 border-transparent hover:text-gray-600 hover:border-gray-300'
    }`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" />返回首页
        </Link>

        <Card className="shadow-lg border-0">
          <CardHeader className="text-center pb-0">
            <div className="mx-auto mb-3 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold">职途星</CardTitle>
          </CardHeader>

          {/* Tabs */}
          <div className="flex mx-6 mt-4 border-b border-gray-100">
            <div className={tabCls('password')} onClick={() => switchTab('password')}>密码登录</div>
            <div className={tabCls('otp')} onClick={() => switchTab('otp')}>验证码登录</div>
            <div className={tabCls('register')} onClick={() => switchTab('register')}>注册</div>
          </div>

          <CardContent className="pt-4">
            {/* 错误提示 */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <p className="text-sm text-green-600">{success}</p>
              </div>
            )}

            {/* ===== Tab 1: 密码登录 ===== */}
            {tab === 'password' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">邮箱地址</label>
                  <Input
                    type="email" placeholder="请输入邮箱地址"
                    value={email} onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handlePwdLogin()}
                    className="h-12" autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
                  <div className="relative">
                    <Input
                      type={showPwd ? 'text' : 'password'} placeholder="请输入密码"
                      value={password} onChange={e => setPassword(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handlePwdLogin()}
                      className="h-12 pr-10"
                    />
                    <button type="button" onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <Button onClick={handlePwdLogin} disabled={loading || !email || !password}
                  className="w-full h-12 text-base">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '登录'}
                </Button>
                <div className="text-center">
                  <button onClick={() => switchTab('otp')}
                    className="text-sm text-blue-600 hover:text-blue-700">
                    忘记密码？用验证码登录
                  </button>
                </div>
              </div>
            )}

            {/* ===== Tab 2: 验证码登录 ===== */}
            {tab === 'otp' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">邮箱地址</label>
                  <Input type="email" placeholder="请输入邮箱地址"
                    value={email} onChange={e => setEmail(e.target.value)}
                    className="h-12" autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">验证码</label>
                  <div className="flex gap-2">
                    <Input ref={codeInputRef} type="text" inputMode="numeric" placeholder="请输入验证码"
                      value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      onKeyDown={e => e.key === 'Enter' && handleCodeLogin()}
                      className="h-12 flex-1" maxLength={6}
                    />
                    <Button variant="outline" onClick={handleSendCode} disabled={loading || countdown > 0 || !email}
                      className="h-12 shrink-0 text-sm px-4">
                      {countdown > 0 ? `${countdown}s` : '获取验证码'}
                    </Button>
                  </div>
                </div>
                <Button onClick={handleCodeLogin} disabled={loading || !email || !code}
                  className="w-full h-12 text-base">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '登录'}
                </Button>
                <div className="text-center text-sm text-gray-500">
                  没有账号？<button onClick={() => switchTab('register')} className="text-blue-600 hover:text-blue-700 font-medium">立即注册</button>
                </div>
              </div>
            )}

            {/* ===== Tab 3: 注册 ===== */}
            {tab === 'register' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">邮箱地址</label>
                  <Input type="email" placeholder="请输入邮箱地址"
                    value={email} onChange={e => setEmail(e.target.value)}
                    className="h-12" autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
                  <div className="relative">
                    <Input type={showPwd ? 'text' : 'password'} placeholder="至少8位，含大写+小写+数字"
                      value={password} onChange={e => setPassword(e.target.value)}
                      className="h-12 pr-10"
                    />
                    <button type="button" onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">确认密码</label>
                  <div className="relative">
                    <Input type={showConfirm ? 'text' : 'password'} placeholder="请再次输入密码"
                      value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
                      className="h-12 pr-10"
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">昵称 <span className="text-gray-400 text-xs">（选填）</span></label>
                  <Input type="text" placeholder="给自己取个名字吧"
                    value={nickname} onChange={e => setNickname(e.target.value)}
                    className="h-12"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">验证码</label>
                  <div className="flex gap-2">
                    <Input ref={codeInputRef} type="text" inputMode="numeric" placeholder="请输入验证码"
                      value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="h-12 flex-1" maxLength={6}
                    />
                    <Button variant="outline" onClick={handleSendCode} disabled={loading || countdown > 0 || !email || !password}
                      className="h-12 shrink-0 text-sm px-4">
                      {countdown > 0 ? `${countdown}s` : '获取验证码'}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">先设置密码，再获取验证码完成注册</p>
                </div>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">
                    我已阅读并同意{' '}
                    <Link href="/terms" className="text-blue-600 hover:underline" target="_blank">服务条款</Link>
                    {' '}和{' '}
                    <Link href="/privacy" className="text-blue-600 hover:underline" target="_blank">隐私政策</Link>
                  </span>
                </label>
                <Button onClick={handleRegister} disabled={loading || !email || !password || !confirmPwd || !code || !agreeTerms}
                  className="w-full h-12 text-base">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '注册'}
                </Button>
                <div className="text-center text-sm text-gray-500">
                  已有账号？<button onClick={() => switchTab('password')} className="text-blue-600 hover:text-blue-700 font-medium">立即登录</button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <p className="text-center text-xs text-gray-400 mt-6">登录即表示您同意我们的服务条款和隐私政策</p>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}
