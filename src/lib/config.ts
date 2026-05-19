/**
 * 网站配置
 * 统一管理站点URL等配置，避免硬编码
 */

// 网站基础URL - 用于sitemap、canonical、JSON-LD等
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://t498zk3cs9.coze.site";

// 网站名称
export const SITE_NAME = "职途星";

// 网站描述
export const SITE_DESCRIPTION = "AI职业规划与模拟面试平台，大学生一站式求职服务";
