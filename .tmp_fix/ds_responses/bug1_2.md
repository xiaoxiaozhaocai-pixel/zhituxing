## 根因诊断

### Bug #1：登录成功后页面不自动跳转

**描述不准**。实际原因是：`auth/page.tsx` 中 `handleLogin` 函数里调用了 `login(email, password)`，但 `login` 函数来自 `useAuth` hook，它返回的是 `Promise<{ success: boolean; message: string }>`，**不包含 `user` 对象**。而 `useAuth` 内部的 `login` 函数在成功后会调用 `setUser(data.user)`，但由于 React 19 的自动批处理，`setUser` 的更新不会立即反映到 `handleLogin` 的调用栈中。`handleLogin` 执行完后，`user` 状态才异步更新，触发 `useEffect` 进行跳转。**但问题在于**：`handleLogin` 中 `setLoading(false)` 在 `setSuccess` 之后执行，而 `loading` 状态变化会触发组件重渲染，但 `user` 状态此时可能还未更新，导致 `useEffect` 中的 `if (user)` 条件不成立。实际上，`setUser` 和 `setLoading` 是异步的，但 React 19 的自动批处理会将它们合并到一次渲染中，所以 `user` 和 `loading` 会在同一次渲染中更新。**真正的问题是**：`router.push` 在 Next.js 16 中需要配合 `router.refresh()` 才能触发软导航，否则只是修改 URL 但不触发页面刷新。

### Bug #2：前端 loading state 不切 false

**描述准确**。`AuthContextType` 接口中声明了 `isLoading: boolean`，但在 `AuthProvider` 组件中**从未定义或赋值** `isLoading` 状态。`loading` 状态在 `checkAuth` 的 `finally` 中正确设置为 `false`，但 `isLoading` 始终是 `undefined`。消费方如果使用 `isLoading` 字段，会得到 `undefined`，在条件判断 `if (isLoading)` 中 `undefined` 被当作 `false`，但如果消费方使用 `!isLoading` 来显示内容，则 `!undefined` 为 `true`，导致内容提前显示。更可能的情况是消费方使用 `isLoading` 作为 loading 指示器的条件，而 `undefined` 在 JSX 中不会渲染，导致 loading 状态永远不消失。

## 补丁

### 补丁 1：修复 useAuth 中 isLoading 未实现的问题

```diff
--- a/src/hooks/useAuth.tsx
+++ b/src/hooks/useAuth.tsx
@@ -30,6 +30,7 @@ export function AuthProvider({ children }: { children: ReactNode }) {
   const [user, setUser] = useState<User | null>(null);
   const [loading, setLoading] = useState(true);
+  const [isLoading, setIsLoading] = useState(false);
   const [quota, setQuota] = useState<QuotaInfo | null>(null);
 
   useEffect(() => {
@@ -103,6 +104,7 @@ export function AuthProvider({ children }: { children: ReactNode }) {
 
   const login = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
     try {
+      setIsLoading(true);
       const response = await fetch('/api/auth/login', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
@@ -120,6 +122,7 @@ export function AuthProvider({ children }: { children: ReactNode }) {
       return { success: false, message: error instanceof Error ? error.message : '登录失败' };
     } finally {
       setLoading(false);
+      setIsLoading(false);
     }
   };
 
@@ -127,6 +130,7 @@ export function AuthProvider({ children }: { children: ReactNode }) {
     try {
+      setIsLoading(true);
       const response = await fetch('/api/auth/register', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
@@ -145,6 +149,7 @@ export function AuthProvider({ children }: { children: ReactNode }) {
       return { success: false, message: error instanceof Error ? error.message : '注册失败' };
     } finally {
       setLoading(false);
+      setIsLoading(false);
     }
   };
 
@@ -152,6 +157,7 @@ export function AuthProvider({ children }: { children: ReactNode }) {
     try {
+      setIsLoading(true);
       const response = await fetch('/api/auth/verify-otp', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
@@ -170,6 +176,7 @@ export function AuthProvider({ children }: { children: ReactNode }) {
       return { success: false, message: error instanceof Error ? error.message : '验证失败' };
     } finally {
       setLoading(false);
+      setIsLoading(false);
     }
   };
 
@@ -177,6 +184,7 @@ export function AuthProvider({ children }: { children: ReactNode }) {
     try {
+      setIsLoading(true);
       const response = await fetch('/api/auth/logout', {
         method: 'POST',
         credentials: 'include',
@@ -190,6 +198,7 @@ export function AuthProvider({ children }: { children: ReactNode }) {
       console.error('退出登录失败:', error);
     } finally {
       setLoading(false);
+      setIsLoading(false);
     }
   };
 
@@ -215,6 +224,7 @@ export function AuthProvider({ children }: { children: ReactNode }) {
       value={{
         user,
         loading,
+        isLoading,
         isAuthenticated: !!user,
         quota,
         refreshQuota,
```

### 补丁 2：修复 auth/page.tsx 中登录后不跳转的问题

```diff
--- a/src/app/auth/page.tsx
+++ b/src/app/auth/page.tsx
@@ -1,3 +1,4 @@
+import { useRouter } from 'next/navigation';
 import { useAuth } from '@/hooks/useAuth';
 import { useState, useEffect, useCallback } from 'react';
 import { useSearchParams } from 'next/navigation';
@@ -5,6 +6,7 @@ import { useSearchParams } from 'next/navigation';
 export default function AuthPage() {
   const { user, login, loading, isLoading } = useAuth();
+  const router = useRouter();
   const searchParams = useSearchParams();
   const redirectTo = searchParams.get('redirect') || '/';
   
@@ -12,6 +14,7 @@ export default function AuthPage() {
   const [password, setPassword] = useState('');
   const [error, setError] = useState('');
   const [success, setSuccess] = useState('');
+  const [isRedirecting, setIsRedirecting] = useState(false);
   const [step, setStep] = useState<'email' | 'password'>('email');
   const [isRegistered, setIsRegistered] = useState(true);
   const [emailError, setEmailError] = useState('');
@@ -19,6 +22,7 @@ export default function AuthPage() {
   const [confirmPasswordError, setConfirmPasswordError] = useState('');
   const [showPassword, setShowPassword] = useState(false);
   const [showConfirmPassword, setShowConfirmPassword] = useState(false);
+  const [loginSuccess, setLoginSuccess] = useState(false);
 
   // 从 URL 参数中读取 mode
   useEffect(() => {
@@ -26,6 +30,7 @@ export default function AuthPage() {
   }, [searchParams]);
 
   // 如果已登录，跳转到来源页或首页
+  // 修复：使用 loginSuccess 标志位确保在登录成功后立即跳转，不依赖 user 状态的异步更新
   useEffect(() => {
-    if (user) {
+    if (user || loginSuccess) {
       // 安全检查：redirect 必须是相对路径
       const safeRedirect = redirectTo.startsWith('/') && !redirectTo.startsWith('//')
         ? redirectTo
         : '/';
-      router.push(safeRedirect);
+      if (!isRedirecting) {
+        setIsRedirecting(true);
+        router.push(safeRedirect);
+        router.refresh();
+      }
     }
-  }, [user, router, redirectTo]);
+  }, [user, loginSuccess, redirectTo]);
 
   // 验证邮箱格式
   const validateEmail = (value: string): boolean => {
@@ -101,6 +106,7 @@ export default function AuthPage() {
     try {
       const result = await login(email, password);
       if (result.success) {
+        setLoginSuccess(true);
         setSuccess('登录成功，正在跳转...');
       } else {
         setError(getFriendlyError(result.message));
```