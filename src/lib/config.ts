/**
 * 网站配置
 * 统一管理站点URL等配置，避免硬编码
 */

// 网站基础URL - 用于sitemap、canonical、JSON-LD等
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://zhituxing.tech";

// 网站名称
export const SITE_NAME = "职途星";

// 网站描述
export const SITE_DESCRIPTION = "懂桂电学生的AI朋友——小职，陪你走好求职每一步";

// ----- 价格配置（统一管理，避免硬编码散落） -----

// 会员价格（单位：元）
export const MEMBERSHIP_MONTHLY_PRICE = 9.9;   // 月度会员
export const MEMBERSHIP_SEMESTER_PRICE = 29.9; // 学期会员
export const MEMBERSHIP_YEARLY_PRICE = 69.9;   // 年度会员
export const MEMBERSHIP_LIFETIME_PRICE = 199;  // 永久会员

// 会员价格文案（用户可见）
export const MEMBERSHIP_PRICE_TEXT = "9.9元";
export const MEMBERSHIP_MONTHLY_PRICE_TEXT = "9.9元/月";

// 候选人解锁价（单位：元/条）
export const CANDIDATE_UNLOCK_PRICE = 10;
export const CANDIDATE_UNLOCK_PRICE_TEXT = "¥10/条";
