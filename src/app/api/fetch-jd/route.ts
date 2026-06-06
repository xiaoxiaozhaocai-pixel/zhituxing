export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_HOSTS = [
  'zhipin.com',
  'bosszhipin.com',
  'www.zhipin.com',
  'www.lagou.com',
  'lapin.com',
  'www.liepin.com',
  'liepin.com',
  'shixiseng.com',
  'www.shixiseng.com',
  '58.com',
  'www.58.com',
  'zhilian.com',
  'www.zhaopin.com',
  'zhaopin.com',
  'tencent.com',
  'job.toutiao.com',
  'xiaohongshu.com',
];

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // 安全修复 P0-3：仅允许 https 协议，防止 SSRF
    if (parsed.protocol !== 'https:') return false;
    const hostname = parsed.hostname;
    // 安全修复 P0-3：精确域名匹配，不再使用 includes（防止 evil-zhipin.com 绕过）
    return ALLOWED_HOSTS.some((host) => hostname === host || hostname.endsWith('.' + host));
  } catch {
    return false;
  }
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1]!.trim() : '';
}

function extractText(html: string): string {
  // 移除 script/style 标签
  const cleaned = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"');
  // 压缩空白
  return cleaned
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join('\n');
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { code: 400, message: '请提供有效的链接地址' },
        { status: 400 }
      );
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { code: 400, message: '链接格式不正确' },
        { status: 400 }
      );
    }

    if (!isAllowedUrl(url)) {
      return NextResponse.json({
        code: 200,
        success: true,
        data: { content: '', title: '', url },
        message: '暂不支持该招聘平台，建议手动粘贴岗位描述',
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      // 安全修复 P0-3：禁止跟随重定向，防止 SSRF 到内网地址
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
        redirect: 'manual',
      });

      clearTimeout(timeout);

      if (!res.ok) {
        return NextResponse.json({
          code: 200,
          success: false,
          data: { content: '', title: '', url },
          message: '该链接无法自动解析，请手动粘贴岗位描述',
        });
      }

      const html = await res.text();
      // 安全修复 P0-3：限制响应大小，防止 OOM
      if (html.length > 500000) {
        return NextResponse.json({
          code: 200,
          success: false,
          data: { content: '', title: '', url },
          message: '页面内容过大，无法解析',
        });
      }
      const title = extractTitle(html);
      const textContent = extractText(html);

      if (textContent.length < 100) {
        return NextResponse.json({
          code: 200,
          success: true,
          data: { content: textContent, title, url },
          message: '该链接无法自动解析，请手动粘贴岗位描述',
        });
      }

      return NextResponse.json({
        code: 200,
        success: true,
        data: { content: textContent, title, url },
        message: '解析成功',
      });
    } catch (__fetchErr) {
      clearTimeout(timeout!);
      return NextResponse.json({
        code: 200,
        success: false,
        data: { content: '', title: '', url },
        message: '该链接无法自动解析，请手动粘贴岗位描述',
      });
    }
  } catch (error) {
    console.error('[fetch-jd] Error:', error);
    return NextResponse.json({
      code: 200,
      success: false,
      data: { content: '', title: '', url: '' },
      message: '该链接无法自动解析，请手动粘贴岗位描述',
    });
  }
}
