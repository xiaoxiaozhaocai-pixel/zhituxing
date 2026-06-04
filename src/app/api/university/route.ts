export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/university — 获取高校列表
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await supabase
      .from('universities')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      // 表不存在时返回空数组，不报错
      console.warn('[university] Query error:', error.message);
      return NextResponse.json({ success: true, data: [] });
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (err) {
    console.error('[university] Error:', err);
    // 任何异常都返回空数组确保不宕
    return NextResponse.json({ success: true, data: [] });
  }
}
