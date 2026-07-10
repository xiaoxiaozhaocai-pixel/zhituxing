import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
export const dynamic = 'force-dynamic';

interface SkillRow {
  id: number;
  skill_name: string;
  category: string | null;
  domain: string | null;
  aliases: string[] | null;
  frequency: number | null;
}

interface CategoryGroup {
  name: string;
  skills: string[];
}

/**
 * GET /api/skills/tags
 * 返回分组后的技能标签供前端自动补全
 * 支持 ?domain=xxx 和 ?search=xxx 过滤
 */
export async function GET(request: NextRequest) {
  try {
    const domain = request.nextUrl.searchParams.get('domain');
    const search = request.nextUrl.searchParams.get('search');

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('skill_taxonomy')
      .select('*')
      .order('skill_name', { ascending: true });

    if (domain) {
      query = query.eq('domain', domain);
    }

    if (search) {
      query = query.or(
        `skill_name.ilike.%${search}%,aliases.cs.{${search}}`
      );
    }

    const { data: skills, error } = await query;

    if (error) {
      console.error('获取技能标签失败:', error);
      return NextResponse.json({ error: '获取失败' }, { status: 500 });
    }

    const rows = (skills || []) as SkillRow[];

    // 按 domain 分组
    const domainMap = new Map<string, string[]>();
    // 按 category 分组
    const categoryMap = new Map<string, string[]>();

    for (const row of rows) {
      // domain 维度
      const d = row.domain || '其他';
      if (!domainMap.has(d)) domainMap.set(d, []);
      domainMap.get(d)!.push(row.skill_name);

      // category 维度
      const c = row.category || '其他';
      if (!categoryMap.has(c)) categoryMap.set(c, []);
      categoryMap.get(c)!.push(row.skill_name);
    }

    const domains: CategoryGroup[] = [];
    for (const [name, skillList] of domainMap) {
      domains.push({ name, skills: skillList });
    }

    const categories: CategoryGroup[] = [];
    for (const [name, skillList] of categoryMap) {
      categories.push({ name, skills: skillList });
    }

    return NextResponse.json({
      success: true,
      data: {
        domains,
        categories,
      },
    });
  } catch (error) {
    console.error('获取技能标签异常:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}
