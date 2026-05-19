import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

// 直接执行SQL查询
async function execSql(sql: string): Promise<unknown[]> {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!baseUrl || !serviceKey) {
    console.error('Missing config:', { baseUrl, hasServiceKey: !!serviceKey });
    return [];
  }

  try {
    // 调用exec_sql RPC函数
    const response = await fetch(`${baseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ sql_query: sql })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SQL执行失败:', errorText);
      return [];
    }

    const data = await response.json();
    console.log('SQL执行结果:', data);
    
    // 处理返回的数据 - 可能是字符串或对象数组
    if (typeof data === 'string') {
      return JSON.parse(data);
    } else if (Array.isArray(data)) {
      return data;
    } else if (data && typeof data === 'object') {
      // 如果返回的是单个对象，可能是{result: ...}格式
      return [data];
    }
    return [];
  } catch (error) {
    console.error('SQL执行异常:', error);
    return [];
  }
}

// 发送验证码
export async function POST(request: NextRequest) {
  try {
    const { email, type = 'login' } = await request.json();

    // 从邮箱提取手机号
    const phone = email ? email.replace(/@test\.com$/i, '') : '';

    if (!email || !/^1[3-9]\d{9}@test\.com$/i.test(email)) {
      return NextResponse.json(
        { error: '请输入正确的邮箱格式（手机号@test.com）' },
        { status: 400 }
      );
    }

    // 生成6位验证码
    const effectiveType = type || 'login';
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 设置过期时间（5分钟后）
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // 先删除旧验证码
    const deleteUrl = `${baseUrl}/rest/v1/verification_codes?phone=eq.${phone}&used=eq.false`;
    await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'apikey': serviceKey || '',
        'Authorization': `Bearer ${serviceKey || ''}`
      }
    });

    // 插入新验证码
    const insertUrl = `${baseUrl}/rest/v1/verification_codes`;
    const response = await fetch(insertUrl, {
      method: 'POST',
      headers: {
        'apikey': serviceKey || '',
        'Authorization': `Bearer ${serviceKey || ''}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        phone,
        code,
        type: effectiveType,
        expires_at: expiresAt,
        used: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('插入验证码失败:', errorText);
      return NextResponse.json(
        { error: '发送验证码失败' },
        { status: 500 }
      );
    }

    console.log(`验证码已发送至 ${phone}: ${code}`);

    return NextResponse.json({
      success: true,
      message: '验证码已发送',
      code: process.env.NODE_ENV === 'development' ? code : undefined
    });

  } catch (error) {
    console.error('发送验证码失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
