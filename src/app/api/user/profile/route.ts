import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 用户信息接口
interface UserProfile {
  id: number;
  user_id: number;
  personality_type: string | null;
  major: string | null;
  grade: string | null;
  graduation_year: number | null;
  city: string | null;
  job_intention: string | null;
  skills: string | null;
  internship_experience: string | null;
  project_experience: string | null;
  awards: string | null;
  create_time: string;
  update_time: string;
}

// 获取用户个人信息
export async function GET(request: NextRequest) {
  try {
    // 从请求头获取用户ID
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { code: 401, message: '未登录', data: null },
        { status: 401 }
      );
    }

    // 查询用户个人信息
    const result = await execSql(
      `SELECT personality_type, major, grade, graduation_year, city, 
              job_intention, skills, internship_experience, project_experience, awards
       FROM user_profiles 
       WHERE user_id = '${userId}' 
       LIMIT 1`
    );

    if (!result || result.length === 0) {
      // 用户没有保存过个人信息
      return NextResponse.json({
        code: 200,
        message: 'success',
        data: {
          hasProfile: false,
          profile: null
        }
      });
    }

    const profile = result[0] as {
      personality_type: string | null;
      major: string | null;
      grade: string | null;
      graduation_year: number | null;
      city: string | null;
      job_intention: string | null;
      skills: string | null;
      internship_experience: string | null;
      project_experience: string | null;
      awards: string | null;
    };

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        hasProfile: true,
        profile
      }
    });

  } catch (error) {
    console.error('获取用户个人信息失败:', error);
    return NextResponse.json(
      { code: 500, message: '获取失败', data: null },
      { status: 500 }
    );
  }
}

// 保存/更新用户个人信息
export async function POST(request: NextRequest) {
  try {
    // 从请求头获取用户ID
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { code: 401, message: '未登录', data: null },
        { status: 401 }
      );
    }

    // 解析请求体
    const body = await request.json();
    
    const {
      personality_type,
      major,
      grade,
      graduation_year,
      city,
      job_intention,
      skills,
      internship_experience,
      project_experience,
      awards
    } = body;

    // 检查用户是否已有个人信息
    const existingResult = await execSql(
      `SELECT id FROM user_profiles WHERE user_id = '${userId}' LIMIT 1`
    );

    if (existingResult && existingResult.length > 0) {
      // 更新现有记录
      const updateFields: string[] = [];
      
      if (personality_type !== undefined) {
        updateFields.push(`personality_type = ${personality_type ? `'${personality_type}'` : 'NULL'}`);
      }
      if (major !== undefined) {
        updateFields.push(`major = ${major ? `'${major}'` : 'NULL'}`);
      }
      if (grade !== undefined) {
        updateFields.push(`grade = ${grade ? `'${grade}'` : 'NULL'}`);
      }
      if (graduation_year !== undefined) {
        updateFields.push(`graduation_year = ${graduation_year ? graduation_year : 'NULL'}`);
      }
      if (city !== undefined) {
        updateFields.push(`city = ${city ? `'${city}'` : 'NULL'}`);
      }
      if (job_intention !== undefined) {
        updateFields.push(`job_intention = ${job_intention ? `'${job_intention}'` : 'NULL'}`);
      }
      if (skills !== undefined) {
        updateFields.push(`skills = ${skills ? `'${skills}'` : 'NULL'}`);
      }
      if (internship_experience !== undefined) {
        updateFields.push(`internship_experience = ${internship_experience ? `'${internship_experience}'` : 'NULL'}`);
      }
      if (project_experience !== undefined) {
        updateFields.push(`project_experience = ${project_experience ? `'${project_experience}'` : 'NULL'}`);
      }
      if (awards !== undefined) {
        updateFields.push(`awards = ${awards ? `'${awards}'` : 'NULL'}`);
      }

      if (updateFields.length > 0) {
        await execSql(
          `UPDATE user_profiles SET ${updateFields.join(', ')}, update_time = CURRENT_TIMESTAMP WHERE user_id = '${userId}'`
        );
      }

      return NextResponse.json({
        code: 200,
        message: '保存成功',
        data: null
      });

    } else {
      // 新增记录
      await execSql(
        `INSERT INTO user_profiles (user_id, personality_type, major, grade, graduation_year, city, job_intention, skills, internship_experience, project_experience, awards)
         VALUES (
           '${userId}',
           ${personality_type ? `'${personality_type}'` : 'NULL'},
           ${major ? `'${major}'` : 'NULL'},
           ${grade ? `'${grade}'` : 'NULL'},
           ${graduation_year ? graduation_year : 'NULL'},
           ${city ? `'${city}'` : 'NULL'},
           ${job_intention ? `'${job_intention}'` : 'NULL'},
           ${skills ? `'${skills}'` : 'NULL'},
           ${internship_experience ? `'${internship_experience}'` : 'NULL'},
           ${project_experience ? `'${project_experience}'` : 'NULL'},
           ${awards ? `'${awards}'` : 'NULL'}
         )`
      );

      return NextResponse.json({
        code: 200,
        message: '保存成功',
        data: null
      });
    }

  } catch (error) {
    console.error('保存用户个人信息失败:', error);
    return NextResponse.json(
      { code: 500, message: '保存失败', data: null },
      { status: 500 }
    );
  }
}
