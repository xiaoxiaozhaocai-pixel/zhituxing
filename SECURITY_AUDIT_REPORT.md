# 职途星 (zhituxing) — 安全审计报告

**审计日期**：2026-06-05  
**审计范围**：Next.js 16 + React 19 + Supabase + TypeScript  
**审计方法**：静态代码分析，覆盖 89 个 API 路由、4 个 SQL 迁移、配置与认证模块  
**审计依据**：中国《网络安全法》《个人信息保护法》《数据安全法》；OWASP Top 10 2021

---

## 一、审计概览

| 严重程度 | 数量 | 说明 |
|---------|------|------|
| 🔴 严重（P0） | 6 | 上线前必须修复 |
| 🟡 中等（P1） | 7 | 尽快修复 |
| 🔵 轻微（P2） | 6 | 后续迭代修复 |

---

## 二、P0 严重问题（上线前必须修复）

---

### [P0-1] 用户权限提升 — user_type 字段可被用户自行修改

**严重程度**：严重（上线前必须修）  
**漏洞类型**：授权绕过  
**影响范围**：`/api/user/profile` PUT，所有用户的会员升级/支付流程  
**攻击场景**：攻击者登录后直接调用 PUT `/api/user/profile`，在请求体中传入 `user_type: "member"`，无需支付即可获得会员权限。

**当前代码**（`src/app/api/user/profile/route.ts` 第 87 行附近）：
```typescript
// 直接透传的字段（数据库列名和前端字段名一致）
if (body.user_type !== undefined) updateData.user_type = body.user_type;
```

**问题**：`user_type` 字段控制用户的会员身份（`free` / `member`），攻击者只需在请求体中添加 `"user_type":"member"` 即可无限期免费使用高级功能。

**修复方案**：从可写字段白名单中移除 `user_type`，会员身份仅由支付回调服务端修改。

---

### [P0-2] 管理后台 API 无认证保护

**严重程度**：严重（上线前必须修）  
**漏洞类型**：认证绕过  
**影响范围**：`/admin/api/users`, `/admin/api/content`, `/admin/api/orders`, `/admin/api/notifications`, `/admin/api/jobs/*`, `/admin/api/costs`, `/admin/api/stats`, `/admin/api/settings`, `/admin/api/rewards`, `/admin/api/recycle`, `/admin/api/sync`, `/admin/api/universities/*`, `/admin/api/export` 等 20+ 个管理路由  
**攻击场景**：攻击者无需任何认证，直接访问管理 API 获取全部用户数据、订单信息、内容管理权限。

**当前代码**（`src/app/admin/api/users/route.ts`）：
```typescript
import { getSupabaseAdmin } from '@/lib/supabase';
const supabase = getSupabaseAdmin();

export async function GET(request: NextRequest) {
  // ❌ 没有任何认证检查！
  let query = supabase.from('user_profiles').select('user_id, user_type, ...');
  // ...
}
```

**修复方案**：为所有 `admin/api/**` 路由添加统一的认证中间件，使用环境变量 `ADMIN_TOKEN` 验证管理员身份。

---

### [P0-3] SSRF — fetch-jd 端点可被滥用

**严重程度**：严重（上线前必须修）  
**漏洞类型**：SSRF（服务端请求伪造）  
**影响范围**：`/api/fetch-jd`  
**攻击场景**：攻击者构造 URL `https://internal-service.evilzhipin.com/ssrf`，由于 `isAllowedUrl` 使用 `hostname.includes(host)` 检查，`evilzhipin.com` 包含 `zhipin.com` 会通过验证。此外 `redirect: 'follow'` 允许重定向到内网地址。

**当前代码**（`src/app/api/fetch-jd/route.ts`）：
```typescript
function isAllowedUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return ALLOWED_HOSTS.some((host) => hostname.includes(host)); // ❌ 过于宽松
  } catch { return false; }
}

const res = await fetch(url, {
  redirect: 'follow',  // ❌ 跟随重定向可能进入内网
  // ...
});
```

**修复方案**：改用精确域名匹配，禁用重定向跟随，添加响应大小限制（防止 OOM）。

---

### [P0-4] 缺乏 CSRF 防护

**严重程度**：严重（上线前必须修）  
**漏洞类型**：CSRF  
**影响范围**：所有状态变更 API（POST/PUT/DELETE）  
**攻击场景**：攻击者在第三方网站嵌入表单，诱使已登录用户提交，以用户身份执行敏感操作（如修改个人信息、删除数据）。

**当前状态**：
- 无 CSRF Token 机制
- `sameSite: 'lax'` 提供部分保护，但无法防御 GET-based CSRF 和某些浏览器的绕过
- 无 `Origin` / `Referer` 请求头验证

**修复方案**：在中间件中验证 `Origin`/`Referer` 头，确保跨站 POST 请求被拦截。

---

### [P0-5] 文章创建无认证保护

**严重程度**：严重（上线前必须修）  
**漏洞类型**：认证绕过  
**影响范围**：`/api/articles` POST  
**攻击场景**：未登录用户可直接创建文章，注入垃圾内容或恶意链接。

**当前代码**（`src/app/api/articles/route.ts`）：
```typescript
export async function POST(request: NextRequest) {
  const supabase = getSupabase(); // ❌ 使用 anon key，无认证检查
  // ...
}
```

**修复方案**：添加认证检查，仅允许管理员或认证用户创建文章。

---

### [P0-6] Admin token 存储在 localStorage

**严重程度**：严重（上线前必须修）  
**漏洞类型**：凭证泄露（XSS 可利用）  
**影响范围**：`src/hooks/useAdminAuth.tsx`，管理后台所有功能  
**攻击场景**：如果应用存在 XSS 漏洞（即使是 DOM-based），攻击者可读取 `localStorage.getItem('admin_token')` 获取管理员凭证，完全接管后台。

**当前代码**（`src/hooks/useAdminAuth.tsx`）：
```typescript
const token = localStorage.getItem('admin_token');         // ❌ XSS 可读
const adminData = localStorage.getItem('admin_user');       // ❌ XSS 可读
localStorage.setItem('admin_token', token);                 // ❌ 持久化存储
```

同时，管理后台 API 不验证该 token，进一步加剧风险。

**修复方案**：使用 httpOnly Cookie 存储管理员会话，禁止 JavaScript 访问。

---

## 三、P1 中等问题（尽快修复）

---

### [P1-1] RLS 策略不完整

**严重程度**：中等  
**漏洞类型**：授权不足  
**影响范围**：所有 Supabase 数据表  
**当前状态**：
- `chat_history` / `conversations`：仅 `service_role` 有权限
- `universities` / `university_admins`：已配置 RLS（较好）
- 其他表（`user_profiles`、`articles`、`assessment_results`、`membership_orders` 等）：SQL 迁移中未见 RLS 配置

**风险**：如果 app 使用 anon key 客户端，用户可能绕过业务逻辑直接访问 API。

**修复建议**：为所有用户数据表配置 RLS 策略，确保 `authenticated` 用户只能访问自己的数据。

---

### [P1-2] 缺少安全响应头

**严重程度**：中等  
**漏洞类型**：配置缺失  
**影响范围**：所有页面  
**当前状态**：
- 无 `Content-Security-Policy` 头
- 无 `X-Frame-Options` 头（防止点击劫持）
- 无 `X-Content-Type-Options: nosniff`
- 无 `Referrer-Policy`
- 无 `Strict-Transport-Security`（HSTS）

**修复建议**：在 `next.config.ts` 或 middleware 中配置安全响应头。

---

### [P1-3] 错误信息泄露

**严重程度**：中等  
**漏洞类型**：信息泄露  
**影响范围**：多个 API 路由  
**示例**（`src/app/api/user/profile/route.ts`）：
```typescript
return NextResponse.json({ 
  code: 500, 
  error: error.message || '保存失败',  // ❌ 暴露数据库错误
  details: error                       // ❌ 暴露完整错误对象
}, { status: 500 });
```

**修复建议**：生产环境统一返回通用错误信息，仅在开发环境输出详细信息。

---

### [P1-4] 认证端点缺少速率限制

**严重程度**：中等  
**漏洞类型**：暴力攻击  
**影响范围**：`/api/auth/login`、`/api/auth/register`、`/api/auth/send-code`、`/api/auth/verify-otp`  
**当前状态**：未对登录/注册/验证码发送端点实施速率限制。

**修复建议**：对认证端点实施 IP-based 速率限制（如 5 次/分钟）。

---

### [P1-5] auth.ts 的 x-user-id fallback 风险

**严重程度**：中等  
**漏洞类型**：认证绕过  
**影响范围**：所有使用 `getAuthenticatedUser` 的 API 路由  
**当前代码**（`src/lib/auth.ts`）：
```typescript
if (process.env.NODE_ENV !== 'production') {
  const headerUserId = request.headers.get('x-user-id');
  if (headerUserId) {
    return { id: headerUserId, ... };  // ⚠️ 开发模式绕过了认证
  }
}
```

**修复建议**：移除 x-user-id fallback，或使用独立的 `DEV_BYPASS_AUTH` 环境变量明确控制，默认关闭。

---

### [P1-6] 管理员密码使用弱哈希

**严重程度**：中等  
**漏洞类型**：密码安全  
**影响范围**：管理员登录  
**当前代码**（`src/app/admin/api/auth/login/route.ts`）：
```typescript
const passwordHash = crypto
  .createHash('sha256')
  .update(password + (admin.salt || ''))
  .digest('hex');  // ❌ SHA-256 不适合密码哈希
```

**修复建议**：使用 `bcryptjs`（项目已安装）替换 SHA-256。

---

### [P1-7] cron/jd-sync 端点无认证保护

**严重程度**：中等  
**漏洞类型**：未授权访问  
**影响范围**：`/api/cron/jd-sync`  
**风险**：如果 cron 端点可被外部访问，攻击者可触发资源密集型同步任务。

**修复建议**：验证 `CRON_SECRET` 环境变量。

---

## 四、P2 轻微问题（后续迭代修）

---

### [P2-1] localStorage 存储会话数据

**严重程度**：轻微  
**影响范围**：`src/app/assistant/page.tsx`（对话缓存）、`src/lib/analytics/tracker.ts`（离线队列）  
**风险**：非敏感数据，但若存在 XSS，对话内容可被读取。  
**现状**：`useAuth.tsx` 已明确修复为不使用 localStorage 存储用户数据（✅ 良好）。

---

### [P2-2] dangerouslySetInnerHTML 使用

**严重程度**：轻微  
**影响范围**：`layout.tsx`（JSON-LD）、`faq/page.tsx`（JSON-LD）、`resources/[id]/page.tsx`、`HomeClient.tsx`  
**风险**：JSON-LD 使用 `JSON.stringify` 生成内容，理论上安全。`resources/[id]` 使用 `sanitizeHtml(renderMarkdown(...))`，已做净化（✅ 良好）。

---

### [P2-3] 请求体大小无限制

**严重程度**：轻微  
**影响范围**：多个 POST/PUT 路由  
**风险**：攻击者可发送超大 JSON body 消耗服务端内存。

**修复建议**：在 middleware 或路由层面限制请求体大小。

---

### [P2-4] .env.example 暴露 Supabase URL

**严重程度**：轻微  
**当前状态**：`.env.example` 中硬编码了 Supabase 项目 URL：`https://gpwekhlltsvoalmqzjyv.supabase.co`  
**风险**：公开了 Supabase 项目引用，方便攻击者针对性扫描。  
**修复建议**：在 `.env.example` 中使用占位符 URL。

---

### [P2-5] 隐私政策/用户协议缺失

**严重程度**：轻微  
**法律要求**：中国《个人信息保护法》第十七条、《网络安全法》第二十四条  
**当前状态**：项目有 `privacy/page.tsx` 和 `terms/page.tsx`（✅ 已有基础）。

---

### [P2-6] 第三方脚本依赖

**严重程度**：轻微  
**影响范围**：`layout.tsx` 使用 `@react-dev-inspector`  
**建议**：生产环境移除或条件加载开发工具。

---

## 五、合规检查

| 法规要求 | 状态 | 说明 |
|---------|------|------|
| 隐私政策 | ✅ 已具备 | `src/app/privacy/page.tsx` |
| 用户协议 | ✅ 已具备 | `src/app/terms/page.tsx` |
| Cookie 同意 | ✅ 已具备 | `CookieConsent` 组件 |
| 数据删除入口 | ⚠️ 待确认 | 需检查是否有删除账号功能 |
| ICP 备案 | ⚠️ 待确认 | 生产环境需检查 |

---

## 六、修复优先级汇总

| 编号 | 问题 | 严重程度 | 修复预计工时 |
|------|------|---------|------------|
| P0-1 | user_type 权限提升 | 🔴 严重 | 5 min |
| P0-2 | 管理后台 API 无认证 | 🔴 严重 | 30 min |
| P0-3 | fetch-jd SSRF | 🔴 严重 | 10 min |
| P0-4 | CSRF 防护缺失 | 🔴 严重 | 20 min |
| P0-5 | 文章创建无认证 | 🔴 严重 | 5 min |
| P0-6 | Admin token 在 localStorage | 🔴 严重 | 15 min |
| P1-1 | RLS 策略不完整 | 🟡 中等 | 60 min |
| P1-2 | 安全响应头缺失 | 🟡 中等 | 15 min |
| P1-3 | 错误信息泄露 | 🟡 中等 | 30 min |
| P1-4 | 认证端点无速率限制 | 🟡 中等 | 20 min |
| P1-5 | x-user-id fallback | 🟡 中等 | 5 min |
| P1-6 | 弱密码哈希 | 🟡 中等 | 10 min |
| P1-7 | cron 端点无认证 | 🟡 中等 | 5 min |

---

*报告由 AI 安全审计专家生成，建议人工复核后执行修复。*
