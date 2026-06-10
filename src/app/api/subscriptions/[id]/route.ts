export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
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
  request: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
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
  request: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
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
