/**
 * Coze 用户上下文模块
 * 从 Supabase 获取用户个人信息并构建注入上下文字符串
 */

/**
 * 获取用户个人信息并构建上下文
 */
export async function getUserProfileContext(userId: string): Promise<string> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/user_profiles?user_id=eq.${encodeURIComponent(userId)}&select=personality_type,major,grade,graduation_year,target_job,target_cities,target_industry,gpa,economic_pressure,career_tendency,hard_skills,soft_skills,internship_experience,project_experience,awards&limit=1`,
      {
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
        },
      }
    );

    if (!res.ok) return '';

    const data = await res.json();
    if (!data || data.length === 0) return '';

    const profile = data[0] as {
      personality_type: string | null;
      major: string | null;
      grade: string | null;
      graduation_year: string | null;
      target_job: string | null;
      target_cities: unknown;
      target_industry: string | null;
      gpa: string | null;
      economic_pressure: string | null;
      career_tendency: string | null;
      hard_skills: unknown;
      soft_skills: unknown;
      internship_experience: unknown;
      project_experience: unknown;
      awards: unknown;
    };

    const contextParts: string[] = [];

    // === 基础信息 ===
    if (profile.personality_type) contextParts.push(`人格测评结果：${profile.personality_type}`);
    if (profile.major) contextParts.push(`专业：${profile.major}`);
    if (profile.grade) contextParts.push(`年级：${profile.grade}`);
    if (profile.graduation_year) contextParts.push(`毕业年份：${profile.graduation_year}年`);
    if (profile.target_job) contextParts.push(`目标岗位：${profile.target_job}`);

    // === 技能画像相关 ===
    if (profile.target_industry) contextParts.push(`意向行业：${profile.target_industry}`);
    if (profile.target_cities) {
      const cities = profile.target_cities;
      if (Array.isArray(cities) && cities.length > 0) {
        contextParts.push(`意向工作城市：${cities.join('、')}`);
      }
    }

    // 硬技能解析（jsonb，支持数组或对象数组）
    if (profile.hard_skills) {
      const skills = profile.hard_skills;
      if (Array.isArray(skills)) {
        const names = skills.map((s: unknown) =>
          typeof s === 'object' && s !== null ? (s as Record<string, unknown>).name || (s as Record<string, unknown>).skill : s
        ).filter(Boolean);
        if (names.length > 0) contextParts.push(`专业技能：${names.join('、')}`);
      }
    }

    // 软技能解析
    if (profile.soft_skills) {
      const skills = profile.soft_skills;
      if (Array.isArray(skills)) {
        const names = skills.map((s: unknown) =>
          typeof s === 'object' && s !== null ? (s as Record<string, unknown>).name || (s as Record<string, unknown>).skill : s
        ).filter(Boolean);
        if (names.length > 0) contextParts.push(`软技能：${names.join('、')}`);
      }
    }

    // === 考研就业决策相关 ===
    if (profile.gpa) contextParts.push(`GPA/成绩：${profile.gpa}`);
    if (profile.economic_pressure) {
      const ecoMap: Record<string, string> = {
        'none': '无经济压力',
        'little': '有一定压力',
        'heavy': '压力较大',
      };
      contextParts.push(`家庭经济情况：${ecoMap[profile.economic_pressure] || profile.economic_pressure}`);
    }
    if (profile.career_tendency) {
      const tendMap: Record<string, string> = {
        'academic': '偏学术研究',
        'practice': '偏实践工作',
        'undecided': '还没想好',
      };
      contextParts.push(`发展偏好：${tendMap[profile.career_tendency] || profile.career_tendency}`);
    }

    // === 经历相关 ===
    if (profile.internship_experience) {
      const exp = profile.internship_experience;
      if (Array.isArray(exp)) {
        const summaries = exp.slice(0, 3).map((e: Record<string, unknown>) =>
          [e.company, e.position, e.duration].filter(Boolean).join(' - ')
        );
        if (summaries.length > 0) contextParts.push(`实习经历：${summaries.join('；')}`);
      } else if (typeof exp === 'string') {
        contextParts.push(`实习经历：${exp}`);
      }
    }
    if (profile.project_experience) {
      const exp = profile.project_experience;
      if (Array.isArray(exp)) {
        const summaries = exp.slice(0, 3).map((e: Record<string, unknown>) =>
          [e.name, e.role, e.description?.toString().slice(0, 50)].filter(Boolean).join(' - ')
        );
        if (summaries.length > 0) contextParts.push(`项目经历：${summaries.join('；')}`);
      } else if (typeof exp === 'string') {
        contextParts.push(`项目经历：${exp}`);
      }
    }
    if (profile.awards) {
      const awards = profile.awards;
      if (Array.isArray(awards)) {
        const names = awards.map((a: unknown) =>
          typeof a === 'object' && a !== null ? (a as Record<string, unknown>).name || (a as Record<string, unknown>).title : a
        ).filter(Boolean);
        if (names.length > 0) contextParts.push(`获奖情况：${names.join('、')}`);
      } else if (typeof awards === 'string') {
        contextParts.push(`获奖情况：${awards}`);
      }
    }

    if (contextParts.length === 0) return '';

    return `\n【用户个人信息（已保存）】\n${contextParts.join('\n')}\n请基于以上用户信息提供个性化建议。\n---\n`;
  } catch (error) {
    console.error('获取用户个人信息失败:', error);
    return '';
  }
}
