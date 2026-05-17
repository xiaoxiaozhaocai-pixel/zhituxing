import { NextRequest, NextResponse } from 'next/server';
import { FetchClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

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
    const hostname = new URL(url).hostname;
    return ALLOWED_HOSTS.some((host) => hostname.includes(host));
  } catch {
    return false;
  }
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

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { code: 400, message: '链接格式不正确' },
        { status: 400 }
      );
    }

    // Check if URL is from allowed hosts
    if (!isAllowedUrl(url)) {
      return NextResponse.json({
        code: 200,
        success: true,
        data: {
          content: '',
          title: '',
          url,
        },
        message: '暂不支持该招聘平台，建议手动粘贴岗位描述',
      });
    }

    // Extract forward headers for request tracing
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    const config = new Config({ timeout: 30000 });
    const client = new FetchClient(config, customHeaders);

    const response = await client.fetch(url);

    // Check fetch status
    if (response.status_code !== 0) {
      return NextResponse.json({
        code: 200,
        success: false,
        data: {
          content: '',
          title: response.title || '',
          url,
        },
        message: '该链接无法自动解析，请手动粘贴岗位描述',
      });
    }

    // Extract text content from response
    const textContent = response.content
      .filter((item) => item.type === 'text')
      .map((item) => item.text)
      .join('\n')
      .trim();

    // If content is too short, return manual paste message
    if (textContent.length < 100) {
      return NextResponse.json({
        code: 200,
        success: true,
        data: {
          content: textContent,
          title: response.title || '',
          url,
        },
        message: '该链接无法自动解析，请手动粘贴岗位描述',
      });
    }

    return NextResponse.json({
      code: 200,
      success: true,
      data: {
        content: textContent,
        title: response.title || '',
        url: response.url || url,
      },
      message: '解析成功',
    });
  } catch (error) {
    console.error('[fetch-jd] Error:', error);
    return NextResponse.json({
      code: 200,
      success: false,
      data: {
        content: '',
        title: '',
        url: '',
      },
      message: '该链接无法自动解析，请手动粘贴岗位描述',
    });
  }
}
