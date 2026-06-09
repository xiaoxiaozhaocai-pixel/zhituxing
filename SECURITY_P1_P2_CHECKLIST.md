# 安全审计 P1 + P2 修复清单

> 审计日期：2026-06-09
> 基于：2026-05-17 安全审计报告 + P0 修复记录（commit `d56a63f`）
> P0 6项：✅ 已完成 | P1 7项：🔧 进行中 | P2 6项：📋 待确认

---

## P1 修复项（7项）

| # | 问题 | 状态 | 修复方案 |
|---|------|------|---------|
| P1-1 | RLS 策略不完整 | 🔧 | 执行 `p1_rls_fix.sql` |
| P1-2 | 安全响应头缺失 | 🔧 | 已创建 `security-headers.ts` + middleware.ts |
| P1-3 | 错误信息泄露 | ✅ | API contracts `_shared.ts` 已有 `jsonError`/`ErrorCode` |
| P1-4 | 认证端点无速率限制 | 🔧 | 已创建 `rate-limit.ts`，需接入 route.ts |
| P1-5 | x-user-id fallback | ✅ | `coze/auth.ts` 已改为 JWT token 验证 |
| P1-6 | 弱密码哈希(SHA256) | 📋 | Supabase Auth 管理，需确认 Dashboard 设置 |
| P1-7 | cron 端点无认证 | ✅ | 架构归位后无独立 cron 端点 |

---

## 需主人操作的 3 件事

### 1. Supabase Dashboard
- [ ] Authentication > Settings > 确认密码哈希使用 `bcrypt`（非 SHA256）
- [ ] API Settings > CORS → 将 `*` 改为仅允许 `https://zhituxing.tech` + `https://code.coze.cn`
- [ ] SQL Editor → 执行 `supabase/migrations/p1_rls_fix.sql`

### 2. 安全响应头（代码部署后验证）
```bash
curl -I https://zhituxing.tech | grep -i "content-security-policy\|x-frame-options\|x-content-type"
```
预期看到 CSP、X-Frame-Options、X-Content-Type-Options 等头。

### 3. 合规文档（P2）
- [ ] 创建 `/privacy` 隐私政策页面
- [ ] 创建 `/terms` 用户协议页面
- [ ] 注册流程添加隐私政策同意勾选
- [ ] 页脚添加 ICP 备案号

---

## P2 待确认（6项）

| # | 问题 | 状态 | 说明 |
|---|------|------|------|
| P2-1 | dangerouslySetInnerHTML | 📋 | 全局搜索仅 `assistant/page.tsx` 使用，需 review |
| P2-2 | localStorage 敏感信息 | 📋 | Admin token 已迁 httpOnly cookie，但需确认清理干净 |
| P2-3 | 输入长度校验 | ✅ | Zod schema 已在 API contracts 中覆盖 |
| P2-4 | Prompt 注入防护 | ✅ | `injection-detect.ts` 已部署 |
| P2-5 | RPC SECURITY DEFINER | 📋 | `p1_rls_fix.sql` 中有注释处理方案 |
| P2-6 | SUPABASE_SERVICE_ROLE_KEY 前端暴露 | ⚠️ | `sse.ts` 中使用 `SUPABASE_SERVICE_ROLE_KEY`，但该文件仅服务端执行，确认 `'use server'` 标记 |

---

## 新增安全文件

| 文件 | 用途 |
|------|------|
| `src/lib/rate-limit.ts` | 内存级速率限制（auth 5/min, chat 10/min, API 30/min, global 100/min） |
| `src/lib/security-headers.ts` | CSP + X-Frame-Options + 安全响应头配置 |
| `supabase/migrations/p1_rls_fix.sql` | RLS 策略补全 + DELETE 策略 + search_path 修复 |

## 部署后验证

```bash
# 1. 安全响应头
curl -I https://zhituxing.tech

# 2. 速率限制
for i in $(seq 1 12); do
  curl -s -o /dev/null -w "%{http_code}" https://zhituxing.tech/api/chat \
    -H "Content-Type: application/json" \
    -d '{"message":"test"}'
  echo " - request $i"
done
# 预期：前10次 200/401，第11次起 429

# 3. RLS 验证
# 在 Supabase SQL Editor 执行：
SELECT tablename, rowsecurity, 
  (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) 
FROM pg_tables WHERE schemaname = 'public';
# 预期：所有表 rowsecurity = true，policy_count ≥ 1
```
