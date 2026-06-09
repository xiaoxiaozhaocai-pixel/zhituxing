/**
 * 上下文压缩模块 — 统一导出
 * 
 * 提供三层混合上下文压缩：
 *   assembleContext    — 组装画像+摘要+原文三层上下文
 *   getRecentNRounds   — 窗口截断模式（降级方案）
 *   autoDowngradeCheck — 检测是否需降级到 window 模式
 *   needsCompression   — 判断是否需要触发压缩
 *   compressConversation — 执行增量摘要压缩
 */

export { assembleContext, getRecentNRounds, autoDowngradeCheck } from './assembler';
export { needsCompression, compressConversation } from './compressor';
export { getUserProfile, updateUserProfile } from './profile';
export type {
  UserProfile,
  ConversationSummary,
  CompressionSnapshot,
  AssembledContext,
} from './types';
