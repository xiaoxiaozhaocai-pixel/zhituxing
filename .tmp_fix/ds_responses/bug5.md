我先回答你的问题：

## 1. grep 结果

根据代码分析，`createDeepSeekSSEStream` 和 `createDeepSeekRAGStream` 的使用情况：

- `createDeepSeekSSEStream`：只在 `src/lib/deepseek-chat.ts` 中定义，被 `createDeepSeekRAGStream` 调用
- `createDeepSeekRAGStream`：在 `src/lib/rag-utils.ts` 中定义，被 `career-planning/stream/route.ts` 调用

所以只有 `career-planning/stream/route.ts` 这一个路由使用了这些函数。

## 2. 方案选择

**选择方案 A**：修改 `createDeepSeekSSEStream` 输出 Coze 兼容格式。

理由：
- 只有一个调用方（`career-planning/stream/route.ts`），影响范围可控
- 一次修改，所有使用该函数的代码自动兼容
- 如果将来有其他路由使用，不需要重复转换
- 修改点集中，易于维护

## 3. Unified diff 补丁

```diff
--- a/src/lib/deepseek-chat.ts
+++ b/src/lib/deepseek-chat.ts
@@ -1,3 +1,4 @@
+
 /**
  * DeepSeek 流式聊天封装
  * 用于智能体迁移：替代Coze Bot，使用DeepSeek API + 本地RAG
@@ -120,6 +121,7 @@ export function createDeepSeekSSEStream(options: DeepSeekStreamOptions): Readabl
   const encoder = new TextEncoder();
 
   return new ReadableStream({
+    // 修改：将 OpenAI 格式的 SSE chunk 转换为 Coze 兼容格式，使前端能正确解析 text/done/error 类型
     async start(controller) {
       try {
         await deepSeekChat({
@@ -127,16 +129,22 @@ export function createDeepSeekSSEStream(options: DeepSeekStreamOptions): Readabl
           onChunk: (chunk) => {
             const data = JSON.stringify({
-              choices: [{ delta: { content: chunk } }],
+              type: 'text',
+              content: chunk,
             });
             controller.enqueue(encoder.encode(`data: ${data}\n\n`));
           },
         });
-        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
+        // 修改：将 [DONE] 标记改为 Coze 兼容的 done 类型
+        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
         controller.close();
       } catch (error) {
         const errMsg = error instanceof Error ? error.message : 'Unknown error';
-        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`));
+        // 修改：将错误格式改为 Coze 兼容的 error 类型
+        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
+          type: 'error',
+          message: errMsg,
+        })}\n\n`));
         controller.close();
       }
     },
```

## 4. 覆盖说明

补丁覆盖了三种 chunk 类型：
- **text**：`data: {"type":"text","content":"..."}\n\n`
- **done**：`data: {"type":"done"}\n\n`
- **error**：`data: {"type":"error","message":"..."}\n\n`

关于 `structured_data` 类型：当前 `createDeepSeekSSEStream` 没有发送结构化数据的逻辑，所以不需要添加。如果将来需要，可以在 `onChunk` 回调中增加判断逻辑。