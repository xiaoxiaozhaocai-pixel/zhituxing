export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value;

    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return NextResponse.json({ error: '认证失败' }, { status: 401 });
    }

    // 所有功能已免费开放
    return NextResponse.json({
      success: true,
      data: null,
      message: '所有功能已免费开放'
    });
  } catch (error) {
    console.error('获取订阅失败:', error);
    return NextResponse.json({
      success: true,
      data: null,
      message: '所有功能已免费开放'
    });
  }
}

export async function PUT(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value;

    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return NextResponse.json({ error: '认证失败' }, { status: 401 });
    }

    // 所有功能已免费开放
    return NextResponse.json({
      success: true,
      message: '所有功能已免费开放'
    });
  } catch (error) {
    console.error('更新订阅失败:', error);
    return NextResponse.json({
      success: true,
      message: '所有功能已免费开放'
    });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value;

    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return NextResponse.json({ error: '认证失败' }, { status: 401 });
    }

    // 所有功能已免费开放
    return NextResponse.json({
      success: true,
      message: '所有功能已免费开放'
    });
  } catch (error) {
    console.error('取消订阅失败:', error);
    return NextResponse.json({
      success: true,
      message: '所有功能已免费开放'
    });
  }
}
