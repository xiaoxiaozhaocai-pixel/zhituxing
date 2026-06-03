# API 契约层 (src/lib/api-contracts)

## 为什么需要

5/27-5/28 一周内出现 6+ 次"字段名错配" bug：

- BUG-1：`/api/match` GET 返字段 `matches`，前端读 `data` → 学习路径页死循环空
- `skill-portrait` 读 `data.data?.jobs` 嵌套，`/api/jobs` 从未返过 → 热门岗位永远空
- `profile/info` 读 `data.code === 200`，根本没 `code` 字段 → jobOptions 永远空
- `ProfileGuideProvider` 读 `data.code === 200 && data.data?.id` → 引导永远走未登录分支

根因：**响应字段隐式约定，靠记忆维护**。本目录用 Zod 把这些约定显式化、可校验。

## 核心规则

1. **所有 API 响应必须走 `jsonOk(schema, data)` / `jsonError(code, msg)`**，禁止裸 `NextResponse.json`
2. **响应体统一格式**：
   - 成功 `{ ok: true, data: T }`
   - 失败 `{ ok: false, error: { code: ErrorCode, message: string, details?: unknown } }`
3. **前端硬编码 `ErrorCode` 常量做错误分支**，禁止靠 `message` 字符串匹配
4. **dev 校验失败抛错**（逼修字段），**prod 只 warn**（不让小错配 5xx）

## 文件结构

```
src/lib/api-contracts/
├── _shared.ts          # 基建：ErrorCode / jsonOk / jsonError / parseRequestBody
├── auth.ts             # /api/auth/me 等
├── match.ts            # /api/match POST + GET
├── jobs.ts             # /api/jobs
└── README.md           # 本文件
```

## 接入流程（每个 API 必走 4 步）

### Step 1：定义 schema（在对应业务文件里）

```ts
// src/lib/api-contracts/quota.ts
import { z } from 'zod';

export const QuotaDataSchema = z.object({
  used: z.number().int(),
  limit: z.number().int(),
  resetAt: z.string().datetime().nullable(),
});
export type QuotaData = z.infer<typeof QuotaDataSchema>;

// 如果是 POST：请求体也定义
export const QuotaConsumeRequestSchema = z.object({
  type: z.enum(['chat', 'interview', 'plan']),
  count: z.number().int().min(1).default(1),
});
```

### Step 2：route.ts 用契约

```ts
import { jsonOk, jsonError, parseRequestBody } from '@/lib/api-contracts/_shared';
import { QuotaDataSchema, QuotaConsumeRequestSchema, type QuotaData } from '@/lib/api-contracts/quota';

export async function GET(request: Request) {
  // 认证失败用 jsonError
  if (!user) return jsonError('UNAUTHORIZED', '请先登录');

  // 业务...
  const data: QuotaData = { used, limit, resetAt };
  return jsonOk(QuotaDataSchema, data);
}

export async function POST(request: Request) {
  // 请求体校验
  const parsed = await parseRequestBody(request, QuotaConsumeRequestSchema);
  if (!parsed.ok) return parsed.response;
  const { type, count } = parsed.data;

  // ...
  return jsonOk(QuotaDataSchema, newData);
}
```

### Step 3：调用方改读法

```ts
// 旧（散乱）
const resp = await fetch('/api/quota');
const data = await resp.json();
if (data.success) { /* ... */ }

// 新（契约）
const resp = await fetch('/api/quota');
const data = await resp.json();
if (data.ok) {
  // data.data 即 QuotaData 类型
  setUsed(data.data.used);
} else {
  // data.error 即 { code, message }
  if (data.error.code === 'UNAUTHORIZED') { /* ... */ }
}
```

### Step 4：跑 `npx tsc --noEmit`

类型错误必修。无类型错误后再 commit。

## 错误码速查

| 场景 | code | http |
|------|------|------|
| 未登录 | UNAUTHORIZED | 401 |
| token 过期 | TOKEN_EXPIRED | 401 |
| 无权限 | FORBIDDEN | 403 |
| 请求体格式错误 | INVALID_REQUEST | 400 |
| 必填字段缺失 | MISSING_FIELD | 400 |
| 资源不存在 | NOT_FOUND | 404 |
| 资源已存在 | ALREADY_EXISTS | 409 |
| 限流 | RATE_LIMITED | 429 |
| 配额耗尽 | QUOTA_EXCEEDED | 429 |
| 通用业务异常 | BUSINESS_ERROR | 400 |
| 服务器内部错误 | INTERNAL_ERROR | 500 |
| 上游异常（Coze/Supabase） | UPSTREAM_ERROR | 502 |

## 迁移进度

| API | 状态 | commit |
|-----|------|--------|
| /api/auth/me | ✅ 已契约化 | (本次) |
| /api/match POST | ✅ 已契约化 | (本次) |
| /api/match GET | ✅ 已契约化 | (本次) |
| /api/jobs | ✅ 已契约化 | (本次) |
| /api/membership | ✅ 已契约化（阶段 2.1） | 0f4e934 |
| /api/quota | ✅ 已契约化（阶段 2.1） | 0f4e934 |
| /api/search-jd | ✅ 已契约化（阶段 2.2，SSE 首接） | b32bb9f |
| /api/career-planning/stream | ✅ 已契约化（阶段 2.3，SSE） | (本次) |
| /api/chat | ✅ 已契约化（阶段 2.3，SSE） | (本次) |
| 其他 91 个 | ⏳ 阶段 3（Trae 批量） | - |

## SSE 流式响应特殊处理（阶段 2 设计）

SSE endpoint（chat / stream / search-jd）的响应不是单个 JSON，是事件流。契约化策略：

- **HTTP 错误响应**仍走 `jsonError`（如认证失败、quota 耗尽返回 4xx JSON）
- **SSE 事件 payload** 定义独立 schema（如 ChatTokenEventSchema / ChatDoneEventSchema），前端 EventSource 解析后用 schema.parse 校验

## 改造完即时收益（本次发现的 dead bug）

1. `ProfileGuideProvider`：读 `userData.code === 200`，从来没工作过的"未登录引导"
2. `learning-path/page`：读 `matchData.data`，学习路径页对真实匹配数据从未工作
3. `skill-portrait/page`：读 `data.data?.jobs`，热门岗位展示从未工作
4. `profile/info/page`：读 `data.code === 200 && data.data?.jobs`，jobOptions 永远空

## 维护

- 主人：肖赵才
- 维护：小扣（Agent 架构师）
- 初版：2026-05-29

