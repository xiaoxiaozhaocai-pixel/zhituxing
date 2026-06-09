/**
 * 上下文压缩模块 — 类型定义
 */

/** 用户画像锚定 */
export interface UserProfile {
  user_name: string | null;
  school: string | null;
  major: string | null;
  grade: string | null;
  target_industry: string | null;
  target_position: string | null;
  job_hunting_stage: string | null;
  skills: string[];
  key_projects: string[];
  key_preferences: string[];
}

/** 压缩后的会话摘要 */
export interface ConversationSummary {
  session_summary: string;
  completed_items: string[];
  pending_items: string[];
  user_feedback: string;
  key_decisions: string[];
  extracted_keywords: string[];
}

/** 压缩快照记录 */
export interface CompressionSnapshot {
  id?: string;
  conversation_id: string;
  compressed_message_ids: string[];
  summary_content: string;
  compressed_token_count: number;
  summary_token_count: number;
  compression_ratio: number;
  compression_model: string;
  trigger_type: 'round' | 'token' | 'manual';
  created_at?: string;
}

/** assembleContext 返回结果 */
export interface AssembledContext {
  /** 完整上下文文本（注入到 system prompt） */
  fullContextText: string;
  /** 近期原文消息（注入到 messages 数组） */
  recentMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  /** 当前摘要，null 表示无摘要 */
  summary: string | null;
  /** 是否需要触发压缩 */
  shouldCompress: boolean;
}

/** 压缩触发配置 */
export interface CompressionConfig {
  /** 未压缩消息数阈值（触发压缩的最小未压缩消息条数） */
  minUncompressedCount: number;
  /** 窗口大小（保留最近 N 条原文消息） */
  windowSize: number;
  /** 压缩模型 */
  compressionModel: string;
}
