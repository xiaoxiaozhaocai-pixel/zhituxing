/**
 * /api/career-planning/stream Zod 契约
 *
 * 端点：POST /api/career-planning/stream（SSE 流，text/event-stream）
 *
 * 前端调用方：
 *   - src/app/career-planning/page.tsx 行 186
 *
 * 设计说明：
 *   - 该 route 不强制鉴权（匿名也能用 fallback），无早期 401
 *   - 唯一的早期错误是 JSON parse 失败 / 入参形状错误 → 走 jsonError(INVALID_REQUEST)
 *   - 流开始后的 Coze/Workflow/DeepSeek 异常一律降级到 fallback createTextStream，
 *     用户感知是"降级回答"而非"报错"，不在本契约范围
 *
 * SSE 事件格式（仅记录，不在 zod 契约内强制；流开始后写入，已脱离响应契约）：
 *   - Coze/Workflow 路径：`data: {"type":"text","content":"..."}\n\n`
 *                        `data: {"type":"done"}\n\n`
 *                        `event: structured_data\ndata: {...}\n\n`
 *   - DeepSeek 路径   ：`data: {"choices":[{"delta":{"content":"..."}}]}\n\n`
 *                        `data: [DONE]\n\n`
 *     ⚠️ DeepSeek 路径与前端 page.tsx 解析格式不一致，是已知 dead bug
 *     （当 DEEPSEEK_ENABLED=true 时前端永远空白），需后续统一格式或修前端
 */
import { z } from 'zod';

/** POST 请求体 — 全部字段都可选，未填走 fallback 模板 */
export const CareerPlanningStreamRequestSchema = z.object({
  major: z.string().optional(),
  grade: z.string().optional(),
  city: z.string().optional(),
  message: z.string().optional(),
  conversationId: z.string().optional(),
  /** 前端透传字段，route 不直接使用，由 userContext 注入 prompt */
  skills: z.string().optional(),
  personality: z.string().optional(),
  workExperience: z.string().optional(),
  awards: z.string().optional(),
});
export type CareerPlanningStreamRequest = z.infer<typeof CareerPlanningStreamRequestSchema>;
