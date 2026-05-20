export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
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
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
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
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 所有功能已免费开放，无需取消订阅
    return NextResponse.json({
      success: true,
      message: '所有功能已免费开放'
    });
  } catch (error) {
    console.error('取消订阅失败:', error);
    return NextResponse.json({ error: '取消失败' }, { status: 500 });
  }
}
