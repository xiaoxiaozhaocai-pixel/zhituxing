export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { findSimilarUsers, type UserSkillVector } from '@/lib/similar-users-algorithm';

const supabase = getSupabaseAdmin();

export async function GET(request: NextRequest) {
  try {
    // 认证检查：从 cookie 读取 sb-access-token
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/sb-access-token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;

    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 验证 token 获取用户 ID
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: '认证失败' }, { status: 401 });
    }

    const userId = user.id;

    // 获取当前用户技能（查询失败不报错）
    const { data: userSkills } = await supabase
      .from('user_skills')
      .select('skill_name, level')
      .eq('user_id', userId);

    // 如果用户没有技能数据，返回空结果
    if (!userSkills || userSkills.length === 0) {
      return NextResponse.json({ 
        success: true, 
        users: [], 
        message: '请先完善个人资料以获取推荐' 
      });
    }

    // 获取用户画像（查询失败不报错）
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

    // 查找其他用户的技能（查询失败不报错）
    const { data: allUserSkills } = await supabase
      .from('user_skills')
      .select('user_id, skill_name, level');

    // 如果没有其他用户数据，返回空结果
    if (!allUserSkills || allUserSkills.length === 0) {
      return NextResponse.json({ 
        success: true, 
        users: [], 
        message: '暂无其他用户数据' 
      });
    }

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

    // 如果没有候选用户，返回空结果
    if (candidates.length === 0) {
      return NextResponse.json({ 
        success: true, 
        users: [], 
        message: '暂无相似用户' 
      });
    }

    // 计算相似度
    const similarUsers = findSimilarUsers(currentUserVector, candidates);

    return NextResponse.json({ 
      success: true, 
      users: similarUsers,
      message: similarUsers.length > 0 ? undefined : '暂无相似用户'
    });
  } catch (error) {
    console.error('查找相似用户失败:', error);
    // 不返回500，返回空结果
    return NextResponse.json({ 
      success: true, 
      users: [], 
      message: '获取推荐失败，请稍后重试' 
    });
  }
}
