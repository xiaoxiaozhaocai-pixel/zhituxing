'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { getSupabase } from '@/lib/supabase';
import { ArrowLeft, Loader2, Gift, AlertCircle, CheckCircle, Eye, EyeOff, Smartphone, Mail, Pencil } from 'lucide-react';

// 步骤状态
type Step = 'input' | 'password' | 'otp' | 'register';
type InputType = 'phone' | 'email' | 'unknown';

// 错误码映射：将技术错误转换为友好中文提示
const ERROR_MESSAGES: Record<string, string> = {
  'Invalid login credentials': '手机号或密码错误，请重新输入',
  'User already registered': '该手机号已注册，请直接登录',
  'Password should be at least 6 characters': '密码长度不能少于6位',
  'Phone not confirmed': '请先验证手机号',
  'Invalid phone number': '请输入正确的手机号',
  'Invalid verification code': '验证码错误，请重新输入',
  'Code expired': '验证码已过期，请重新获取',
  'Too many requests': '操作过于频繁，请稍后再试',
  'Network error': '网络错误，请检查网络连接',
  'User not found': '该账号未注册，请先注册',
};

// 将错误信息转换为友好提示
const getFriendlyError = (error: string): string => {
  if (ERROR_MESSAGES[error]) return ERROR_MESSAGES[error];
  for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
    if (error.toLowerCase().includes(key.toLowerCase())) return value;
  }
  return '操作失败，请稍后重试';
};

// 判断输入类型
const detectInputType = (value: string): InputType => {
  const phoneRegex = /^1[3-9]\d{0,10}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  // 如果是纯数字且以1开头，判断为手机号输入中
  if (/^\d*$/.test(value) && value.length <= 11) {
    if (value.length === 11 && phoneRegex.test(value)) return 'phone';
    if (value.length < 11 && value.length > 0) return 'phone'; // 输入中的手机号
  }
  // 如果包含@，判断为邮箱
  if (value.includes('@')) {
    if (emailRegex.test(value)) return 'email';
    return 'email'; // 输入中的邮箱
  }
  return 'unknown';
};

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, login, register, sendCode } = useAuth();
  
  // 步骤状态
  const [step, setStep] = useState<Step>('input');
  
  // 输入值
  const [inputValue, setInputValue] = useState('');
  const [inputType, setInputType] = useState<InputType>('unknown');
  
  // 密码相关
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // 验证码相关
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  // 注册相关
  const [nickname, setNickname] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  
  // 状态
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null); // null=未知, true=已注册, false=未注册
  
  // 表单验证
  const [inputError, setInputError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  
  // 其他方式登录折叠
  const [showOtherMethods, setShowOtherMethods] = useState(false);

  // 从URL获取邀请码
  useEffect(() => {
    const code = searchParams.get('invite_code');
    if (code) {
      setInviteCode(code);
    }
    
    // 处理 auth callback 返回的错误
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

  // 倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 验证手机号格式
  const validatePhone = (value: string): boolean => {
    if (!value) {
      setInputError('');
      return false;
    }
    if (!/^1[3-9]\d{9}$/.test(value)) {
      setInputError('请输入正确的11位手机号');
      return false;
    }
    setInputError('');
    return true;
  };

  // 验证邮箱格式
  const validateEmail = (value: string): boolean => {
    if (!value) {
      setInputError('');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setInputError('请输入正确的邮箱地址');
      return false;
    }
    setInputError('');
    return true;
  };

  // 验证密码
  const validatePassword = (value: string): boolean => {
    if (!value) {
      setPasswordError('');
      return false;
    }
    if (value.length < 6) {
      setPasswordError('密码长度不能少于6位');
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

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    const type = detectInputType(value);
    setInputType(type);
    
    // 实时验证
    if (type === 'phone' && value.length === 11) {
      validatePhone(value);
    } else if (type === 'email') {
      validateEmail(value);
    } else {
      setInputError('');
    }
  };

  // 点击继续
  const handleContinue = async () => {
    const type = detectInputType(inputValue);
    
    if (type === 'phone') {
      if (!validatePhone(inputValue)) return;
      
      // 检查手机号是否已注册
      setLoading(true);
      setError('');
      
      try {
        const supabase = getSupabase();
        // 尝试用空密码登录来检测用户是否存在（会返回错误但不创建用户）
        const { error: checkError } = await supabase.auth.signInWithPassword({
          phone: inputValue,
          password: '___check___'
        });
        
        // 如果返回 Invalid login credentials，说明用户存在
        if (checkError?.message.includes('Invalid login credentials')) {
          setIsRegistered(true);
          setStep('password');
        } else if (checkError?.message.includes('User not found') || checkError?.message.includes('Unable to validate')) {
          setIsRegistered(false);
          setStep('register');
        } else {
          // 默认假设已注册（更安全）
          setIsRegistered(true);
          setStep('password');
        }
      } catch {
        // 出错时默认显示登录
        setIsRegistered(true);
        setStep('password');
      }
      
      setLoading(false);
      
    } else if (type === 'email') {
      if (!validateEmail(inputValue)) return;
      
      // 发送验证码
      await handleSendOtp();
    }
  };

  // 发送邮箱验证码
  // 发送邮箱验证码
  // 注意：Supabase 的 signInWithOtp 行为取决于 Dashboard 配置：
  // 1. 如果开启了 "Confirm email"（Authentication > Settings > Email），新用户会收到确认链接而非OTP
  // 2. 需要在 Supabase Dashboard 关闭 "Confirm email" 才能确保总是发送 OTP
  // 3. 已验证的老用户会收到 OTP，新用户会收到确认链接（如果开启了 Confirm email）
  const handleSendOtp = async () => {
    setLoading(true);
    setError('');
    
    try {
      const { error } = await getSupabase().auth.signInWithOtp({
        email: inputValue,
        options: { 
          shouldCreateUser: true,
          // 设置 emailRedirectTo 以便确认链接能正确回调
          emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`
        }
      });
      
      if (error) {
        // 特殊处理：如果提示需要验证邮箱，说明用户已存在但未验证
        if (error.message.includes('Email not confirmed') || error.message.includes('confirm')) {
          setError('该邮箱已注册但未验证，请查收确认邮件或联系客服');
        } else {
          setError(getFriendlyError(error.message));
        }
      } else {
        setStep('otp');
        setCountdown(60);
        setSuccess('验证码/确认链接已发送到您的邮箱，请查收。如果是新注册用户，请点击邮件中的链接完成验证。');
        setOtpDigits(['', '', '', '', '', '', '', '']);
      }
    } catch (err: any) {
      setError(err.message || '发送失败，请重试');
    }
    
    setLoading(false);
  };

  // 验证码输入处理
  const handleOtpChange = (index: number, value: string) => {
    // 只允许数字
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);
    
    // 自动聚焦下一个
    if (digit && index < 7) {
      otpRefs.current[index + 1]?.focus();
    }
    
    // 8位输满后自动验证
    if (newDigits.every(d => d) && newDigits.join('').length === 8) {
      handleVerifyOtp(newDigits.join(''));
    }
  };

  // 验证码粘贴处理
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 8);
    const newDigits = pastedData.split('').concat(['', '', '', '', '', '', '', '']).slice(0, 8);
    setOtpDigits(newDigits);
    
    // 如果粘贴了8位，自动验证
    if (pastedData.length === 8) {
      handleVerifyOtp(pastedData);
    }
  };

  // 验证码退格处理
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // 验证邮箱验证码
  const handleVerifyOtp = async (code: string) => {
    setLoading(true);
    setError('');
    
    try {
      const { data, error } = await getSupabase().auth.verifyOtp({
        email: inputValue,
        token: code,
        type: 'email'
      });
      
      if (error) {
        if (error.message.includes('invalid') || error.message.includes('expired')) {
          setError('验证码无效或已过期，请重新发送');
          setOtpDigits(['', '', '', '', '', '', '', '']);
        } else {
          setError(getFriendlyError(error.message));
        }
      } else {
        // 检查用户绑定状态
        const { data: { user } } = await getSupabase().auth.getUser();
        if (user) {
          if (!user.phone && user.email) {
            localStorage.setItem('bind_prompt', 'phone');
          } else if (!user.email && user.phone) {
            localStorage.setItem('bind_prompt', 'email');
          }
        }
        setSuccess('登录成功！');
        setTimeout(() => router.push('/'), 500);
      }
    } catch (err: any) {
      setError(err.message || '验证失败，请重试');
    }
    
    setLoading(false);
  };

  // 密码登录
  const handlePasswordLogin = async () => {
    if (!validatePassword(password)) return;
    
    setLoading(true);
    setError('');
    
    try {
      const result = await login(inputValue, password);
      
      if (result.success) {
        setSuccess('登录成功！');
        setTimeout(() => router.push('/'), 500);
      } else {
        setError(getFriendlyError(result.message));
      }
    } catch (err: any) {
      setError(err.message || '登录失败，请重试');
    }
    
    setLoading(false);
  };

  // 手机号注册
  const handlePhoneRegister = async () => {
    if (!validatePassword(password)) return;
    if (!validateConfirmPassword(confirmPassword)) return;
    
    setLoading(true);
    setError('');
    
    try {
      // 先发送验证码
      const codeResult = await sendCode(inputValue, 'register');
      if (!codeResult.success) {
        setError(getFriendlyError(codeResult.message));
        setLoading(false);
        return;
      }
      
      // 开发环境直接使用返回的验证码
      const verifyCode = codeResult.code || '';
      
      const result = await register(inputValue, password, verifyCode, nickname, inviteCode);
      
      if (result.success) {
        setSuccess('注册成功！');
        setTimeout(() => router.push('/'), 500);
      } else {
        setError(getFriendlyError(result.message));
      }
    } catch (err: any) {
      setError(err.message || '注册失败，请重试');
    }
    
    setLoading(false);
  };

  // 返回输入步骤
  const handleBack = () => {
    setStep('input');
    setPassword('');
    setConfirmPassword('');
    setOtpDigits(['', '', '', '', '', '', '', '']);
    setError('');
    setSuccess('');
    setInputError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setIsRegistered(null);
  };

  // 切换到验证码登录
  const handleSwitchToOtp = async () => {
    // 使用邮箱验证码登录
    setError('');
    setSuccess('');
    setInputValue('');
    setInputType('email');
    setStep('input');
  };

  // 获取标题
  const getTitle = () => {
    if (step === 'input') return '登录 / 注册';
    if (step === 'password') return '登录';
    if (step === 'otp') return '验证邮箱';
    if (step === 'register') return '创建账号';
    return '登录 / 注册';
  };

  // 获取描述
  const getDescription = () => {
    if (step === 'input') return 'AI驱动，规划你的职业未来';
    if (step === 'password') return '请输入密码登录';
    if (step === 'otp') return '验证码已发送到您的邮箱';
    if (step === 'register') return '设置密码完成注册';
    return '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 返回链接 */}
        <Link href="/" className="inline-flex items-center text-gray-600 hover:text-[#165DFF] mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回首页
        </Link>

        <Card className="border-2 border-gray-100 shadow-xl">
          <CardHeader className="text-center pb-2">
            {/* Logo */}
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#165DFF] to-[#0d4acc] flex items-center justify-center">
                <span className="text-white font-bold text-sm">职</span>
              </div>
              <span className="text-xl font-bold text-gray-900">职途星</span>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              {getTitle()}
            </CardTitle>
            <CardDescription>
              {getDescription()}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {/* 邀请码提示 */}
            {inviteCode && step === 'input' && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                <Gift className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-sm text-green-700">
                  邀请码 <strong>{inviteCode}</strong>，注册成功双方得奖励
                </span>
              </div>
            )}

            {/* 步骤1：输入手机号或邮箱 */}
            {step === 'input' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    手机号或邮箱
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {inputType === 'email' ? <Mail className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
                    </div>
                    <Input
                      type="text"
                      placeholder="请输入手机号或邮箱"
                      value={inputValue}
                      onChange={handleInputChange}
                      className={`pl-10 h-12 text-lg ${inputError ? 'border-red-500 focus:border-red-500' : ''}`}
                      autoFocus
                    />
                  </div>
                  {inputError && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {inputError}
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleContinue}
                  disabled={loading || !inputValue || !!inputError}
                  className="w-full bg-[#165DFF] hover:bg-[#0d4acc] text-white h-12 text-lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      处理中...
                    </>
                  ) : (
                    '继续'
                  )}
                </Button>

                {/* 其他方式登录 */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowOtherMethods(!showOtherMethods)}
                    className="text-sm text-gray-500 hover:text-gray-700 w-full text-center flex items-center justify-center gap-1"
                  >
                    其他方式登录
                    <span className={`transition-transform ${showOtherMethods ? 'rotate-180' : ''}`}>▼</span>
                  </button>
                  {showOtherMethods && (
                    <div className="mt-3 space-y-2 p-3 bg-gray-50 rounded-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setInputValue('');
                          setInputType('email');
                          setInputError('');
                        }}
                        className="w-full text-left text-sm text-gray-600 hover:text-[#165DFF] p-2 rounded hover:bg-gray-100 flex items-center gap-2"
                      >
                        <Mail className="w-4 h-4" />
                        邮箱验证码登录
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setInputValue('');
                          setInputType('phone');
                          setInputError('');
                        }}
                        className="w-full text-left text-sm text-gray-600 hover:text-[#165DFF] p-2 rounded hover:bg-gray-100 flex items-center gap-2"
                      >
                        <Smartphone className="w-4 h-4" />
                        手机号 + 密码登录
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 步骤2a：密码输入（登录） */}
            {step === 'password' && (
              <div className="space-y-4">
                {/* 当前账号 + 修改 */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-700">{inputValue}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleBack}
                    className="text-sm text-[#165DFF] hover:underline flex items-center gap-1"
                  >
                    <Pencil className="w-3 h-3" />
                    修改
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">密码</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="请输入密码"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        validatePassword(e.target.value);
                      }}
                      className={`h-12 pr-10 ${passwordError ? 'border-red-500 focus:border-red-500' : ''}`}
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
                  {passwordError && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {passwordError}
                    </p>
                  )}
                </div>

                {/* 忘记密码 */}
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setError('请联系客服重置密码，或使用邮箱验证码登录');
                    }}
                    className="text-sm text-gray-500 hover:text-[#165DFF]"
                  >
                    忘记密码？
                  </button>
                </div>

                <Button
                  onClick={handlePasswordLogin}
                  disabled={loading || !password || !!passwordError}
                  className="w-full bg-[#165DFF] hover:bg-[#0d4acc] text-white h-12 text-lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      登录中...
                    </>
                  ) : (
                    '登录'
                  )}
                </Button>

                {/* 使用验证码登录 */}
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={handleSwitchToOtp}
                    className="text-sm text-[#165DFF] hover:underline"
                  >
                    使用邮箱验证码登录
                  </button>
                </div>
              </div>
            )}

            {/* 步骤2b：验证码输入 */}
            {step === 'otp' && (
              <div className="space-y-4">
                {/* 当前邮箱 + 修改 */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-700">{inputValue}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleBack}
                    className="text-sm text-[#165DFF] hover:underline flex items-center gap-1"
                  >
                    <Pencil className="w-3 h-3" />
                    修改
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">验证码</label>
                  {/* 桌面端：一行8格；移动端：两行4+4 */}
                  <div className="flex flex-wrap gap-2 justify-center">
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
                        onPaste={index === 0 ? handleOtpPaste : undefined}
                        className="w-10 h-12 md:w-11 md:h-13 text-center text-xl md:text-2xl font-bold border-2 focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/20"
                        autoFocus={index === 0}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    输入邮箱收到的8位验证码
                  </p>
                </div>

                {/* 重新发送 */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={loading || countdown > 0}
                    className="text-sm text-gray-500 hover:text-[#165DFF] disabled:text-gray-400"
                  >
                    {countdown > 0 ? `${countdown}秒后可重新发送` : '重新发送验证码'}
                  </button>
                </div>
              </div>
            )}

            {/* 步骤2c：注册（设置密码） */}
            {step === 'register' && (
              <div className="space-y-4">
                {/* 当前手机号 + 修改 */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-700">{inputValue}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleBack}
                    className="text-sm text-[#165DFF] hover:underline flex items-center gap-1"
                  >
                    <Pencil className="w-3 h-3" />
                    修改
                  </button>
                </div>

                {/* 昵称 */}
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
                    className="h-12"
                  />
                </div>

                {/* 设置密码 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">设置密码</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="至少6位密码"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        validatePassword(e.target.value);
                        if (confirmPassword) validateConfirmPassword(confirmPassword);
                      }}
                      className={`h-12 pr-10 ${passwordError ? 'border-red-500 focus:border-red-500' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {passwordError && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {passwordError}
                    </p>
                  )}
                </div>

                {/* 确认密码 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">确认密码</label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="再次输入密码"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        validateConfirmPassword(e.target.value);
                      }}
                      className={`h-12 pr-10 ${confirmPasswordError ? 'border-red-500 focus:border-red-500' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {confirmPasswordError && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {confirmPasswordError}
                    </p>
                  )}
                </div>

                <Button
                  onClick={handlePhoneRegister}
                  disabled={loading || !password || !confirmPassword || !!passwordError || !!confirmPasswordError}
                  className="w-full bg-[#165DFF] hover:bg-[#0d4acc] text-white h-12 text-lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      注册中...
                    </>
                  ) : (
                    '注册'
                  )}
                </Button>
              </div>
            )}

            {/* 错误提示 */}
            {error && (
              <div className="text-sm text-red-600 text-center bg-red-50 p-3 rounded-lg flex items-center justify-center gap-2 mt-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* 成功提示 */}
            {success && (
              <div className="text-sm text-green-600 text-center bg-green-50 p-3 rounded-lg flex items-center justify-center gap-2 mt-4">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* 注册提示 */}
            {step === 'register' && (
              <p className="mt-4 text-xs text-gray-500 text-center">
                注册即表示同意
                <Link href="/terms" className="text-[#165DFF] hover:underline mx-1">《用户协议》</Link>
                和
                <Link href="/privacy" className="text-[#165DFF] hover:underline mx-1">《隐私政策》</Link>
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
