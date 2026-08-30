import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { curateMessages, type ChatMessage } from '@/lib/share-curator';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * P2-6: 小职对话分享 API
 *
 * POST /api/share
 *   body: { botName?, botGradient?, messages: [{role, content}], mode?: 'all'|'curated'|'selected' }
 *   返回: { success, id, url, mode, messageCount, originalCount }
 *   默认 mode='curated'（精选片段，最多 6 轮）
 *
 * GET /api/share?id=xxxxxxxx
 *   返回: { success, data: { botName, botGradient, messages, mode, createdAt } }
 *   公开读，30 天过期
 */

// 生成短 ID（8位，无歧义字符集）
function generateId(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'; // 去除 i/l/o/0/1
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

interface IncomingMessage {
  role: string;
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const {
      botName,
      botGradient,
      messages,
      mode = 'curated', // 默认精选片段
    } = body as {
      botName?: string;
      botGradient?: string;
      messages: IncomingMessage[];
      mode?: 'all' | 'curated' | 'selected';
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ success: false, error: '消息不能为空' }, { status: 400 });
    }

    const finalMode: 'all' | 'curated' | 'selected' =
      mode === 'all' || mode === 'curated' || mode === 'selected' ? mode : 'curated';

    // 清洗消息
    const cleanMessages: ChatMessage[] = messages
      .filter((m) => m && typeof m.content === 'string' && m.content.trim().length > 0)
      .map((m) => ({ role: m.role, content: m.content }));

    if (cleanMessages.length === 0) {
      return NextResponse.json({ success: false, error: '没有可分享的消息' }, { status: 400 });
    }

    const finalMessages =
      finalMode === 'curated' ? curateMessages(cleanMessages, 6) : cleanMessages;

    if (finalMessages.length === 0) {
      return NextResponse.json(
        { success: false, error: '精选后无可分享内容' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 生成唯一 ID，最多重试 5 次
    let id = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateId();
      const { data: existing } = await supabase
        .from('shared_conversations')
        .select('id')
        .eq('id', candidate)
        .maybeSingle();
      if (!existing) {
        id = candidate;
        break;
      }
    }
    if (!id) {
      return NextResponse.json({ success: false, error: '生成分享ID失败' }, { status: 500 });
    }

    const { error: insertError } = await supabase.from('shared_conversations').insert({
      id,
      bot_name: botName || 'AI职业助手',
      bot_gradient: botGradient || 'from-blue-500 to-blue-600',
      messages: finalMessages,
      mode: finalMode,
      user_id: userId,
    });

    if (insertError) {
      console.error('[POST /api/share] insert failed:', insertError);
      return NextResponse.json({ success: false, error: '保存分享失败' }, { status: 500 });
    }

    const shareUrl = `https://zhituxing.tech/share/${id}`;

    return NextResponse.json({
      success: true,
      id,
      url: shareUrl,
      mode: finalMode,
      messageCount: finalMessages.length,
      originalCount: cleanMessages.length,
    });
  } catch (err) {
    console.error('[POST /api/share] error:', err);
    return NextResponse.json({ success: false, error: '创建分享失败' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ success: false, error: '缺少分享ID' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('shared_conversations')
      .select('bot_name, bot_gradient, messages, mode, created_at, view_count')
      .eq('id', id)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: '分享不存在或已过期' },
        { status: 404 }
      );
    }

    // 异步累加浏览数（不阻塞返回）
    supabase
      .from('shared_conversations')
      .update({ view_count: (data.view_count || 0) + 1 })
      .eq('id', id)
      .then(({ error: e }) => {
        if (e) console.error('[GET /api/share] view_count update failed:', e);
      });

    return NextResponse.json({
      success: true,
      data: {
        botName: data.bot_name,
        botGradient: data.bot_gradient,
        messages: data.messages,
        mode: data.mode,
        createdAt: data.created_at,
      },
    });
  } catch (err) {
    console.error('[GET /api/share] error:', err);
    return NextResponse.json({ success: false, error: '获取分享失败' }, { status: 500 });
  }
}
