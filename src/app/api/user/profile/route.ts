/**
 * 用户完整画像API
 *
 * GET: 获取用户完整画像（user_profiles + user_skills + 最近测评结果 + 匹配历史）
 * POST: 保存用户个人信息（upsert）— 保留原有功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { execSql } from '@/lib/exec-sql';
import { getUserInfoFromRequest } from '@/lib/coze-stream';
import { extractUserSkillsFromAbilityBackground, parseUserSkillsFromText } from '@/lib/matching-algorithm';

export const runtime = 'edge';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET - 获取用户完整画像
export async function GET(request: NextRequest) {
  try {
    // 优先从 x-user-id header 获取，兼容外部调用
    let userId: string | null = request.headers.get('x-user-id');

    // 回退到 cookie 认证
    if (!userId) {
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      const token = cookieStore.get('auth_token')?.value;
      if (token) {
        try {
          const { data: { user } } = await supabase.auth.getUser(token);
          if (user) userId = user.id;
        } catch {
          // cookie 认证失败
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ code: 401, message: '请先登录' }, { status: 401 });
    }

    // 1. 基础画像
    const profileRows = await execSql(
      `SELECT user_id, user_type, personality_type, major, grade, graduation_year, city, target_city, job_intention, skills, internship_experience, project_experience, awards, ability_background FROM user_profiles WHERE user_id = '${userId}' LIMIT 1`
    );

    if (!profileRows || profileRows.length === 0) {
      return NextResponse.json({ code: 404, message: '用户画像不存在' }, { status: 404 });
    }

    const profile = profileRows[0] as Record<string, unknown>;

    // 2. 用户技能列表（从 user_skills 表 + ability_background 解析）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let userSkills: any[] = [];
    try {
      const skillRows = await execSql(
        `SELECT skill_name, level, proficiency FROM user_skills WHERE user_id = '${userId}'`
      );
      userSkills = (skillRows as Array<Record<string, unknown>>).map((row) => ({
        name: row.skill_name as string,
        level: row.level as number,
        proficiency: row.proficiency as string,
      }));
    } catch {
      // user_skills 表无数据
    }

    // 从 ability_background 补充技能
    if (profile.ability_background) {
      try {
        const bg = JSON.parse(profile.ability_background as string);
        const bgSkills = extractUserSkillsFromAbilityBackground(bg);
        for (const s of bgSkills) {
          if (!userSkills.some((es) => es.name.toLowerCase() === s.name.toLowerCase())) {
            userSkills.push({ name: s.name, level: s.level || 3, proficiency: s.proficiency || '基础' });
          }
        }
      } catch {
        // JSON 解析失败
      }
    }

    // 从 skills 字段补充（skills 现在是 jsonb，可能是对象数组或字符串数组）
    if (profile.skills) {
      const skillsData = profile.skills;
      if (Array.isArray(skillsData) && skillsData.length > 0 && typeof skillsData[0] === 'object' && skillsData[0] !== null) {
        // 新格式：对象数组 [{name, category, level, hotness, description}]
        // 直接使用，不需要从 user_skills 合并
        userSkills = skillsData as Array<Record<string, unknown>>;
      } else {
        // 旧格式：字符串数组 ["skill1", "skill2"]
        let skillsArray: string[] = [];
        if (Array.isArray(skillsData)) {
          skillsArray = skillsData.map((s: unknown) =>
            typeof s === 'object' && s !== null ? (s as Record<string, unknown>).name as string : String(s)
          ).filter(Boolean);
        } else if (typeof skillsData === 'string') {
          skillsArray = parseUserSkillsFromText(skillsData).map((s: { name: string }) => s.name);
        }
        for (const skillName of skillsArray) {
          const name = typeof skillName === 'string' ? skillName : String(skillName);
          if (!userSkills.some((es) => es.name.toLowerCase() === name.toLowerCase())) {
            userSkills.push({ name, level: 3, proficiency: '基础' });
          }
        }
      }
    }

    // 3. 最近测评结果
    let latestAssessment = null;
    try {
      const assessRows = await execSql(
        `SELECT result_data, created_at FROM assessment_results WHERE user_id = '${userId}' ORDER BY created_at DESC LIMIT 1`
      );
      if (assessRows && assessRows.length > 0) {
        const row = assessRows[0] as Record<string, unknown>;
        latestAssessment = {
          data: typeof row.result_data === 'string' ? JSON.parse(row.result_data) : row.result_data,
          createdAt: row.created_at,
        };
      }
    } catch {
      // 无测评数据
    }

    // 4. 最近匹配结果
    let latestMatch = null;
    try {
      const matchRows = await execSql(
        `SELECT match_data, created_at FROM skill_job_match WHERE user_id = '${userId}' ORDER BY created_at DESC LIMIT 1`
      );
      if (matchRows && matchRows.length > 0) {
        const row = matchRows[0] as Record<string, unknown>;
        latestMatch = {
          data: typeof row.match_data === 'string' ? JSON.parse(row.match_data) : row.match_data,
          createdAt: row.created_at,
        };
      }
    } catch {
      // 无匹配数据
    }

    // 5. 最近职业规划
    let latestCareerPlan = null;
    try {
      const planRows = await execSql(
        `SELECT plan_data, created_at FROM career_plans WHERE user_id = '${userId}' ORDER BY created_at DESC LIMIT 1`
      );
      if (planRows && planRows.length > 0) {
        const row = planRows[0] as Record<string, unknown>;
        latestCareerPlan = {
          data: typeof row.plan_data === 'string' ? JSON.parse(row.plan_data) : row.plan_data,
          createdAt: row.created_at,
        };
      }
    } catch {
      // 无规划数据
    }

    // 6. 技能进度
    let skillProgress: Array<Record<string, unknown>> = [];
    try {
      const progressRows = await execSql(
        `SELECT skill_name, status, completion_pct FROM skill_progress WHERE user_id = '${userId}'`
      );
      skillProgress = (progressRows || []) as Array<Record<string, unknown>>;
    } catch {
      // 无进度数据
    }

    return NextResponse.json({
      code: 200,
      message: '获取成功',
      data: {
        profile: {
          userId: profile.user_id,
          userType: profile.user_type,
          personalityType: profile.personality_type,
          major: profile.major,
          grade: profile.grade,
          graduationYear: profile.graduation_year,
          city: profile.city,
          targetCity: profile.target_city,
          jobIntention: profile.job_intention,
          internshipExperience: profile.internship_experience,
          projectExperience: profile.project_experience,
          awards: profile.awards,
          abilityBackground: profile.ability_background
            ? (typeof profile.ability_background === 'string'
              ? JSON.parse(profile.ability_background)
              : profile.ability_background)
            : null,
        },
        skills: userSkills,
        skillProgress,
        latestAssessment,
        latestMatch,
        latestCareerPlan,
      },
    });
  } catch (error) {
    console.error('[user/profile] GET Error:', error);
    return NextResponse.json({ code: 500, message: '获取用户画像失败' }, { status: 500 });
  }
}

// POST - 保存用户个人信息（保留原有功能）
export async function POST(request: NextRequest) {
  try {
    // 优先从 x-user-id header 获取
    let userId: string | null = request.headers.get('x-user-id');

    if (!userId) {
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      const token = cookieStore.get('auth_token')?.value;
      if (token) {
        try {
          const { data: { user } } = await supabase.auth.getUser(token);
          if (user) userId = user.id;
        } catch {
          // cookie 认证失败
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ code: 401, message: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const {
      personality_type,
      major,
      grade,
      graduation_year,
      city,
      job_intention,
      target_city,
      skills,
      internship_experience,
      project_experience,
      awards,
      ability_background,
    } = body;

    // 将 skills 转换为 jsonb 格式
    // 支持：数组字符串 ["a","b"]、逗号分隔字符串 "a,b"、对象数组 [{name,category,level}]、纯数组 ["a","b"]
    let skillsValue: unknown = null;
    if (skills !== null && skills !== undefined) {
      if (Array.isArray(skills)) {
        skillsValue = skills;
      } else if (typeof skills === 'string') {
        const trimmed = skills.trim();
        if (trimmed.startsWith('[')) {
          try { skillsValue = JSON.parse(trimmed); } catch { skillsValue = trimmed.split(',').map((s: string) => s.trim()).filter(Boolean); }
        } else if (trimmed.length > 0) {
          skillsValue = trimmed.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      }
    }

    // 使用 upsert 一步完成插入或更新
    console.log(`[user/profile] POST upsert for user_id=${userId}, major=${major}, grade=${grade}, target_city=${target_city}, job_intention=${job_intention}, skills_count=${Array.isArray(skillsValue) ? skillsValue.length : 0}`);
    const result = await supabase
      .from('user_profiles')
      .upsert({
        user_id: userId,
        personality_type,
        major,
        grade,
        graduation_year,
        city,
        job_intention,
        target_city,
        skills: skillsValue,
        internship_experience,
        project_experience,
        awards,
        ability_background,
        update_time: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (result.error) {
      console.error('[user/profile] 保存失败:', result.error.message, result.error.details, result.error.hint);
      return NextResponse.json({ code: 500, message: `保存失败: ${result.error.message}` }, { status: 500 });
    }

    console.log(`[user/profile] 保存成功, user_id=${userId}, record_id=${(result.data as Record<string, unknown>)?.id}`);
    return NextResponse.json({
      code: 200,
      message: '保存成功',
      data: result.data,
    });
  } catch (error) {
    console.error('[user/profile] POST Error:', error);
    return NextResponse.json({ code: 500, message: '服务异常' }, { status: 500 });
  }
}
