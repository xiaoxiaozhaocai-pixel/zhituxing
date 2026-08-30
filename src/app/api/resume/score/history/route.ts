export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUserId } from '@/lib/auth';

const supabase = getSupabaseAdmin();

export async function GET(request: NextRequest) {
  try {
    // 1. Authentication
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    const limit = Math.min(Math.max(parseInt(limitParam || '10', 10) || 10, 1), 50);
    const offset = Math.max(parseInt(offsetParam || '0', 10) || 0, 0);

    // 3. Get total count
    const { count: total, error: countError } = await supabase
      .from('user_resume_scores')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      console.error('[resume-score-history] Count query failed:', countError);
      return NextResponse.json(
        { error: '查询失败，请稍后重试' },
        { status: 500 }
      );
    }

    // 4. Query paginated records
    const { data: records, error: queryError } = await supabase
      .from('user_resume_scores')
      .select('id, target_job, overall_score, dimensions, improvements, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (queryError) {
      console.error('[resume-score-history] Query failed:', queryError);
      return NextResponse.json(
        { error: '查询失败，请稍后重试' },
        { status: 500 }
      );
    }

    // 5. Return response
    return NextResponse.json({
      success: true,
      data: {
        records: records || [],
        total: total || 0,
        limit,
        offset,
      },
    });

  } catch (error) {
    console.error('[resume-score-history] Unexpected error:', error);
    return NextResponse.json(
      { error: '服务异常，请稍后重试' },
      { status: 500 }
    );
  }
}
