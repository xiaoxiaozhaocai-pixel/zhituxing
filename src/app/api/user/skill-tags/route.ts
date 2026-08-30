export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUserId } from '@/lib/auth';

const supabase = getSupabaseAdmin();

interface SkillTagInfo {
  id: number;
  name: string;
  category: string;
  seniority_level: string | null;
  industry_tags: string[];
  description: string | null;
}

interface UserSkillTagRow {
  id: number;
  user_id: string;
  skill_id: number;
  proficiency_level: string;
  created_at: string;
  skill_tags: SkillTagInfo;
}

interface FlatUserSkillTag {
  id: number;
  user_id: string;
  skill_id: number;
  proficiency_level: string;
  created_at: string;
  name: string;
  category: string;
  seniority_level: string | null;
  industry_tags: string[];
  description: string | null;
}

/**
 * GET /api/user/skill-tags
 * 获取当前用户的技能标签（含技能详情）
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('user_skill_tags')
      .select(`
        *,
        skill_tags!inner(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // 平铺返回，避免嵌套 + 解决 id 冲突
    const result: FlatUserSkillTag[] = (data || []).map((item: UserSkillTagRow) => ({
      id: item.id,
      user_id: item.user_id,
      skill_id: item.skill_id,
      proficiency_level: item.proficiency_level,
      created_at: item.created_at,
      name: item.skill_tags.name,
      category: item.skill_tags.category,
      seniority_level: item.skill_tags.seniority_level,
      industry_tags: item.skill_tags.industry_tags,
      description: item.skill_tags.description,
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('获取用户技能标签失败:', error);
    return NextResponse.json(
      { error: '获取失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/skill-tags
 * 用户保存/更新自己的技能标签（全量替换）
 * body: { skill_ids: number[], proficiency_levels?: Record<number, string> }
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { skill_ids: skillIds, proficiency_levels } = body as {
      skill_ids: number[];
      proficiency_levels?: Record<number, string>;
    };

    if (!Array.isArray(skillIds)) {
      return NextResponse.json(
        { error: 'skill_ids 是必填项且必须为数组' },
        { status: 400 }
      );
    }

    // 验证所有 skill_id 都存在
    const { data: validSkills, error: verifyError } = await supabase
      .from('skill_tags')
      .select('id')
      .in('id', skillIds);

    if (verifyError) throw verifyError;

    if (!validSkills || validSkills.length !== skillIds.length) {
      const existingIds = new Set((validSkills || []).map((s: { id: number }) => s.id));
      const invalidIds = skillIds.filter((id: number) => !existingIds.has(id));
      return NextResponse.json(
        { error: `无效的技能ID: ${invalidIds.join(', ')}` },
        { status: 400 }
      );
    }

    // 事务：先删旧记录，再批量插入新记录
    const { error: deleteError } = await supabase
      .from('user_skill_tags')
      .delete()
      .eq('user_id', userId);

    if (deleteError) throw deleteError;

    if (skillIds.length > 0) {
      const records = skillIds.map((skillId: number) => ({
        user_id: userId,
        skill_id: skillId,
        proficiency_level: proficiency_levels?.[skillId] || 'beginner',
      }));

      const { error: insertError } = await supabase
        .from('user_skill_tags')
        .insert(records);

      if (insertError) throw insertError;
    }

    // 返回最新数据
    const { data: newData, error: fetchError } = await supabase
      .from('user_skill_tags')
      .select(`
        *,
        skill_tags!inner(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;

    const result: FlatUserSkillTag[] = (newData || []).map((item: UserSkillTagRow) => ({
      id: item.id,
      user_id: item.user_id,
      skill_id: item.skill_id,
      proficiency_level: item.proficiency_level,
      created_at: item.created_at,
      name: item.skill_tags.name,
      category: item.skill_tags.category,
      seniority_level: item.skill_tags.seniority_level,
      industry_tags: item.skill_tags.industry_tags,
      description: item.skill_tags.description,
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('保存用户技能标签失败:', error);
    return NextResponse.json(
      { error: '保存失败' },
      { status: 500 }
    );
  }
}
