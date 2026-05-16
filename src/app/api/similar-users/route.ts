import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';
import {
  findSimilarUsers,
  UserSkillVector,
  CandidateFilter,
} from '@/lib/similar-users-algorithm';

export const runtime = 'edge';

/**
 * GET /api/similar-users
 * 查询相似用户推荐
 *
 * Query params:
 * - top_n: 返回数量，默认10
 * - same_major: 是否仅同专业 (true/false)
 * - same_job_intention: 是否仅同职业方向 (true/false)
 * - min_shared_skills: 最少共同技能数
 */
export async function GET(request: NextRequest) {
  try {
    // 获取当前用户 ID
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const currentUserId = parseInt(userId, 10);
    if (isNaN(currentUserId)) {
      return NextResponse.json(
        { error: '用户ID无效' },
        { status: 400 }
      );
    }

    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const topN = Math.min(parseInt(searchParams.get('top_n') || '10', 10), 50);
    const sameMajor = searchParams.get('same_major') === 'true';
    const sameJobIntention = searchParams.get('same_job_intention') === 'true';
    const minSharedSkills = parseInt(searchParams.get('min_shared_skills') || '0', 10);

    // 1. 获取当前用户画像
    const profileRows = await execSql(
      `SELECT user_id, major, job_intention FROM user_profiles WHERE user_id = ${currentUserId}`
    );
    if (!profileRows || profileRows.length === 0) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }
    const currentProfile = profileRows[0] as Record<string, unknown>;

    // 2. 获取当前用户技能向量
    const skillRows = await execSql(
      `SELECT skill_name, level FROM user_skills WHERE user_id = ${currentUserId}`
    );
    const currentSkills: Record<string, number> = {};
    for (const row of (skillRows || []) as Record<string, unknown>[]) {
      currentSkills[String(row.skill_name)] = Number(row.level) || 1;
    }

    // 如果没有技能数据，也尝试从 ability_background 提取
    if (Object.keys(currentSkills).length === 0) {
      const bgRows = await execSql(
        `SELECT ability_background FROM user_profiles WHERE user_id = ${currentUserId}`
      );
      const bg = (bgRows?.[0] as Record<string, unknown>)?.ability_background;
      if (bg && typeof bg === 'object') {
        const ab = bg as Record<string, unknown>;
        // 从专业核心技能提取
        const coreSkills = ab.coreSkills as string[] | undefined;
        if (coreSkills) {
          for (const s of coreSkills) {
            currentSkills[s] = 3;
          }
        }
        // 从办公软件技能提取
        const officeSkills = ab.officeSoftware as string[] | undefined;
        if (officeSkills) {
          for (const s of officeSkills) {
            if (!currentSkills[s]) currentSkills[s] = 2;
          }
        }
      }
    }

    if (Object.keys(currentSkills).length === 0) {
      return NextResponse.json({
        success: true,
        similar_users: [],
        message: '请先在个人资料中填写技能信息',
      });
    }

    const currentUser: UserSkillVector = {
      userId: currentUserId,
      skills: currentSkills,
      major: currentProfile.major as string | undefined,
      jobIntention: currentProfile.jobIntention as string | undefined,
    };

    // 3. 获取候选用户集（同专业或同职业方向优先）
    const candidateRows = await execSql(
      `SELECT up.user_id, up.major, up.job_intention
       FROM user_profiles up
       WHERE up.user_id != ${currentUserId}
       LIMIT 500`
    );

    if (!candidateRows || candidateRows.length === 0) {
      return NextResponse.json({
        success: true,
        similar_users: [],
        message: '暂无其他用户数据',
      });
    }

    // 4. 批量获取所有候选用户技能
    const candidateIds = (candidateRows as Record<string, unknown>[])
      .map((r) => r.user_id)
      .join(',');

    const candidateSkillRows = await execSql(
      `SELECT user_id, skill_name, level FROM user_skills WHERE user_id IN (${candidateIds})`
    );

    // 按用户分组构建技能向量
    const candidateSkillMap = new Map<number, Record<string, number>>();
    for (const row of (candidateSkillRows || []) as Record<string, unknown>[]) {
      const uid = Number(row.user_id);
      if (!candidateSkillMap.has(uid)) {
        candidateSkillMap.set(uid, {});
      }
      candidateSkillMap.get(uid)![String(row.skill_name)] = Number(row.level) || 1;
    }

    // 5. 构建候选用户向量列表
    const candidates: UserSkillVector[] = (candidateRows as Record<string, unknown>[])
      .filter((r) => candidateSkillMap.has(Number(r.user_id)))
      .map((r) => ({
        userId: Number(r.user_id),
        skills: candidateSkillMap.get(Number(r.user_id)) || {},
        major: r.major as string | undefined,
        jobIntention: r.job_intention as string | undefined,
      }));

    // 6. 构建过滤条件
    const filter: CandidateFilter = {};
    if (sameMajor) filter.sameMajor = true;
    if (sameJobIntention) filter.sameJobIntention = true;
    if (minSharedSkills > 0) filter.minSharedSkills = minSharedSkills;

    // 7. 调用算法计算相似用户
    const similarUsers = findSimilarUsers(currentUser, candidates, {
      filter: Object.keys(filter).length > 0 ? filter : undefined,
      topN,
    });

    return NextResponse.json({
      success: true,
      similar_users: similarUsers,
      meta: {
        currentUserId,
        currentUserSkills: Object.keys(currentSkills).length,
        candidateCount: candidates.length,
        filterApplied: Object.keys(filter).length > 0,
      },
    });
  } catch (error) {
    console.error('[similar-users] Error:', error);
    return NextResponse.json(
      { error: '获取相似用户推荐失败' },
      { status: 500 }
    );
  }
}
