import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const supabase = getSupabaseAdmin();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: jd, error } = await supabase
      .from('jd_library')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !jd) {
      return NextResponse.json({ error: 'JD不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: jd });
  } catch (error) {
    console.error('获取JD失败:', error);
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

    const { data: jd, error } = await supabase
      .from('jd_library')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: jd });
  } catch (error) {
    console.error('更新JD失败:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error } = await supabase
      .from('jd_library')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除JD失败:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
