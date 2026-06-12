/**
 * POST /api/employer/auth/logout
 * 雇主登出（清除 cookie）
 */

import { NextRequest } from 'next/server';
import { clearAuthCookies } from '@/lib/auth-cookies';
import { jsonOk } from '@/lib/api-contracts/_shared';
import { EmployerLogoutDataSchema } from '@/lib/api-contracts/employer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(_request: NextRequest) {
  const response = jsonOk(EmployerLogoutDataSchema, { message: '已登出' });
  clearAuthCookies(response);
  return response;
}
