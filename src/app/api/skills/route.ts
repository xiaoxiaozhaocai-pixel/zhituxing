import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
export const dynamic = 'force-dynamic';

const supabase = getSupabaseAdmin();

export async function GET(request: NextRequest) {
  try {
    const category = request.nextUrl.searchParams.get('category');
    const search = request.nextUrl.searchParams.get('search');

    let query = supabase
      .from('skill_taxonomy')
      .select('*')
      .order('name', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data: skills, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, data: skills || [] });
  } catch (error) {
    console.error('获取技能失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}
