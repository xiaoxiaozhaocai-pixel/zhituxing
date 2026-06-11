/**
 * 会员权益配置 — 会员体系 v2 单文件真相源
 * 
 * 原则：
 * - 基础功能（对话/岗位浏览）始终免费，不在此配置
 * - 深度功能（简历优化/胜任力等）按 tier 控制
 * - 免费用户有试用配额，会员无限
 */

import type { FeatureType } from '@/lib/quota';

export type MembershipTier = 'free' | 'monthly' | 'annual' | 'lifetime';

/** tier 层级数值，用于比较"至少达到某级" */
export const TIER_LEVEL: Record<MembershipTier, number> = {
  free: 0,
  monthly: 1,
  annual: 2,
  lifetime: 3,
};

export interface FeaturePermission {
  /** 最低需要的 tier */
  minTier: MembershipTier;
  /** 免费用户试用次数（-1=无限），会员始终无限 */
  freeQuota: number;
  /** 功能描述 */
  label: string;
}

/** 各功能对应的会员权益要求 */
export const MembershipPermissions: Record<FeatureType, FeaturePermission> = {
  career_planning: { minTier: 'free', freeQuota: -1, label: '职业规划' },
  interview:       { minTier: 'free', freeQuota: 3,  label: 'AI模拟面试' },
  assessment:      { minTier: 'free', freeQuota: 5,  label: '能力测评' },
  competency:      { minTier: 'monthly', freeQuota: 0, label: '胜任力分析' },
  decision:        { minTier: 'free', freeQuota: 3,  label: '求职决策' },
  resume_optimize: { minTier: 'monthly', freeQuota: 0, label: '简历优化' },
};

/**
 * 判断用户 tier 是否满足某功能的最低要求
 */
export function tierMeetsMinimum(userTier: MembershipTier, minTier: MembershipTier): boolean {
  return TIER_LEVEL[userTier] >= TIER_LEVEL[minTier];
}

/**
 * tier 对应的展示文案
 */
export const TIER_LABELS: Record<MembershipTier, string> = {
  free: '免费用户',
  monthly: '月度会员',
  annual: '年度会员',
  lifetime: '终身会员',
};

/**
 * tier 对应的营销引导文案
 */
export const TIER_UPSELL: Record<MembershipTier, string> = {
  free: '开通会员，解锁全部深度功能',
  monthly: '升级年度会员，立省 ¥39.9',
  annual: '升级终身会员，一次付费永久使用',
  lifetime: '您已是最高等级会员',
};
