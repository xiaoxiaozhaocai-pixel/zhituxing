export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('universities')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[university] Query error:', error.message);
      return NextResponse.json(
        { success: false, error: '查询失败' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('[university] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: '服务异常' },
      { status: 500 },
    );
  }
}
