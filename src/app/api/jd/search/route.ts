export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const supabase = getSupabaseAdmin();

export async function GET(request: NextRequest) {
  try {
    const keyword = request.nextUrl.searchParams.get('keyword') || '';
    const city = request.nextUrl.searchParams.get('city') || '';
    const industry = request.nextUrl.searchParams.get('industry') || '';
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');

    let query = supabase
      .from('jd_library')
      .select('*')
      .eq('status', 'active');

    if (keyword) {
      // 多字段搜索
      const { data: results, error } = await supabase
        .from('jd_library')
        .select('*')
        .eq('status', 'active')
        .or(`job_title.ilike.%${keyword}%,company.ilike.%${keyword}%,responsibilities.ilike.%${keyword}%`)
        .limit(limit);

      if (error) throw error;
      return NextResponse.json({ success: true, data: results || [] });
    }

    if (city) {
      query = query.ilike('location', `%${city}%`);
    }
    if (industry) {
      query = query.eq('industry', industry);
    }

    const { data: jds, error } = await query.limit(limit);

    if (error) throw error;

    return NextResponse.json({ success: true, data: jds || [] });
  } catch (error) {
    console.error('搜索JD失败:', error);
    return NextResponse.json({ error: '搜索失败' }, { status: 500 });
  }
}
