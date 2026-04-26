/**
 * 用户个人信息API
 * GET: 获取当前用户个人信息
 * POST: 保存用户个人信息（upsert）
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 获取当前用户ID
async function getCurrentUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  
  if (!token) {
    return null;
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return null;
    }
    return user.id;
  } catch {
    return null;
  }
}

// GET - 获取用户个人信息
export async function GET() {
  try {
    const userId = await getCurrentUserId();
    
    if (!userId) {
      return NextResponse.json({ code: 401, message: '请先登录' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('获取用户信息失败:', error);
      return NextResponse.json({ code: 500, message: '获取失败' }, { status: 500 });
    }

    return NextResponse.json({
      code: 200,
      message: '获取成功',
      data: data || null
    });

  } catch (error) {
    console.error('API错误:', error);
    return NextResponse.json({ code: 500, message: '服务异常' }, { status: 500 });
  }
}

// POST - 保存用户个人信息
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    
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
      skills,
      internship_experience,
      project_experience,
      awards
    } = body;

    // 检查是否已有记录
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    let result;
    if (existing) {
      // 更新
      result = await supabase
        .from('user_profiles')
        .update({
          personality_type,
          major,
          grade,
          graduation_year,
          city,
          job_intention,
          skills,
          internship_experience,
          project_experience,
          awards,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();
    } else {
      // 新增
      result = await supabase
        .from('user_profiles')
        .insert({
          user_id: userId,
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
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error('保存失败:', result.error);
      return NextResponse.json({ code: 500, message: '保存失败' }, { status: 500 });
    }

    return NextResponse.json({
      code: 200,
      message: '保存成功',
      data: result.data
    });

  } catch (error) {
    console.error('API错误:', error);
    return NextResponse.json({ code: 500, message: '服务异常' }, { status: 500 });
  }
}
