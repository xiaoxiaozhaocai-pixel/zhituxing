# 上下文压缩 — 部署清单

> 创建日期：2026-06-09 | 状态：代码就绪，待部署

## 已完成

- [x] `src/lib/context-compression/types.ts` — 类型定义
- [x] `src/lib/context-compression/profile.ts` — 用户画像管理
- [x] `src/lib/context-compression/assembler.ts` — 三层上下文组装
- [x] `src/lib/context-compression/compressor.ts` — 压缩引擎
- [x] `src/lib/context-compression/index.ts` — 统一导出
- [x] `src/lib/deepseek/client.ts` — DS API 客户端
- [x] `src/lib/deepseek/prompts.ts` — Prompt 模板
- [x] `supabase/migrations/context_compression.sql` — 数据库迁移

## 需要主人操作（3 项）

### 1. Supabase SQL Editor → 执行 migration
- 文件：`supabase/migrations/context_compression.sql`
- 新增 `user_profiles` 表 + `compression_snapshots` 表
- 为 `conversations` 添加 `summary`/`summary_updated_at`/`compressed_at` 字段
- 为 `chat_history` 添加 `is_compressed` 字段

### 2. Zeabur → 部署代码
- 在 Zeabur Dashboard 触发重新部署
- 或 push 到 GitHub 触发自动部署

### 3. Zeabur → 确认 env var
- `DEEPSEEK_API_KEY` 必须存在于环境变量（压缩调用需要）

## 已对齐的现有接口
`chat/route.ts` 和 `chat-context.ts` 中已存在的调用与模块完全匹配：
- `assembleContext(convId, userId, windowSize)` ✅
- `getRecentNRounds(convId, n)` ✅
- `autoDowngradeCheck(messages)` ✅
- `needsCompression(convId)` ✅
- `compressConversation(convId, userId)` ✅

## 预期效果
- 30轮+ 对话 → Token 节省 70%+
- 月成本节省约 35%（424 → 272 元/月）
- 主对话无额外延迟（压缩异步 fire-and-forget）
