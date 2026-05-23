export const dynamic = 'force-dynamic';
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

    // 使用 REST API 直接查询，避免 Supabase JS SDK 的 or() 语法问题
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Supabase配置缺失' }, { status: 500 });
    }

    // 构建 URL 编码的查询参数
    const skillEncoded = encodeURIComponent(skillName);
    let url = `${supabaseUrl}/rest/v1/skill_relations?or=(source_skill.eq.${skillEncoded},target_skill.eq.${skillEncoded})`;
    if (relationType) {
      url += `&relation_type=eq.${encodeURIComponent(relationType)}`;
    }

    const res = await fetch(url, {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Supabase查询失败:', res.status, errText);
      return NextResponse.json({ 
        error: '查询失败', 
        details: errText,
        status: res.status 
      }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('获取技能关系失败:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: '获取失败', details: errMsg }, { status: 500 });
  }
}
