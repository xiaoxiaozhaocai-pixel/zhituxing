// src/app/api/features/route.ts
// Feature Flag API — 返回所有功能开关状态

import { NextResponse } from 'next/server';
import { getAllFlags } from '@/lib/features/providers';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const flags = await getAllFlags();
    return NextResponse.json({ success: true, flags });
  } catch (error) {
    console.error('[features] Failed to get flags:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get feature flags' },
      { status: 500 }
    );
  }
}
