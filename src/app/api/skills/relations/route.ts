/**
 * 技能关系图谱API
 * GET /api/skills/relations
 *
 * 查询技能关系图谱，支持按技能名称和关系类型过滤
 */

import { NextRequest, NextResponse } from 'next/server';
// SECURITY-TODO: migrate to Supabase query builder to prevent SQL injection
import { execSql } from '@/lib/exec-sql';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const skillName = searchParams.get('skill_name') || '';
    const relationType = searchParams.get('relation_type') || '';

    // 校验 relation_type
    const validTypes = ['co_occur', 'prerequisite', 'similar', 'career_path'];
    if (relationType && !validTypes.includes(relationType)) {
      return NextResponse.json(
        { error: `无效的 relation_type，可选值：${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // 构建 SQL
    let sql = `SELECT source_skill, target_skill, relation_type, weight FROM skill_relations WHERE 1=1`;

    if (skillName) {
      const escaped = skillName.replace(/'/g, "''");
      sql += ` AND (source_skill ILIKE '%${escaped}%' OR target_skill ILIKE '%${escaped}%')`;
    }

    if (relationType) {
      sql += ` AND relation_type = '${relationType}'`;
    }

    sql += ` ORDER BY weight DESC LIMIT 100`;

    const rows = await execSql(sql);

    const relations = (rows as Array<Record<string, unknown>>).map((row) => ({
      sourceSkill: row.source_skill as string,
      targetSkill: row.target_skill as string,
      relationType: row.relation_type as string,
      weight: Number(row.weight) || 0.5,
    }));

    // 如果指定了技能名称，构建图谱节点信息
    let nodes: Array<{ name: string; relatedCount: number }> | null = null;
    if (skillName) {
      const nodeMap = new Map<string, number>();
      for (const rel of relations) {
        nodeMap.set(rel.sourceSkill, (nodeMap.get(rel.sourceSkill) || 0) + 1);
        nodeMap.set(rel.targetSkill, (nodeMap.get(rel.targetSkill) || 0) + 1);
      }
      nodes = [...nodeMap.entries()]
        .map(([name, count]) => ({ name, relatedCount: count }))
        .sort((a, b) => b.relatedCount - a.relatedCount);
    }

    // 关系类型颜色映射（供前端渲染）
    const relationColors: Record<string, string> = {
      co_occur: '#3B82F6',     // 蓝
      prerequisite: '#22C55E',  // 绿
      similar: '#F97316',       // 橙
      career_path: '#A855F7',   // 紫
    };

    return NextResponse.json({
      success: true,
      data: relations,
      nodes,
      meta: {
        total: relations.length,
        skillName: skillName || null,
        relationType: relationType || null,
        relationColors,
      },
    }, {
      headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' }
    });
  } catch (error) {
    console.error('[skills/relations] API Error:', error);
    return NextResponse.json(
      { error: '查询技能关系失败', detail: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
