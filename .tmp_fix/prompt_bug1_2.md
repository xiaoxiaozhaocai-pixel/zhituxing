# 任务：诊断并修复 2 个 P1 Bug（都涉及 useAuth）

## Bug #1：登录成功后页面不自动跳转

**用户视角**：用户在 /auth 输入邮箱密码，点登录，后端 200 OK 设置了 cookie，前端 `setSuccess('登录成功，正在跳转...')`，但停留在 /auth，需要手动刷新页面才跳到 /。

**已知**：
- `/api/auth/login` 返回 `{ success: true, message, user: {...} }`，cookie 用 setAuthCookies 写入（httpOnly）
- `useAuth.login()` 调 fetch 后 `if (data.success && data.user) setUser(data.user)` ✅ 字段判断正确
- `auth/page.tsx` 顶部有 useEffect 监听 `user` 变化触发 `router.push(safeRedirect)`
- `handleLogin` 没有主动 router.push，完全依赖上面 useEffect

**疑似**：
1. setState 异步 + React 19 自动批处理，setSuccess 后 user 还没同步？
2. Next.js 16 router.push 不触发软导航，需要 router.refresh() 配合？
3. useEffect 依赖数组 `[user, router, redirectTo]`，router 实例每次 render 都新建，可能导致 useEffect 异常？

## Bug #2：前端 loading state 不切 false

**用户视角**：某些页面（具体哪些待你诊断）loading 一直转圈。

**已知**：
- `useAuth` 同时暴露 `loading` 和 `isLoading`，可能消费方拿错字段
- `loading` 初值 true，`checkAuth()` 在 finally 切 false，逻辑看起来对
- 但 `AuthContextType` 接口里 `loading: boolean; isLoading: boolean;` 两个都有，**isLoading 在哪赋值？grep 不到 setIsLoading**

请诊断 isLoading 是不是永远是 undefined/true？是不是接口里没实际实现？

---

## 代码上下文

### src/hooks/useAuth.tsx（关键片段）
```tsx
  avatar_url?: string;
  created_at?: string;
  quota?: QuotaInfo;
  role?: string;
  is_vip?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  quota: QuotaInfo | null;
  refreshQuota: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (email: string, password: string, nickname?: string) => Promise<{ success: boolean; message: string; needsVerification?: boolean }>;
  verifyOtp: (email: string, token: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  // P0 修复：用户切回标签页时重新校验会话（防"假在线"）
  // 配合 /api/auth/me 服务端 refresh_token 自动续期能力，
  // 实现 access_token 过期后无感续期；refresh 失败则自动登出。
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAuth();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const checkAuth = async () => {
    try {
      // 安全修复：不再从 localStorage 读取用户信息
      // 认证状态完全由 httpOnly cookie 管理
      const response = await fetch('/api/auth/me', {
        credentials: 'include' // 确保发送 cookie
      });
      const data = await response.json();
      
      if (data.ok && data.data?.user) {
        setUser(data.data.user);
        // quota 由 /api/quota 单独提供（me 契约不含 quota，遗留待治理）
        setQuota(null);
      } else {
        setUser(null);
        setQuota(null);
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
      setUser(null);
      setQuota(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshQuota = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.ok && data.data?.user) {
        setUser(data.data.user);
        setQuota(null);
      }
    } catch (error) {
      console.error('刷新配额失败:', error);
    }
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
```

### src/app/auth/page.tsx（关键片段）
```tsx
    }
  }, [searchParams]);

  // 如果已登录，跳转到来源页或首页
  useEffect(() => {
    if (user) {
      // 安全检查：redirect 必须是相对路径
      const safeRedirect = redirectTo.startsWith('/') && !redirectTo.startsWith('//')
        ? redirectTo
        : '/';
      router.push(safeRedirect);
    }
  }, [user, router, redirectTo]);

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
```

### /api/auth/login 后端返回（确认契约）
```ts
return NextResponse.json({
  success: true,
  message: '登录成功',
  user: { id, email, nickname, is_member: false }
});
// 同时 setAuthCookies 写 access/refresh httpOnly cookie
```

---

## 输出要求

1. **先回答两个根因**（bug1 真原因？bug2 真原因？）
2. **再给 2 段 unified diff 补丁**（如果两个 bug 在同一处修复，合并成 1 段）
3. **每段 diff 前用中文 1 句话说"这段改了什么、为什么"**
4. **不要重写整个文件，只动必要行**
5. **不要给"建议"或"可能要看"这种话——给确定方案**
