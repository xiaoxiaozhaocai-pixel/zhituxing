export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // 检查 universities 表是否存在
    const { error: tableCheckError } = await supabase
      .from('universities')
      .select('id', { count: 'exact', head: true });

    if (tableCheckError) {
      // 表不存在（数据库迁移未执行）
      if (tableCheckError.code === '42P01') {
        console.warn('[university] universities table not found - migration pending');
        return NextResponse.json({
          success: true,
          data: [],
          meta: { status: 'pending_migration', message: '数据库迁移待执行' },
        });
      }
      console.error('[university] Table check error:', tableCheckError.message);
      return NextResponse.json(
        { success: false, error: '数据库查询异常' },
        { status: 500 },
      );
    }

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
