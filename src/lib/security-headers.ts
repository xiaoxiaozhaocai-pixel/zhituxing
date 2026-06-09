/**
 * HTTP 安全响应头配置
 * P1 修复：CSP + X-Frame-Options + 安全头
 */

const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https: blob:;
  font-src 'self' data:;
  connect-src 'self' 
    https://gpwekhlltsvoalmqzjyv.supabase.co 
    https://api.coze.cn 
    https://api.coze.com
    https://*.coze.site
    https://ark.cn-beijing.volces.com;
  frame-src 'self' https://*.coze.cn;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, ' ').trim();

export const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': ContentSecurityPolicy,
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

/** 仅应用于 HTML 页面的头（CSP 对 API 无意义） */
export const HTML_SECURITY_HEADERS = SECURITY_HEADERS;

/** 应用于所有响应的最小安全头（不含 CSP，避免干扰 API） */
export const API_SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};
