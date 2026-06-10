import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
export const dynamic = 'force-dynamic';

const supabase = getSupabaseAdmin();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: partner, error } = await supabase
      .from('partners')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !partner) {
      return NextResponse.json({ error: '合作伙伴不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: partner });
  } catch (error) {
    console.error('获取合作伙伴失败:', error);
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

    const { data: partner, error } = await supabase
      .from('partners')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: partner });
  } catch (error) {
    console.error('更新合作伙伴失败:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
