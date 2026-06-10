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
    return xForwardedFor.split(',')[0]!.trim();
  }
  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp) {
    return xRealIp;
  }
  return 'unknown';
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(`feedback:${clientIp}`, { maxRequests: 10, windowMs: 3600000 });
    
    if (!rateLimitResult.success) {
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

    if (error) {
      console.error('[feedback] DB insert 失败:', JSON.stringify(error));
      throw error;
    }

    return NextResponse.json(
      { success: true, id: feedback.id },
      { status: 200 }
    );
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[feedback] POST 异常:', errMsg);
    return NextResponse.json(
      { error: '提交失败，请稍后重试' },
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
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

    if (error) {
      console.error('[feedback] DB 查询失败:', JSON.stringify(error));
      throw error;
    }

    return NextResponse.json({ success: true, data: feedbacks || [] });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[feedback] GET 异常:', errMsg);
    return NextResponse.json(
      { error: '获取失败' },
      { status: 500 }
    );
  }
}
