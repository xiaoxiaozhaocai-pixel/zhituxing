/**
 * 项目通用类型定义
 */
import type { User } from '@supabase/supabase-js';

// Re-export Supabase User type
export type { User };

// ============================================================
// 数据库记录类型
// ============================================================

/** JD 岗位记录 */
export interface JobRecord {
  id: string;
  job_title: string;
  company?: string;
  industry?: string;
  city?: string;
  salary_range?: string;
  source_platform?: string;
  created_at?: string;
  hard_skills?: string[] | string;
  soft_skills?: string[] | string;
  education?: string;
  experience?: string;
  fresh_graduate_friendly?: boolean;
  responsibilities?: string;
  core_duty_module?: string;
  major_require?: string;
  bonus_skill_cert?: string;
  post_category?: string;
  graduate_friendly_level?: string;
  competency_weights?: unknown;
  status?: string;
  [key: string]: unknown;
}

/** 用户画像 */
export interface UserProfile {
  id?: string;
  username?: string;
  phone?: string;
  email?: string;
  nickname?: string;
  is_member?: boolean;
  is_lifetime_member?: boolean;
  member_expire_time?: string;
  profile_completed?: boolean;
  major?: string;
  grade?: string;
  graduation_year?: string;
  target_city?: string[];
  target_industry?: string[];
  skills?: unknown[];
  hard_skills?: string[];
  soft_skills?: string[];
  job_intention?: string;
  personality_type?: string;
  created_at?: string;
  membership_type?: string;
  membership_plan?: string;
  user_type?: string;
  [key: string]: unknown;
}

/** 订单 */
export interface OrderRecord {
  id: string;
  user_id: string;
  product_type: string;
  amount: number;
  status: string;
  created_at?: string;
}

/** 文章 */
export interface ArticleRecord {
  id: string;
  title: string;
  category?: string;
  tags?: string;
  views?: number;
  created_at?: string;
}

/** 系统设置项 */
export interface SettingItem {
  key: string;
  value: string;
}

// ============================================================
// 通用工具类型
// ============================================================

/** 聊天消息 */
export interface ChatMessage {
  role: string;
  content: string;
}

/** 缓存条目 */
export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
}

/** 修复步骤 */
export interface FixStep {
  step: string;
  [key: string]: unknown;
}

/** 诊断测试结果 */
export interface TestResult {
  name: string;
  status: number;
  result: 'pass' | 'fail' | 'warn';
  detail: string;
}

/** JD 导入项 */
export interface JdImportItem {
  job_name: string;
  company_name: string;
  city: string;
  salary_range?: string | null;
  industry?: string | null;
  job_description?: string | null;
  is_fresh_friendly?: boolean;
  source?: string;
}
