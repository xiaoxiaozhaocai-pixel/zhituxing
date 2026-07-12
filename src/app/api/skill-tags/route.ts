export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const supabase = getSupabaseAdmin();

/**
 * GET /api/skill-tags
 * 获取技能标签库，支持分类/行业/搜索筛选
 */
export async function GET(request: NextRequest) {
  try {
    const category = request.nextUrl.searchParams.get('category');
    const industry = request.nextUrl.searchParams.get('industry');
    const search = request.nextUrl.searchParams.get('search');

    let query = supabase
      .from('skill_tags')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    if (industry) {
      query = query.contains('industry_tags', [industry]);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: tags, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, data: tags || [] });
  } catch (error) {
    console.error('获取技能标签失败:', error);
    return NextResponse.json(
      { error: '获取技能标签失败' },
      { status: 500 }
    );
  }
}
