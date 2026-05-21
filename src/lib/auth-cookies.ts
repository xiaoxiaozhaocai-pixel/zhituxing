import { NextResponse } from 'next/server';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string,
  expiresAt: number
): void {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = Math.max(expiresAt - now, 3600);
  const maxAge = 30 * 24 * 60 * 60;

  response.cookies.set('sb-access-token', accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: expiresIn,
  });
  response.cookies.set('sb-refresh-token', refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: maxAge,
  });
}

export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set('sb-access-token', '', { ...COOKIE_OPTIONS, maxAge: 0 });
  response.cookies.set('sb-refresh-token', '', { ...COOKIE_OPTIONS, maxAge: 0 });
}

export function parseAccessTokenFromCookie(headers: Headers): string | null {
  const cookieHeader = headers.get('cookie') || '';
  const match = cookieHeader.match(/sb-access-token=([^;]+)/);
  return match ? match[1] : null;
}
