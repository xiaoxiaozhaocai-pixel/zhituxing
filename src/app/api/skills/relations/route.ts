export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

// 将 Supabase 的 snake_case 关系类型映射到前端期望的 camelCase 类型
const relationTypeMap: Record<string, string> = {
  enhanced_by: 'co_occur',
  complementary: 'similar',
  correlated: 'career_path',
};

export async function GET(request: NextRequest) {
  try {
    const skillName = request.nextUrl.searchParams.get('skill') || request.nextUrl.searchParams.get('skill_name');
    const relationType = request.nextUrl.searchParams.get('type');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Supabase配置缺失' }, { status: 500 });
    }

    let url: string;
    if (skillName) {
      const skillEncoded = encodeURIComponent(skillName);
      url = `${supabaseUrl}/rest/v1/skill_relations?or=(source_skill.eq.${skillEncoded},target_skill.eq.${skillEncoded})`;
      if (relationType) {
        url += `&relation_type=eq.${encodeURIComponent(relationType)}`;
      }
    } else {
      url = `${supabaseUrl}/rest/v1/skill_relations?select=*&limit=200`;
      if (relationType) {
        url += `&relation_type=eq.${encodeURIComponent(relationType)}`;
      }
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

    const rawData = await res.json();

    // 转换 snake_case → camelCase + 映射 relation_type
    const data = (rawData || []).map((r: { id: number; source_skill: string; target_skill: string; relation_type: string; weight: number; co_occur_count: number; confidence: number; evidence_jd_count: number }) => ({
      id: r.id,
      sourceSkill: r.source_skill,
      targetSkill: r.target_skill,
      relationType: relationTypeMap[r.relation_type] || r.relation_type,
      weight: r.weight,
      coOccurCount: r.co_occur_count,
      confidence: r.confidence,
      evidenceJdCount: r.evidence_jd_count,
    }));

    const nodeMap = new Map<string, number>();
    for (const r of (rawData || [])) {
      nodeMap.set(r.source_skill, (nodeMap.get(r.source_skill) || 0) + 1);
      nodeMap.set(r.target_skill, (nodeMap.get(r.target_skill) || 0) + 1);
    }
    const nodes = Array.from(nodeMap.entries()).map(([name, relatedCount]) => ({
      name,
      relatedCount,
    }));

    return NextResponse.json({ success: true, data, nodes });
  } catch (error) {
    console.error('获取技能关系失败:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: '获取失败', details: errMsg }, { status: 500 });
  }
}
