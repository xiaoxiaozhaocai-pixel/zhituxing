export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { findSimilarUsers, type UserSkillVector } from '@/lib/similar-users-algorithm';

const supabase = getSupabaseAdmin();

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 获取当前用户技能
    const { data: userSkills, error: skillsError } = await supabase
      .from('user_skills')
      .select('skill_name, level')
      .eq('user_id', userId);

    if (skillsError) throw skillsError;

    // 获取用户画像
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('major, target_position')
      .eq('user_id', userId)
      .maybeSingle();

    // 构建当前用户的技能向量
    const currentUserVector: UserSkillVector = {
      userId: parseInt(userId) || 0,
      skills: {},
      major: profile?.major,
      jobIntention: profile?.target_position
    };
    for (const skill of userSkills || []) {
      currentUserVector.skills[skill.skill_name] = skill.level || 1;
    }

    // 查找其他用户的技能
    const { data: allUserSkills, error: allError } = await supabase
      .from('user_skills')
      .select('user_id, skill_name, level');

    if (allError) throw allError;

    // 按用户ID分组构建候选用户向量
    const candidateMap = new Map<number, UserSkillVector>();
    for (const row of allUserSkills || []) {
      const uid = parseInt(row.user_id as string) || 0;
      if (uid === currentUserVector.userId) continue; // 排除自己

      if (!candidateMap.has(uid)) {
        candidateMap.set(uid, { userId: uid, skills: {} });
      }
      candidateMap.get(uid)!.skills[row.skill_name] = row.level || 1;
    }

    const candidates = Array.from(candidateMap.values());

    // 计算相似度
    const similarUsers = findSimilarUsers(currentUserVector, candidates);

    return NextResponse.json({ success: true, data: similarUsers });
  } catch (error) {
    console.error('查找相似用户失败:', error);
    return NextResponse.json({ error: '查找失败' }, { status: 500 });
  }
}
