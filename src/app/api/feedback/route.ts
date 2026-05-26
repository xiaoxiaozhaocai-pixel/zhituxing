export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUserId } from '@/lib/auth';

const supabase = getSupabaseAdmin();

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    const body = await request.json();
    const { type, content, rating, targetId } = body;

    const { data: feedback, error } = await supabase
      .from('feedback')
      .insert({
        user_id: userId,
        type,
        content,
        rating,
        target_id: targetId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: feedback });
  } catch (error) {
    console.error('提交反馈失败:', error);
    return NextResponse.json({ error: '提交失败' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    const type = request.nextUrl.searchParams.get('type');

    let query = supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (type) {
      query = query.eq('type', type);
    }

    const { data: feedbacks, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, data: feedbacks || [] });
  } catch (error) {
    console.error('获取反馈失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}
