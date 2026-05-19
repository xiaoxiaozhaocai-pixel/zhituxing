import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const supabase = getSupabaseAdmin();

export async function GET(request: NextRequest) {
  try {
    const skillName = request.nextUrl.searchParams.get('skill');
    const relationType = request.nextUrl.searchParams.get('type');

    if (!skillName) {
      return NextResponse.json({ error: '缺少技能名称' }, { status: 400 });
    }

    let query = supabase
      .from('skill_relations')
      .select('*')
      .or(`skill_a.eq.${skillName},skill_b.eq.${skillName}`);

    if (relationType) {
      query = query.eq('relation_type', relationType);
    }

    const { data: relations, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, data: relations || [] });
  } catch (error) {
    console.error('获取技能关系失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}
