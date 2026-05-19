/**
 * HTML 内容净化工具
 * 用于防止 XSS 攻击
 */

/**
 * 基础 HTML 净化函数
 * 移除 script 标签和危险的事件处理器
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  
  return html
    // 移除 script 标签及其内容
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // 移除 on* 事件处理器 (onclick, onload, onerror 等)
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    // 移除 javascript: 协议
    .replace(/javascript:/gi, '')
    // 移除 data: 协议（可能用于恶意 payload）
    .replace(/data:\s*text\/html/gi, '')
    // 移除 iframe 标签
    .replace(/<iframe\b[^>]*>.*?<\/iframe>/gi, '')
    // 移除 object 和 embed 标签
    .replace(/<object\b[^>]*>.*?<\/object>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
    // 移除 form 标签（防止表单劫持）
    .replace(/<form\b[^>]*>.*?<\/form>/gi, '');
}

/**
 * 允许的 HTML 标签白名单
 * 用于更严格的净化
 */
const ALLOWED_TAGS = [
  'p', 'br', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u', 's', 'strike',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'a', 'img', 'blockquote', 'pre', 'code',
  'hr', 'figure', 'figcaption'
].join('|');

/**
 * 严格净化模式
 * 只保留白名单中的标签
 */
export function sanitizeHtmlStrict(html: string): string {
  // 先执行基础净化
  let sanitized = sanitizeHtml(html);
  
  // 移除不在白名单中的标签
  const tagRegex = new RegExp(`<(/?)(?!${ALLOWED_TAGS}|!--)[a-z][a-z0-9]*\\b[^>]*>`, 'gi');
  sanitized = sanitized.replace(tagRegex, '');
  
  return sanitized;
}
