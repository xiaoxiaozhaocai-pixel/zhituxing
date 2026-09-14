import { NextResponse } from 'next/server';
import { getRedisStatus } from '@/lib/rate-limit';

export async function GET() {
  return NextResponse.json({ status: 'ok', redis: getRedisStatus() });
}
