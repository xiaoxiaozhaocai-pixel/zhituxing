'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';

type Tab = 'login' | 'register';
type Step = 'input' | 'code';
type AuthMethod = 'phone' | 'email';

const PHONE_REGEX = /^1[3-9]\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_LENGTH = 6;

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthFallback />}>
      <AuthContent />
    </Suspense>
  );
}

function AuthFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#f8fafd] to-white">
      <Loader2 className="w-8 h-8 animate-spin text-[#165DFF]" />
    </div>
  );
}

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, sendPhoneCode, sendEmailCode, verifyPhoneCode, verifyEmailCode } = useAuth();

  const redirectTo = searchParams.get('redirect') || '/';

  const [tab, setTab] = useState<Tab>('login');
  const [step, setStep] = useState<Step>('input');
  const [method, setMethod] = useState<AuthMethod>('phone');

  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [inputError, setInputError] = useState('');

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [nickname, setNickname] = useState('');

  const [codeDigits, setCodeDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resendCountdown, setResendCountdown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      const safe = redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/';
      router.push(safe);
      router.refresh();
    }
  }, [user, router, redirectTo]);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  const validateInput = (value: string) => {
    if (method === 'phone') {
      if (!value) { setInputError(''); return false; }
      if (!PHONE_REGEX.test(value)) { setInputError('请输入正确的手机号'); return false; }
    } else {
      if (!value) { setInputError(''); return false; }
      if (!EMAIL_REGEX.test(value)) { setInputError('请输入正确的邮箱地址'); return false; }
    }
    setInputError('');
    return true;
  };

  const validatePassword = (value: string) => {
    if (!value) { setPasswordError(''); return false; }
    if (value.length < 6) { setPasswordError('密码至少6位'); return false; }
    setPasswordError('');
    return true;
  };

  const handleSendCode = async () => {
    if (method === 'phone') {
      if (!PHONE_REGEX.test(phone)) { setInputError('请输入正确的手机号'); return; }
      setLoading(true); setError('');
      try {
        const result = await sendPhoneCode(phone, tab);
        if (result.success) { setStep('code'); setResendCountdown(60); setCodeDigits(Array(CODE_LENGTH).fill('')); setTimeout(() => codeRefs.current[0]?.focus(), 100); }
        else setError(result.message);
      } catch { setError('发送失败'); }
      setLoading(false);
    } else {
      if (!EMAIL_REGEX.test(email)) { setInputError('请输入正确的邮箱地址'); return; }
      setLoading(true); setError('');
      try {
        const result = await sendEmailCode(email, tab);
        if (result.success) { setStep('code'); setResendCountdown(60); setCodeDigits(Array(CODE_LENGTH).fill('')); setTimeout(() => codeRefs.current[0]?.focus(), 100); }
        else setError(result.message);
      } catch { setError('发送失败'); }
      setLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...codeDigits];
    next[index] = digit;
    setCodeDigits(next);
    if (digit && index < CODE_LENGTH - 1) codeRefs.current[index + 1]?.focus();
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !codeDigits[index] && index > 0) codeRefs.current[index - 1]?.focus();
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!pasted) return;
    const digits = pasted.split('');
    const next = [...codeDigits];
    digits.forEach((d, i) => { if (i < CODE_LENGTH) next[i] = d; });
    setCodeDigits(next);
    codeRefs.current[Math.min(digits.length, CODE_LENGTH - 1)]?.focus();
  };

  const codeValue = codeDigits.join('');

  const handleVerify = async () => {
    if (codeValue.length !== CODE_LENGTH) return;
    setLoading(true); setError('');
    try {
      if (method === 'phone') {
        const result = await verifyPhoneCode(phone, codeValue, tab);
        if (!result.success) setError(result.message);
      } else {
        const result = await verifyEmailCode(email, codeValue, tab);
        if (!result.success) setError(result.message);
      }
    } catch { setError('验证失败'); }
    setLoading(false);
  };

  useEffect(() => {
    if (step === 'code' && codeValue.length === CODE_LENGTH && !loading) handleVerify();
  }, [codeValue]);

  const handleResend = async () => {
    if (resendCountdown > 0 || loading) return;
    setLoading(true); setError('');
    try {
      const result = method === 'phone' ? await sendPhoneCode(phone, tab) : await sendEmailCode(email, tab);
      if (result.success) { setResendCountdown(60); setCodeDigits(Array(CODE_LENGTH).fill('')); }
      else setError(result.message);
    } catch { setError('重发失败'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#f8fafd] to-white px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#165DFF]">职途星</h1>
          <p className="text-sm text-gray-500 mt-2">懂桂电学生的AI朋友</p>
        </div>

        <Card className="border-0 shadow-xl shadow-blue-100/50 rounded-2xl overflow-hidden">
          {/* Login / Register Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => { setTab('login'); setStep('input'); setError(''); }}
              className={`flex-1 py-3.5 text-center font-medium text-base transition-colors relative ${tab === 'login' ? 'text-[#165DFF]' : 'text-gray-400 hover:text-gray-600'}`}
            >
              登录
              {tab === 'login' && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-[#165DFF] rounded-full" />}
            </button>
            <button
              onClick={() => { setTab('register'); setStep('input'); setError(''); }}
              className={`flex-1 py-3.5 text-center font-medium text-base transition-colors relative ${tab === 'register' ? 'text-[#165DFF]' : 'text-gray-400 hover:text-gray-600'}`}
            >
              注册
              {tab === 'register' && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-[#165DFF] rounded-full" />}
            </button>
          </div>

          <CardContent className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-start gap-2">
                <span className="shrink-0 mt-0.5">⚠️</span><span>{error}</span>
              </div>
            )}

            {/* Phone / Email toggle */}
            <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => { setMethod('phone'); setStep('input'); setError(''); setInputError(''); }}
                className={`flex-1 py-1.5 text-sm rounded-md font-medium transition-colors ${method === 'phone' ? 'bg-white text-[#165DFF] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >手机号</button>
              <button
                onClick={() => { setMethod('email'); setStep('input'); setError(''); setInputError(''); }}
                className={`flex-1 py-1.5 text-sm rounded-md font-medium transition-colors ${method === 'email' ? 'bg-white text-[#165DFF] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >邮箱</button>
            </div>

            {step === 'input' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {method === 'phone' ? '手机号' : '邮箱地址'}
                  </label>
                  {method === 'phone' ? (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">+86</span>
                      <Input
                        type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={11}
                        placeholder="请输入手机号" value={phone}
                        onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 11); setPhone(v); if (inputError) validateInput(v); }}
                        className={`h-12 pl-14 text-base ${inputError ? 'border-red-300' : ''}`} autoFocus
                      />
                    </div>
                  ) : (
                    <Input
                      type="email" autoComplete="email"
                      placeholder="请输入邮箱地址" value={email}
                      onChange={(e) => { setEmail(e.target.value.trim()); if (inputError) validateInput(e.target.value.trim()); }}
                      className={`h-12 text-base ${inputError ? 'border-red-300' : ''}`} autoFocus
                    />
                  )}
                  {inputError && <p className="text-xs text-red-500 mt-1">{inputError}</p>}
                </div>

                <Button
                  onClick={handleSendCode}
                  disabled={loading || (method === 'phone' ? phone.length < 11 : !EMAIL_REGEX.test(email)) || !!inputError}
                  className="w-full h-12 text-base font-medium bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] hover:from-[#165DFF]/90 hover:to-[#3D7FFF]/90 shadow-lg shadow-blue-200/50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '获取验证码'}
                </Button>

                {tab === 'register' && (
                  <p className="text-xs text-gray-400 text-center">
                    注册即表示同意 <Link href="/terms" className="text-[#165DFF] hover:underline" target="_blank">服务条款</Link> 和 <Link href="/privacy" className="text-[#165DFF] hover:underline" target="_blank">隐私政策</Link>
                  </p>
                )}
              </div>
            )}

            {step === 'code' && (
              <div className="space-y-4">
                <button onClick={() => { setStep('input'); setError(''); }} className="text-sm text-gray-400 hover:text-gray-600 flex items-center">
                  <ArrowLeft className="w-4 h-4 mr-1" />返回
                </button>

                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    验证码已发送至 <span className="font-medium text-gray-900">{method === 'phone' ? phone : email}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{method === 'phone' ? '请输入6位短信验证码（未配置短信时请查看服务端日志）' : '请输入邮件中的验证码'}</p>
                </div>

                <div className="flex justify-center gap-2" onPaste={handleCodePaste}>
                  {codeDigits.map((digit, idx) => (
                    <Input
                      key={idx}
                      ref={(el) => { codeRefs.current[idx] = el; }}
                      type="text" inputMode="numeric" autoComplete="one-time-code"
                      maxLength={1} value={digit}
                      onChange={(e) => handleCodeChange(idx, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(idx, e)}
                      className="w-11 h-14 text-center text-xl font-semibold p-0 rounded-xl"
                      autoFocus={idx === 0}
                    />
                  ))}
                </div>

                {loading && <div className="flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#165DFF]" /></div>}

                <div className="text-center">
                  <button
                    onClick={handleResend} disabled={loading || resendCountdown > 0}
                    className={`text-sm ${resendCountdown > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-[#165DFF] hover:text-[#165DFF]/80'}`}
                  >
                    {resendCountdown > 0 ? `${resendCountdown}秒后可重发` : '重新发送验证码'}
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
