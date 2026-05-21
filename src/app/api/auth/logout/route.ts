export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/auth-cookies';

export async function POST() {
  try {
    const response = NextResponse.json({ success: true, message: '已退出登录' });
    clearAuthCookies(response);
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: '退出失败' }, { status: 500 });
  }
}
