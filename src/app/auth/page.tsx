'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Loader2, Gift } from 'lucide-react';

type AuthMode = 'login' | 'register';

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, login, register, sendCode } = useAuth();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 从URL获取邀请码
  useEffect(() => {
    const code = searchParams.get('invite_code');
    if (code) {
      setInviteCode(code);
      // 如果是从邀请链接进入，默认显示注册模式
      setMode('register');
    }
  }, [searchParams]);

  // 如果已登录，跳转到首页
  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  // 倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendCode = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError('请输入正确的手机号');
      return;
    }

    setLoading(true);
    setError('');
    
    const result = await sendCode(phone, mode);
    
    setLoading(false);
    
    if (result.success) {
      setSuccess(result.code ? `验证码：${result.code}` : '验证码已发送');
      setCountdown(60);
      // 开发环境直接显示验证码
      if (result.code) {
        setCode(result.code);
      }
    } else {
      setError(result.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    let result;
    
    if (mode === 'login') {
      result = await login(phone, password, code);
    } else {
      if (!password) {
        setError('请设置密码');
        setLoading(false);
        return;
      }
      if (!code) {
        setError('请输入验证码');
        setLoading(false);
        return;
      }
      result = await register(phone, password, code, nickname, inviteCode);
    }

    setLoading(false);

    if (result.success) {
      setSuccess(result.message);
      // 延迟跳转
      setTimeout(() => {
        router.push('/');
      }, 1000);
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 返回链接 */}
        <Link href="/" className="inline-flex items-center text-gray-600 hover:text-[#165DFF] mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回首页
        </Link>

        <Card className="border-2 border-gray-100 shadow-xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold text-gray-900">
              {mode === 'login' ? '登录' : '注册'}
            </CardTitle>
            <CardDescription>
              {mode === 'login' 
                ? '欢迎回来！请登录您的账号' 
                : '创建新账号，开始求职之旅'}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {/* 邀请码提示 */}
            {mode === 'register' && inviteCode && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                <Gift className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-700">
                  您正在使用邀请码 <strong>{inviteCode}</strong> 注册，注册成功后双方都将获得奖励！
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 手机号 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  手机号
                </label>
                <Input
                  type="tel"
                  placeholder="请输入手机号"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={11}
                  required
                />
              </div>

              {/* 注册模式需要昵称 */}
              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    昵称（选填）
                  </label>
                  <Input
                    type="text"
                    placeholder="请输入昵称"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    maxLength={20}
                  />
                </div>
              )}

              {/* 验证码 */}
              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    验证码
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="请输入验证码"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      maxLength={6}
                      required
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendCode}
                      disabled={loading || countdown > 0}
                      className="whitespace-nowrap"
                    >
                      {countdown > 0 ? `${countdown}s` : '获取验证码'}
                    </Button>
                  </div>
                </div>
              )}

              {/* 密码 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {mode === 'register' ? '设置密码' : '密码'}
                </label>
                <Input
                  type="password"
                  placeholder={mode === 'register' ? '至少6位密码' : '请输入密码'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>

              {/* 登录模式：验证码登录选项 */}
              {mode === 'login' && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!/^1[3-9]\d{9}$/.test(phone)) {
                        setError('请先输入正确的手机号');
                        return;
                      }
                      setLoading(true);
                      const result = await sendCode(phone, 'login');
                      setLoading(false);
                      if (result.success) {
                        setSuccess(result.code ? `验证码：${result.code}` : '验证码已发送');
                        setCountdown(60);
                        if (result.code) setCode(result.code);
                      } else {
                        setError(result.message);
                      }
                    }}
                    disabled={loading || countdown > 0}
                    className="text-sm text-[#165DFF] hover:underline disabled:text-gray-400"
                  >
                    {countdown > 0 ? `${countdown}秒后可重新获取` : '使用验证码登录'}
                  </button>
                </div>
              )}

              {/* 错误提示 */}
              {error && (
                <div className="text-sm text-red-600 text-center bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}

              {/* 成功提示 */}
              {success && (
                <div className="text-sm text-green-600 text-center bg-green-50 p-2 rounded">
                  {success}
                </div>
              )}

              {/* 提交按钮 */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#165DFF] hover:bg-[#165DFF]/90 text-white py-6 h-auto text-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    处理中...
                  </>
                ) : (
                  mode === 'login' ? '登录' : '注册'
                )}
              </Button>
            </form>

            {/* 切换登录/注册 */}
            <div className="mt-6 text-center text-sm text-gray-600">
              {mode === 'login' ? (
                <>
                  还没有账号？{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setError('');
                      setSuccess('');
                    }}
                    className="text-[#165DFF] hover:underline font-medium"
                  >
                    立即注册
                  </button>
                </>
              ) : (
                <>
                  已有账号？{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError('');
                      setSuccess('');
                      setCode('');
                    }}
                    className="text-[#165DFF] hover:underline font-medium"
                  >
                    立即登录
                  </button>
                </>
              )}
            </div>

            {/* 注册提示 */}
            {mode === 'register' && (
              <p className="mt-4 text-xs text-gray-500 text-center">
                注册即表示同意
                <Link href="/terms" className="text-[#165DFF] hover:underline">《用户协议》</Link>
                和
                <Link href="/privacy" className="text-[#165DFF] hover:underline">《隐私政策》</Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#165DFF]" />
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}
