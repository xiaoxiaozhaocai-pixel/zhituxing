export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 所有功能已免费开放，返回空订阅
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

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 所有功能已免费开放，无需订阅
    return NextResponse.json({
      success: true,
      message: '所有功能已免费开放',
      subscription: null
    });
  } catch (error) {
    console.error('创建订阅失败:', error);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}
