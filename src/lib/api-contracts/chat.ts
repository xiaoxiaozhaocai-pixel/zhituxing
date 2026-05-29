/**
 * /api/chat Zod 契约
 *
 * 端点：POST /api/chat（SSE 流，text/event-stream）
 *
 * 前端调用方（3 处）：
 *   - src/app/test-e2e/page.tsx 行 35  （只看 ok / 流内容，不解析错误码）
 *   - src/app/decision/page.tsx 行 97  （旧代码读 data.message 判 403 配额，本轮统一改契约）
 *   - src/app/assistant/page.tsx 行 538（apiUrl 变量；旧代码读 data.error==='quota_exceeded' 判 403 配额）
 *
 * 设计说明：
 *   - 早期错误（流开始前）一律走 jsonError：
 *       · 未登录                → UNAUTHORIZED (401)
 *       · 请求体 JSON 错误     → INVALID_REQUEST (400)
 *       · 配额耗尽              → QUOTA_EXCEEDED (429)  ← P0 dead bug 修复点
 *         原响应 { error:'quota_exceeded', message } (403) 与契约格式不一致，
 *         assistant/page.tsx 与 decision/page.tsx 旧字段判定已同步改造
 *   - 流开始后的错误（已 200 + text/event-stream）维持原有降级到 fallback createTextStream
 *     /injection createBlockedSSE 设计不动，前端体感是「降级回答」而非「报错」
 *
 * SSE 事件 payload 格式（仅记录，不在 zod 契约内强制）：
 *   - Coze/Workflow 路径：`data: {"type":"text","content":"..."}\n\n`
 *                        `data: {"type":"done"}\n\n`
 *                        `event: structured_data\ndata: {...}\n\n`
 *                        `event: conversation_id\ndata: {...}\n\n`
 *   - DeepSeek 路径   ：`data: {"choices":[{"delta":{"content":"..."}}]}\n\n`
 *                        `data: [DONE]\n\n`
 *                        额外：`event: conversation_id`、`event: debug`、`event: save_result`
 *     ⚠️ DeepSeek 与 Coze 输出 chunk 格式不统一：assistant/page.tsx 同时识别两种格式，
 *        decision/page.tsx 只识别 {type:'text'} ⇒ 当 DEEPSEEK_ENABLED=true 时 decision 走 DeepSeek 会空白
 *        该 dead bug 涉及 SSE event payload 改造，已记录、本轮契约层暂不修
 */
import { z } from 'zod';

/**
 * POST 请求体
 *
 * 注意：botType 业务上有 'jobs' | 'interview' | 'decision' | 'career' | 'assessment' | 'competency'
 * 但 route 内已对未知 botType fallback 到 'career'，为兼容历史调用此处用宽松的 string。
 */
export const ChatRequestSchema = z.object({
  message: z.string(),  // 空串/超长由 route 内安全检查走友好提示 SSE，不在 zod 层拦截
  botType: z.string().optional(),
  conversationId: z.string().nullable().optional(),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
