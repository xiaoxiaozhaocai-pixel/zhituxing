export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const supabase = getSupabaseAdmin();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: feedback, error } = await supabase
      .from('feedback')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !feedback) {
      return NextResponse.json({ error: '反馈不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: feedback });
  } catch (error) {
    console.error('获取反馈失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, reply } = body;

    const { data: feedback, error } = await supabase
      .from('feedback')
      .update({ status, reply, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: feedback });
  } catch (error) {
    console.error('更新反馈失败:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
