'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Loader2, Mail, Eye, EyeOff, Pencil, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

// 步骤状态
type Step = 'input' | 'password' | 'otp';

// 错误码映射
const ERROR_MESSAGES: Record<string, string> = {
  'Invalid login credentials': '邮箱或密码错误，请重新输入',
  'User already registered': '该邮箱已注册，请直接登录',
  'Password should be at least': '密码至少8位，需包含大写字母、小写字母和数字',
  'Email not confirmed': '请先验证邮箱',
  'Invalid verification code': '验证码错误，请重新输入',
  'Code expired': '验证码已过期，请重新获取',
  'Too many requests': '操作过于频繁，请稍后再试',
  'Network error': '网络错误，请检查网络连接',
  'User not found': '该账号未注册，请先注册',
};

const getFriendlyError = (error: string): string => {
  if (ERROR_MESSAGES[error]) return ERROR_MESSAGES[error];
  for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
    if (error.toLowerCase().includes(key.toLowerCase())) return value;
  }
  return '操作失败，请稍后重试';
};

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, login, register, verifyOtp } = useAuth();
  
  // 步骤状态
  const [step, setStep] = useState<Step>('input');
  
  // 输入值
  const [email, setEmail] = useState('');
  
  // 密码相关
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // 注册相关
  const [nickname, setNickname] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  
  // OTP相关
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resendCountdown, setResendCountdown] = useState(0);
  
  // 状态
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  
  // 表单验证
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  // 从URL获取邀请码
  useEffect(() => {
    const code = searchParams.get('invite_code');
    if (code) {
      setInviteCode(code);
    }
    
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, [searchParams]);

  // 如果已登录，跳转到首页
  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  // 验证邮箱格式
  const validateEmail = (value: string): boolean => {
    if (!value) {
      setEmailError('');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setEmailError('请输入正确的邮箱地址');
      return false;
    }
    setEmailError('');
    return true;
  };

  // 验证密码（与后端一致的强度校验）
  const validatePassword = (value: string): boolean => {
    if (!value) {
      setPasswordError('');
      return false;
    }
    if (value.length < 8) {
      setPasswordError('密码至少8位');
      return false;
    }
    if (!/[A-Z]/.test(value)) {
      setPasswordError('密码需包含大写字母');
      return false;
    }
    if (!/[a-z]/.test(value)) {
      setPasswordError('密码需包含小写字母');
      return false;
    }
    if (!/[0-9]/.test(value)) {
      setPasswordError('密码需包含数字');
      return false;
    }
    setPasswordError('');
    return true;
  };

  // 验证确认密码
  const validateConfirmPassword = (value: string): boolean => {
    if (!value) {
      setConfirmPasswordError('');
      return false;
    }
    if (value !== password) {
      setConfirmPasswordError('两次密码输入不一致');
      return false;
    }
    setConfirmPasswordError('');
    return true;
  };

  // 处理邮箱输入变化
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (value) validateEmail(value);
  };

  // 点击继续（邮箱输入后）
  const handleContinue = async () => {
    if (!validateEmail(email)) return;
    
    setLoading(true);
    setError('');
    
    try {
      // 尝试检测邮箱是否已注册
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: '___check___' }),
      });
      
      const data = await response.json();
      
      if (data.error?.includes('邮箱或密码错误') || data.error?.includes('Invalid')) {
        // 用户存在但密码错误 → 已注册
        setIsRegistered(true);
        setStep('password');
      } else if (data.error?.includes('未注册') || data.error?.includes('not found') || response.status === 404) {
        setIsRegistered(false);
        setStep('password');
      } else {
        // 默认假设已注册
        setIsRegistered(true);
        setStep('password');
      }
    } catch {
      setIsRegistered(true);
      setStep('password');
    }
    
    setLoading(false);
  };

  // 登录
  const handleLogin = async () => {
    if (!validateEmail(email) || !validatePassword(password)) return;
    
    setLoading(true);
    setError('');
    
    try {
      const result = await login(email, password);
      if (result.success) {
        setSuccess('登录成功，正在跳转...');
      } else {
        setError(getFriendlyError(result.message));
      }
    } catch (err) {
      setError('登录失败，请稍后重试');
    }
    
    setLoading(false);
  };

  // 注册 - 改用OTP验证码流程
  // 流程：输入邮箱密码 → 发送OTP → 验证OTP → 验证成功后自动设置密码
  const handleRegister = async () => {
    if (!validateEmail(email) || !validatePassword(password) || !validateConfirmPassword(confirmPassword)) return;
    
    setLoading(true);
    setError('');
    
    try {
      // 直接调用 send-code API 发送 OTP 验证码
      // 不再调用 signUp（会发确认链接而非验证码）
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'signup' }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess('验证码已发送到您的邮箱，请查收');
        setStep('otp'); // 进入OTP验证步骤
        setResendCountdown(60); // 启动60秒倒计时
      } else {
        setError(data.error || '发送验证码失败');
      }
    } catch (err) {
      setError('发送验证码失败，请稍后重试');
    }
    
    setLoading(false);
  };

  // OTP验证
  // 注册流程：验证成功后设置密码和昵称
  // 登录流程：验证成功直接跳转
  const handleOtpVerify = async () => {
    const otpValue = otpDigits.join('');
    if (otpValue.length !== 8) {
      setError('请输入完整的8位验证码');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // 调用 verify-otp API，传入密码和昵称（如果是注册流程）
      const body: Record<string, string | undefined> = { 
        email, 
        token: otpValue, 
        type: isRegistered ? 'magiclink' : 'signup' 
      };
      
      // 如果是注册流程，额外传入密码和昵称
      if (!isRegistered) {
        body.password = password;
        body.nickname = nickname || undefined;
      }
      
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess('验证成功，正在跳转...');
      } else {
        setError(getFriendlyError(data.error || data.message));
      }
    } catch (err) {
      setError('验证失败，请稍后重试');
    }
    
    setLoading(false);
  };

  // 倒计时effect
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  // 重发验证码
  const handleResendOtp = async () => {
    if (resendCountdown > 0) return; // 倒计时中不允许重发
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: isRegistered ? 'magiclink' : 'signup' }),
      });
      
      const data = await response.json();
      if (data.success) {
        setSuccess('验证码已重新发送到您的邮箱');
        setResendCountdown(60); // 启动60秒倒计时
      } else {
        setError(data.error || '发送失败');
      }
    } catch (err) {
      setError('发送失败，请稍后重试');
    }
    
    setLoading(false);
  };

  // OTP输入处理
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);
    
    // 自动跳转到下一个输入框
    if (value && index < 7) {
      otpRefs.current[index + 1]?.focus();
    }
    
    // 如果8位都填完了，自动验证
    if (newDigits.every(d => d !== '') && newDigits.join('').length === 8) {
      // 延迟执行验证
      setTimeout(() => {
        const otpValue = newDigits.join('');
        // 直接调用验证
        (async () => {
          setLoading(true);
          setError('');
          try {
            const result = await verifyOtp(email, otpValue);
            if (result.success) {
              setSuccess('验证成功，正在跳转...');
            } else {
              setError(getFriendlyError(result.message));
            }
          } catch (err) {
            setError('验证失败，请稍后重试');
          }
          setLoading(false);
        })();
      }, 300);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 8);
    const newDigits = [...otpDigits];
    for (let i = 0; i < pastedData.length; i++) {
      newDigits[i] = pastedData[i];
    }
    setOtpDigits(newDigits);
    
    if (pastedData.length > 0) {
      const focusIndex = Math.min(pastedData.length, 7);
      otpRefs.current[focusIndex]?.focus();
    }
  };

  // 返回上一步
  const handleBack = () => {
    if (step === 'password') {
      setStep('input');
      setPassword('');
      setConfirmPassword('');
      setNickname('');
      setIsRegistered(null);
    } else if (step === 'otp') {
      setStep('password');
      setOtpDigits(['', '', '', '', '', '', '', '']);
    }
    setError('');
    setSuccess('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 顶部返回链接 */}
        <Link 
          href="/" 
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          返回首页
        </Link>

        <Card className="shadow-lg border-0">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-3 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold">
              {step === 'otp' ? '验证邮箱' : '职途星'}
            </CardTitle>
            <CardDescription>
              {step === 'input' && '请输入您的邮箱地址'}
              {step === 'password' && isRegistered && '请输入密码登录'}
              {step === 'password' && !isRegistered && '设置密码完成注册'}
              {step === 'otp' && `验证码已发送到 ${email}`}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-4">
            {/* 错误提示 */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            {/* 成功提示 */}
            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-600">{success}</p>
              </div>
            )}

            {/* 步骤1：邮箱输入 */}
            {step === 'input' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">邮箱地址</label>
                  <Input
                    type="email"
                    placeholder="请输入邮箱地址"
                    value={email}
                    onChange={handleEmailChange}
                    onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
                    className={`h-12 ${emailError ? 'border-red-300 focus:border-red-500' : ''}`}
                    autoFocus
                  />
                  {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
                </div>
                
                <Button 
                  onClick={handleContinue}
                  disabled={loading || !email || !!emailError}
                  className="w-full h-12 text-base"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '继续'}
                </Button>
              </div>
            )}

            {/* 步骤2：密码输入（登录/注册） */}
            {step === 'password' && (
              <div className="space-y-4">
                {/* 返回按钮 */}
                <button 
                  onClick={handleBack}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  返回
                </button>

                {/* 邮箱显示 */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">邮箱</p>
                  <p className="font-medium">{email}</p>
                </div>

                {/* 密码输入 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="请输入密码"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        validatePassword(e.target.value);
                      }}
                      className={`h-12 pr-10 ${passwordError ? 'border-red-300 focus:border-red-500' : ''}`}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {passwordError && <p className="text-xs text-red-500 mt-1">{passwordError}</p>}
                </div>

                {/* 注册时需要确认密码和昵称 */}
                {!isRegistered && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">确认密码</label>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="请再次输入密码"
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            validateConfirmPassword(e.target.value);
                          }}
                          className={`h-12 pr-10 ${confirmPasswordError ? 'border-red-300 focus:border-red-500' : ''}`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {confirmPasswordError && <p className="text-xs text-red-500 mt-1">{confirmPasswordError}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        昵称 <span className="text-gray-400 text-xs">（选填）</span>
                      </label>
                      <div className="relative">
                        <Input
                          type="text"
                          placeholder="给自己取个名字吧"
                          value={nickname}
                          onChange={(e) => setNickname(e.target.value)}
                          className="h-12 pl-10"
                        />
                        <Pencil className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </>
                )}

                {/* 操作按钮 */}
                {isRegistered ? (
                  <Button 
                    onClick={handleLogin}
                    disabled={loading || !password || !!passwordError}
                    className="w-full h-12 text-base"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '登录'}
                  </Button>
                ) : (
                  <Button 
                    onClick={handleRegister}
                    disabled={loading || !password || !confirmPassword || !!passwordError || !!confirmPasswordError}
                    className="w-full h-12 text-base"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '注册'}
                  </Button>
                )}

                {/* 切换登录/注册 */}
                <div className="text-center text-sm text-gray-500">
                  {isRegistered ? (
                    <>
                      还没有账号？
                      <button 
                        onClick={() => { setIsRegistered(false); setConfirmPassword(''); setConfirmPasswordError(''); }}
                        className="text-blue-600 hover:text-blue-700 font-medium ml-1"
                      >
                        立即注册
                      </button>
                    </>
                  ) : (
                    <>
                      已有账号？
                      <button 
                        onClick={() => { setIsRegistered(true); setConfirmPassword(''); setConfirmPasswordError(''); }}
                        className="text-blue-600 hover:text-blue-700 font-medium ml-1"
                      >
                        立即登录
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 步骤3：OTP验证 */}
            {step === 'otp' && (
              <div className="space-y-4">
                {/* 返回按钮 */}
                <button 
                  onClick={handleBack}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  返回
                </button>

                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-4">
                    我们已向 <span className="font-medium text-gray-900">{email}</span> 发送了8位数字验证码
                  </p>
                  
                  {/* OTP输入框 */}
                  <div className="flex justify-center gap-2 mb-4" onPaste={handleOtpPaste}>
                    {otpDigits.map((digit, index) => (
                      <Input
                        key={index}
                        ref={(el) => { otpRefs.current[index] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className="w-10 h-12 text-center text-lg font-semibold p-0"
                      />
                    ))}
                  </div>
                  
                  <p className="text-xs text-gray-400 mb-4">验证码为8位数字，请查看您的邮箱</p>
                </div>

                <Button 
                  onClick={handleOtpVerify}
                  disabled={loading || otpDigits.join('').length !== 8}
                  className="w-full h-12 text-base"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '验证'}
                </Button>

                {/* 重发验证码 */}
                <div className="text-center">
                  <button
                    onClick={handleResendOtp}
                    disabled={loading || resendCountdown > 0}
                    className={`text-sm flex items-center justify-center gap-1 mx-auto ${
                      resendCountdown > 0 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : 'text-blue-600 hover:text-blue-700'
                    }`}
                  >
                    <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                    {resendCountdown > 0 
                      ? `重新发送(${resendCountdown}s)` 
                      : '重新发送验证码'
                    }
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 底部提示 */}
        <p className="text-center text-xs text-gray-400 mt-6">
          登录即表示您同意我们的服务条款和隐私政策
        </p>
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
