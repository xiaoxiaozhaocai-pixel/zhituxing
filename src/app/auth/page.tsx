'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';

type Tab = 'login' | 'register';
type Step = 'phone' | 'code';

const PHONE_REGEX = /^1[3-9]\d{9}$/;
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
  const { user, registerWithPhone, sendPhoneCode, verifyPhoneCode } = useAuth();

  const redirectTo = searchParams.get('redirect') || '/';

  // --- Tab & Step ---
  const [tab, setTab] = useState<Tab>('login');
  const [step, setStep] = useState<Step>('phone');

  // --- Phone ---
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // --- Password (register only) ---
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [nickname, setNickname] = useState('');

  // --- Code ---
  const [codeDigits, setCodeDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resendCountdown, setResendCountdown] = useState(0);

  // --- Status ---
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  // --- Redirect if logged in ---
  useEffect(() => {
    if (user) {
      const safe = redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/';
      router.push(safe);
      router.refresh();
    }
  }, [user, router, redirectTo]);

  // --- Resend countdown ---
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((c) => {
        if (c <= 1) { clearInterval(timer); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  // --- Validation ---
  const validatePhone = (value: string) => {
    if (!value) { setPhoneError(''); return false; }
    if (!PHONE_REGEX.test(value)) { setPhoneError('请输入正确的手机号'); return false; }
    setPhoneError('');
    return true;
  };

  const validatePassword = (value: string) => {
    if (!value) { setPasswordError(''); return false; }
    if (value.length < 6) { setPasswordError('密码至少6位'); return false; }
    if (value.length > 20) { setPasswordError('密码最多20位'); return false; }
    setPasswordError('');
    return true;
  };

  // --- Phone → Send Code ---
  const handleSendCode = async () => {
    if (!PHONE_REGEX.test(phone)) {
      setPhoneError('请输入正确的手机号');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const result = await sendPhoneCode(phone, tab);
      if (result.success) {
        setStep('code');
        setResendCountdown(60);
        setCodeDigits(Array(CODE_LENGTH).fill(''));
        // Focus first code input
        setTimeout(() => codeRefs.current[0]?.focus(), 100);
      } else {
        setError(result.message);
      }
    } catch {
      setError('发送失败，请稍后重试');
    }
    setLoading(false);
  };

  // --- Code Input Handlers ---
  const handleCodeChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...codeDigits];
    next[index] = digit;
    setCodeDigits(next);

    if (digit && index < CODE_LENGTH - 1) {
      codeRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !codeDigits[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!pasted) return;
    const digits = pasted.split('');
    const next = [...codeDigits];
    digits.forEach((d, i) => { if (i < CODE_LENGTH) next[i] = d; });
    setCodeDigits(next);
    // Focus last or first empty
    const lastIdx = Math.min(digits.length, CODE_LENGTH - 1);
    codeRefs.current[lastIdx]?.focus();
  };

  const codeValue = codeDigits.join('');

  // --- Verify Code ---
  const handleVerify = async () => {
    if (codeValue.length !== CODE_LENGTH) return;
    setLoading(true);
    setError('');

    try {
      if (tab === 'login') {
        const result = await verifyPhoneCode(phone, codeValue, 'login');
        if (!result.success) setError(result.message);
      } else {
        // Register: verify code + set password
        if (!password || password.length < 6) {
          setPasswordError('请设置密码（至少6位）');
          setLoading(false);
          return;
        }
        const result = await registerWithPhone(phone, codeValue, password, nickname || undefined);
        if (!result.success) setError(result.message);
      }
    } catch {
      setError('验证失败，请稍后重试');
    }
    setLoading(false);
  };

  // Auto-submit when all 6 digits entered
  useEffect(() => {
    if (step === 'code' && codeValue.length === CODE_LENGTH && !loading) {
      handleVerify();
    }
  }, [codeValue]);

  // --- Resend ---
  const handleResend = async () => {
    if (resendCountdown > 0 || loading) return;
    setLoading(true);
    setError('');
    try {
      const result = await sendPhoneCode(phone, tab);
      if (result.success) {
        setResendCountdown(60);
        setCodeDigits(Array(CODE_LENGTH).fill(''));
      } else {
        setError(result.message);
      }
    } catch {
      setError('重发失败，请稍后重试');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#f8fafd] to-white px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#165DFF]">职途星</h1>
          <p className="text-sm text-gray-500 mt-2">懂桂电学生的AI朋友</p>
        </div>

        {/* Card */}
        <Card className="border-0 shadow-xl shadow-blue-100/50 rounded-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => { setTab('login'); setStep('phone'); setError(''); setPassword(''); setPasswordError(''); }}
              className={`flex-1 py-3.5 text-center font-medium text-base transition-colors relative ${
                tab === 'login' ? 'text-[#165DFF]' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              登录
              {tab === 'login' && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-[#165DFF] rounded-full" />}
            </button>
            <button
              onClick={() => { setTab('register'); setStep('phone'); setError(''); setPassword(''); setPasswordError(''); }}
              className={`flex-1 py-3.5 text-center font-medium text-base transition-colors relative ${
                tab === 'register' ? 'text-[#165DFF]' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              注册
              {tab === 'register' && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-[#165DFF] rounded-full" />}
            </button>
          </div>

          <CardContent className="p-6">
            {/* Error banner */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-start gap-2">
                <span className="shrink-0 mt-0.5">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Step: Phone Input */}
            {step === 'phone' && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                    手机号
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium select-none">
                      +86
                    </span>
                    <Input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      maxLength={11}
                      placeholder="请输入手机号"
                      value={phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                        setPhone(val);
                        if (phoneError) validatePhone(val);
                      }}
                      className={`h-12 pl-14 text-base ${phoneError ? 'border-red-300 focus:border-red-500' : ''}`}
                      autoFocus
                    />
                  </div>
                  {phoneError && (
                    <p className="text-xs text-red-500 mt-1">{phoneError}</p>
                  )}
                </div>

                <Button
                  onClick={handleSendCode}
                  disabled={loading || phone.length < 11 || !!phoneError}
                  className="w-full h-12 text-base font-medium bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] hover:from-[#165DFF]/90 hover:to-[#3D7FFF]/90 shadow-lg shadow-blue-200/50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '获取验证码'}
                </Button>

                {tab === 'register' && (
                  <p className="text-xs text-gray-400 text-center">
                    注册即表示同意{' '}
                    <Link href="/terms" className="text-[#165DFF] hover:underline" target="_blank">服务条款</Link>
                    {' '}和{' '}
                    <Link href="/privacy" className="text-[#165DFF] hover:underline" target="_blank">隐私政策</Link>
                  </p>
                )}
              </div>
            )}

            {/* Step: Code Input */}
            {step === 'code' && (
              <div className="space-y-4">
                {/* Back */}
                <button
                  onClick={() => { setStep('phone'); setError(''); }}
                  className="text-sm text-gray-400 hover:text-gray-600 flex items-center"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  返回
                </button>

                {/* Hint */}
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    验证码已发送至 <span className="font-medium text-gray-900">{phone}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">请输入6位短信验证码</p>
                </div>

                {/* Code Inputs */}
                <div className="flex justify-center gap-2" onPaste={handleCodePaste}>
                  {codeDigits.map((digit, idx) => (
                    <Input
                      key={idx}
                      ref={(el) => { codeRefs.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(idx, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(idx, e)}
                      className="w-11 h-14 text-center text-xl font-semibold p-0 rounded-xl"
                      autoFocus={idx === 0}
                    />
                  ))}
                </div>

                {/* Loading indicator for auto-verify */}
                {loading && (
                  <div className="flex justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-[#165DFF]" />
                  </div>
                )}

                {/* Register: set password (shown after code entered, before verify) */}
                {tab === 'register' && (
                  <div className="space-y-3 pt-2 border-t">
                    <div>
                      <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 mb-1">
                        设置密码
                      </label>
                      <div className="relative">
                        <Input
                          id="reg-password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          placeholder="至少6位"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (passwordError) validatePassword(e.target.value);
                          }}
                          className={`h-10 pr-10 ${passwordError ? 'border-red-300' : ''}`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {passwordError && <p className="text-xs text-red-500 mt-1">{passwordError}</p>}
                    </div>
                    <div>
                      <label htmlFor="reg-nickname" className="block text-sm font-medium text-gray-700 mb-1">
                        昵称 <span className="text-gray-400 text-xs">（选填）</span>
                      </label>
                      <Input
                        id="reg-nickname"
                        type="text"
                        autoComplete="nickname"
                        placeholder="给自己取个名字"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        className="h-10"
                      />
                    </div>
                  </div>
                )}

                {/* Resend */}
                <div className="text-center">
                  <button
                    onClick={handleResend}
                    disabled={loading || resendCountdown > 0}
                    className={`text-sm ${
                      resendCountdown > 0
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-[#165DFF] hover:text-[#165DFF]/80'
                    }`}
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
