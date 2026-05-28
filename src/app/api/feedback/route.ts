export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUserId } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

const supabase = getSupabaseAdmin();

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(',') || [];

function getClientIp(request: NextRequest): string {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp) {
    return xRealIp;
  }
  // Next.js 16 已移除 NextRequest.ip，前两个 header 兜底足够（Zeabur 必带 x-forwarded-for）
  return 'unknown';
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const rateLimitResult = await checkRateLimit(clientIp, 10, 3600000);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: '反馈过于频繁，请稍后再试' },
        { status: 429 }
      );
    }

    const userId = await getAuthenticatedUserId(request);
    const body = await request.json();
    const { page, type, severity, description, screenshot_url } = body;

    if (!page || !type || !description) {
      return NextResponse.json(
        { error: '缺少必填字段' },
        { status: 400 }
      );
    }

    const { data: feedback, error } = await supabase
      .from('feedback')
      .insert({
        user_id: userId,
        page,
        type,
        severity,
        description,
        screenshot_url
      })
      .select('id')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, id: feedback.id });
  } catch (error) {
    console.error('提交反馈失败:', error);
    return NextResponse.json({ error: '提交失败' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    
    if (!userId || !ADMIN_USER_IDS.includes(userId)) {
      return NextResponse.json(
        { error: '无权限访问' },
        { status: 403 }
      );
    }

    const { data: feedbacks, error } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ success: true, data: feedbacks || [] });
  } catch (error) {
    console.error('获取反馈失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}