/**
 * HTML 内容净化工具
 * 使用 DOMPurify 防止 XSS 攻击
 */

import DOMPurify from 'dompurify';

/**
 * 客户端 DOMPurify 实例配置
 */
let purifyInstance: typeof DOMPurify | null = null;

/**
 * 获取 DOMPurify 实例（在浏览器环境中）
 */
function getPurify(): typeof DOMPurify {
  if (typeof window === 'undefined') {
    // 服务端渲染环境，返回一个安全的空函数
    return {
      sanitize: (html: string) => html,
    } as unknown as typeof DOMPurify;
  }
  
  if (!purifyInstance) {
    purifyInstance = DOMPurify;
    
    // 添加安全钩子：移除所有 on* 事件属性
    DOMPurify.addHook('uponSanitizeElement', (node) => {
      if (node instanceof Element) {
        for (const attr of Array.from(node.attributes)) {
          if (attr.name.toLowerCase().startsWith('on')) {
            node.removeAttribute(attr.name);
          }
        }
      }
    });
    
    // 添加钩子：确保链接安全
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName === 'A') {
        node.setAttribute('rel', 'noopener noreferrer');
        // 如果是外部链接，添加 target="_blank" 并确保安全
        const href = node.getAttribute('href') || '';
        if (href.startsWith('http://') || href.startsWith('https://')) {
          if (!href.includes(window.location.hostname)) {
            node.setAttribute('target', '_blank');
          }
        }
      }
    });
  }
  
  return purifyInstance;
}

/**
 * HTML 净化函数 - 使用 DOMPurify
 * 移除所有潜在的 XSS payload，包括：
 * - script 标签
 * - on* 事件处理器
 * - javascript: 协议
 * - data: 协议
 * - iframe, object, embed, form 等危险标签
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  
  const purify = getPurify();
  return purify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'span', 'div', 
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'strong', 'b', 'em', 'i', 'u', 's', 'strike',
      'ul', 'ol', 'li', 'dl', 'dt', 'dd',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'a', 'img', 'blockquote', 'pre', 'code',
      'hr', 'figure', 'figcaption'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'class', 'id', 'style',
      'target', 'rel', 'title', 'width', 'height'
    ],
    ALLOW_DATA_ATTR: false, // 不允许 data-* 属性
  });
}

/**
 * 严格净化模式 - 只允许有限的标签和属性
 */
export function sanitizeHtmlStrict(html: string): string {
  if (!html) return '';
  
  const purify = getPurify();
  return purify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a'],
    ALLOWED_ATTR: ['href'],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * 纯文本净化 - 移除所有 HTML 标签
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  
  const purify = getPurify();
  return purify.sanitize(text, {
    ALLOWED_TAGS: [], // 不允许任何标签
    ALLOWED_ATTR: [],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * URL 净化 - 确保 URL 安全
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  
  // 移除 javascript: 协议
  if (url.toLowerCase().includes('javascript:')) {
    return '';
  }
  
  // 移除 data: 协议（除了安全的 image/png, image/gif 等）
  if (url.toLowerCase().startsWith('data:')) {
    const allowedTypes = ['image/png', 'image/gif', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    const isAllowed = allowedTypes.some(type => url.toLowerCase().startsWith(`data:${type}`));
    return isAllowed ? url : '';
  }
  
  return url;
}
