/**
 * /api/search-jd Zod 契约
 *
 * 端点：
 * - GET  /api/search-jd?query=xxx
 *        ⚠️ 外部接口：供 Coze 智能体作为 OpenAPI Tool 调用。
 *        响应结构 { code, result } **不可改动**（破坏会断对接），
 *        本契约仅做形状约束 + 入参校验。
 * - POST /api/search-jd
 *        前端「职搭子」智能体入口，返回 SSE 流（text/event-stream）。
 *        本契约仅校验请求体 + 流开始前的早期错误响应；流本身的 event payload
 *        由 src/lib/coze-stream.ts 统一定义，不在本契约范围内。
 *
 * SSE 错误响应惯例（流开始前 vs 流开始后）：
 *   - 流开始前的错误（鉴权 / 入参 / 初始化失败）→ 走 jsonError + HTTP 4xx/5xx
 *   - 流开始后的错误（已 200 + text/event-stream） → 写入 SSE event（不再走 jsonError）
 *     search-jd 设计良好：所有上游错误自动 fallback 到数据库结果的 createTextStream，
 *     用户感知是「降级回答」而非「报错」，不需要 SSE 错误事件
 */
import { z } from 'zod';

/** GET 外部智能体接口入参 */
export const SearchJdGetQuerySchema = z.object({
  /** query 或 keyword 任意其一 */
  query: z.string().optional(),
  keyword: z.string().optional(),
});
export type SearchJdGetQuery = z.infer<typeof SearchJdGetQuerySchema>;

/** GET 外部智能体接口响应（不可改动结构，仅形状约束） */
export const SearchJdGetResponseSchema = z.object({
  /** 0 = 正常，1 = 服务异常 */
  code: z.number(),
  /** 格式化的文本结果（直接喂给智能体当 tool result） */
  result: z.string(),
});
export type SearchJdGetResponse = z.infer<typeof SearchJdGetResponseSchema>;

/** POST 前端调用入参 */
export const SearchJdPostRequestSchema = z.object({
  message: z.string().min(1, '搜索内容不能为空'),
  conversationId: z.string().optional(),
});
export type SearchJdPostRequest = z.infer<typeof SearchJdPostRequestSchema>;
