/**
 * Coze 智能体公共模块（Barrel Re-export）
 * 
 * 拆分结构：
 *   coze/auth.ts    — 用户验证
 *   coze/context.ts — 用户个人信息上下文构建
 *   coze/config.ts  — 智能体 API 配置映射
 *   coze/api.ts     — API 调用（Workflow SSE + Coze v3）
 *   coze/sse.ts     — SSE 流解析（含结构化数据提取）
 *   coze/text.ts    — 纯文本流（fallback）
 */

export { getUserInfoFromRequest, type UserInfo } from './coze/auth';
export { getUserProfileContext } from './coze/context';
export { getWorkflowConfig } from './coze/config';
export { callWorkflowStreamApi, callCozeStreamApi } from './coze/api';
export { createWorkflowSSEStream, createCozeSSEStream } from './coze/sse';
export { createTextStream } from './coze/text';
