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
      // 表不存在时优雅降级（迁移待执行）
      if (error.code === '42P01') {
        console.warn('[university] Table not found - migration pending');
        return NextResponse.json({ success: true, data: [], meta: { migration_pending: true } });
      }
      console.error('[university] Query error:', error.message);
      return NextResponse.json({ success: true, data: [], error: '查询异常' });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('[university] Unexpected error:', err);
    return NextResponse.json({ success: true, data: [], error: '服务异常' });
  }
}
