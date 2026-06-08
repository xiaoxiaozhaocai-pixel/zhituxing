export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';

// 内存存储（服务重启丢失，v1 可接受）
interface ShareData {
  botName: string;
  botGradient: string;
  messages: { role: string; content: string }[];
  createdAt: string;
}

const shareStore = new Map<string, ShareData>();

// 生成短 ID（8位随机字符）
function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// POST: 创建分享
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { botName, botGradient, messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ success: false, error: '消息不能为空' }, { status: 400 });
    }

    const id = generateId();
    const share: ShareData = {
      botName: botName || 'AI职业助手',
      botGradient: botGradient || 'from-blue-500 to-blue-600',
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
      createdAt: new Date().toISOString(),
    };

    shareStore.set(id, share);

    // 简单清理：超过 1000 条时删最早的
    if (shareStore.size > 1000) {
      const firstKey = shareStore.keys().next().value;
      if (firstKey) shareStore.delete(firstKey);
    }

    const shareUrl = `https://zhituxing.tech/share/${id}`;

    return Response.json({ success: true, id, url: shareUrl });
  } catch {
    return Response.json({ success: false, error: '创建分享失败' }, { status: 500 });
  }
}

// GET: 获取分享数据
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return Response.json({ success: false, error: '缺少分享ID' }, { status: 400 });
  }

  const share = shareStore.get(id);
  if (!share) {
    return Response.json({ success: false, error: '分享不存在或已过期' }, { status: 404 });
  }

  return Response.json({ success: true, data: share });
}
