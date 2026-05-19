import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

export const runtime = 'edge';

// Admin权限校验
async function checkAdmin(request: NextRequest): Promise<boolean> {
  const userId = request.headers.get('x-user-id');
  if (!userId) return false;
  const rows = await execSql(
    `SELECT is_admin FROM user_profiles WHERE user_id = ${Number(userId)}`
  ) as Record<string, unknown>[];
  return rows.length > 0 && rows[0].is_admin === true;
}

// GET: 查询技能分类/关系/可视化数据
export async function GET(request: NextRequest) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'taxonomy';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('page_size') || '20');
  const keyword = searchParams.get('keyword') || '';
  const offset = (page - 1) * pageSize;

  try {
    switch (action) {
      case 'taxonomy': {
        const where = keyword
          ? `WHERE skill_name ILIKE '%${keyword}%' OR category ILIKE '%${keyword}%' OR domain ILIKE '%${keyword}%'`
          : '';
        const countRows = await execSql(
          `SELECT COUNT(*)::int as total FROM skill_taxonomy ${where}`
        ) as Record<string, unknown>[];
        const rows = await execSql(
          `SELECT id, skill_name, category, domain, aliases, created_at FROM skill_taxonomy ${where} ORDER BY id DESC LIMIT ${pageSize} OFFSET ${offset}`
        ) as Record<string, unknown>[];
        return NextResponse.json({
          success: true,
          data: rows,
          pagination: { page, pageSize, total: countRows[0]?.total || 0 },
        });
      }

      case 'relations': {
        const relationType = searchParams.get('relation_type') || '';
        const relWhere = relationType
          ? `WHERE relation_type = '${relationType}'`
          : keyword
            ? `WHERE source_skill ILIKE '%${keyword}%' OR target_skill ILIKE '%${keyword}%'`
            : '';
        const countRows = await execSql(
          `SELECT COUNT(*)::int as total FROM skill_relations ${relWhere}`
        ) as Record<string, unknown>[];
        const rows = await execSql(
          `SELECT id, source_skill, target_skill, relation_type, weight, created_at FROM skill_relations ${relWhere} ORDER BY id DESC LIMIT ${pageSize} OFFSET ${offset}`
        ) as Record<string, unknown>[];
        return NextResponse.json({
          success: true,
          data: rows,
          pagination: { page, pageSize, total: countRows[0]?.total || 0 },
        });
      }

      case 'graph': {
        // 可视化：获取指定技能的关系图数据
        const skillName = searchParams.get('skill_name') || '';
        if (!skillName) {
          return NextResponse.json({ error: '缺少skill_name参数' }, { status: 400 });
        }
        const nodes = new Map<string, { name: string; type: string }>();
        const edges: Record<string, unknown>[] = [];

        // 查找该技能的所有关系（作为source或target）
        const relRows = await execSql(
          `SELECT source_skill, target_skill, relation_type, weight FROM skill_relations WHERE source_skill ILIKE '%${skillName}%' OR target_skill ILIKE '%${skillName}%'`
        ) as Record<string, unknown>[];

        // 如果没有精确匹配，尝试模糊
        const exactRows = relRows.length > 0 ? relRows : await execSql(
          `SELECT source_skill, target_skill, relation_type, weight FROM skill_relations WHERE source_skill ILIKE '%${skillName}%' OR target_skill ILIKE '%${skillName}%' LIMIT 30`
        ) as Record<string, unknown>[];

        for (const row of exactRows) {
          const src = String(row.source_skill);
          const tgt = String(row.target_skill);
          const relType = String(row.relation_type);
          nodes.set(src, { name: src, type: relType });
          nodes.set(tgt, { name: tgt, type: relType });
          edges.push({ source: src, target: tgt, relationType: relType, weight: Number(row.weight) });
        }

        // 中心节点
        if (nodes.size > 0 && !nodes.has(skillName)) {
          nodes.set(skillName, { name: skillName, type: 'center' });
        }

        return NextResponse.json({
          success: true,
          data: {
            nodes: Array.from(nodes.values()),
            edges,
            centerNode: skillName,
          },
        });
      }

      case 'stats': {
        const taxonomyCount = await execSql(
          `SELECT COUNT(*)::int as total FROM skill_taxonomy`
        ) as Record<string, unknown>[];
        const relationsCount = await execSql(
          `SELECT COUNT(*)::int as total FROM skill_relations`
        ) as Record<string, unknown>[];
        const typeBreakdown = await execSql(
          `SELECT relation_type, COUNT(*)::int as count FROM skill_relations GROUP BY relation_type ORDER BY count DESC`
        ) as Record<string, unknown>[];
        const categoryBreakdown = await execSql(
          `SELECT category, COUNT(*)::int as count FROM skill_taxonomy WHERE category IS NOT NULL GROUP BY category ORDER BY count DESC LIMIT 10`
        ) as Record<string, unknown>[];

        return NextResponse.json({
          success: true,
          data: {
            taxonomyTotal: taxonomyCount[0]?.total || 0,
            relationsTotal: relationsCount[0]?.total || 0,
            typeBreakdown,
            categoryBreakdown,
          },
        });
      }

      default:
        return NextResponse.json({ error: '未知action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '查询失败';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST: 新增技能分类/关系/批量导入
export async function POST(request: NextRequest) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'add_taxonomy': {
        const { skill_name, category, domain, aliases } = body;
        if (!skill_name) {
          return NextResponse.json({ error: '技能名称必填' }, { status: 400 });
        }
        const aliasesStr = aliases && Array.isArray(aliases) && aliases.length > 0
          ? `'${JSON.stringify(aliases)}'` : 'NULL';
        await execSql(
          `INSERT INTO skill_taxonomy (skill_name, category, domain, aliases) VALUES ('${skill_name.replace(/'/g, "''")}', ${category ? `'${category.replace(/'/g, "''")}'` : 'NULL'}, ${domain ? `'${domain.replace(/'/g, "''")}'` : 'NULL'}, ${aliasesStr}::jsonb)`
        );
        return NextResponse.json({ success: true, message: '添加成功' });
      }

      case 'add_relation': {
        const { source_skill, target_skill, relation_type, weight } = body;
        if (!source_skill || !target_skill || !relation_type) {
          return NextResponse.json({ error: '源技能、目标技能、关系类型必填' }, { status: 400 });
        }
        const validTypes = ['co_occur', 'prerequisite', 'similar', 'career_path'];
        if (!validTypes.includes(relation_type)) {
          return NextResponse.json({ error: '无效的关系类型' }, { status: 400 });
        }
        await execSql(
          `INSERT INTO skill_relations (source_skill, target_skill, relation_type, weight) VALUES ('${source_skill.replace(/'/g, "''")}', '${target_skill.replace(/'/g, "''")}', '${relation_type}', ${weight || 0.5})`
        );
        return NextResponse.json({ success: true, message: '添加成功' });
      }

      case 'bulk_import': {
        // CSV格式批量导入: [{source_skill, target_skill, relation_type, weight}]
        const { items } = body;
        if (!Array.isArray(items) || items.length === 0) {
          return NextResponse.json({ error: '导入数据为空' }, { status: 400 });
        }
        let inserted = 0;
        let errors = 0;
        for (const item of items) {
          try {
            const src = (item.source_skill || '').replace(/'/g, "''");
            const tgt = (item.target_skill || '').replace(/'/g, "''");
            const relType = item.relation_type || 'co_occur';
            const w = item.weight || 0.5;
            if (!src || !tgt) { errors++; continue; }
            await execSql(
              `INSERT INTO skill_relations (source_skill, target_skill, relation_type, weight) VALUES ('${src}', '${tgt}', '${relType}', ${w}) ON CONFLICT DO NOTHING`
            );
            inserted++;
          } catch {
            errors++;
          }
        }
        return NextResponse.json({ success: true, inserted, errors, total: items.length });
      }

      default:
        return NextResponse.json({ error: '未知action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '操作失败';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PUT: 更新技能分类/关系
export async function PUT(request: NextRequest) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'update_taxonomy': {
        const { id, skill_name, category, domain, aliases } = body;
        if (!id) return NextResponse.json({ error: '缺少id' }, { status: 400 });
        const sets: string[] = [];
        if (skill_name !== undefined) sets.push(`skill_name = '${skill_name.replace(/'/g, "''")}'`);
        if (category !== undefined) sets.push(`category = ${category ? `'${category.replace(/'/g, "''")}'` : 'NULL'}`);
        if (domain !== undefined) sets.push(`domain = ${domain ? `'${domain.replace(/'/g, "''")}'` : 'NULL'}`);
        if (aliases !== undefined) {
          const aliasesStr = Array.isArray(aliases) && aliases.length > 0 ? `'${JSON.stringify(aliases)}'` : 'NULL';
          sets.push(`aliases = ${aliasesStr}::jsonb`);
        }
        if (sets.length === 0) return NextResponse.json({ error: '无更新字段' }, { status: 400 });
        await execSql(`UPDATE skill_taxonomy SET ${sets.join(', ')} WHERE id = %s`, Number(id));
        return NextResponse.json({ success: true });
      }

      case 'update_relation': {
        const { id, source_skill, target_skill, relation_type, weight } = body;
        if (!id) return NextResponse.json({ error: '缺少id' }, { status: 400 });
        const sets: string[] = [];
        if (source_skill !== undefined) sets.push(`source_skill = '${source_skill.replace(/'/g, "''")}'`);
        if (target_skill !== undefined) sets.push(`target_skill = '${target_skill.replace(/'/g, "''")}'`);
        if (relation_type !== undefined) sets.push(`relation_type = '${relation_type}'`);
        if (weight !== undefined) sets.push(`weight = ${Number(weight)}`);
        if (sets.length === 0) return NextResponse.json({ error: '无更新字段' }, { status: 400 });
        await execSql(`UPDATE skill_relations SET ${sets.join(', ')} WHERE id = %s`, Number(id));
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: '未知action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '更新失败';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE: 删除技能分类/关系
export async function DELETE(request: NextRequest) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'taxonomy';
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: '缺少id' }, { status: 400 });

    switch (action) {
      case 'taxonomy':
        await execSql('DELETE FROM skill_taxonomy WHERE id = %s', Number(id));
        return NextResponse.json({ success: true });

      case 'relation':
        await execSql('DELETE FROM skill_relations WHERE id = %s', Number(id));
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: '未知action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '删除失败';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
