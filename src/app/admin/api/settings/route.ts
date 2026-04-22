import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 获取系统设置
export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const response = await fetch(`${baseUrl}/rest/v1/system_settings?select=*`, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey || '',
        'Authorization': `Bearer ${serviceKey || ''}`,
      } as HeadersInit
    });

    if (!response.ok) {
      console.error('获取设置失败:', response.status);
      return NextResponse.json({ code: 500, message: '获取设置失败' }, { status: 500 });
    }

    const data = await response.json();
    
    // 转换为键值对格式
    const settingsMap: Record<string, string> = {};
    (data || []).forEach((s: any) => {
      settingsMap[s.setting_key] = s.setting_value;
    });

    return NextResponse.json({
      code: 200,
      data: settingsMap
    });
  } catch (error) {
    console.error('获取系统设置失败:', error);
    return NextResponse.json({ code: 500, message: '获取设置失败' }, { status: 500 });
  }
}

// 更新系统设置
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { settings, adminId, adminUsername } = body;

    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // 更新每项设置
    for (const [key, value] of Object.entries(settings)) {
      await fetch(`${baseUrl}/rest/v1/system_settings?setting_key=eq.${key}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey || '',
          'Authorization': `Bearer ${serviceKey || ''}`,
          'Prefer': 'return=minimal'
        } as HeadersInit,
        body: JSON.stringify({ 
          setting_value: String(value),
          updated_at: new Date().toISOString()
        })
      });
    }

    // 记录操作日志
    await execSql(`
      INSERT INTO admin_operation_logs (admin_id, admin_username, operation_type, operation_content)
      VALUES (${adminId || 0}, '${adminUsername || 'unknown'}', 'settings_update', '更新系统设置')
    `);

    return NextResponse.json({
      code: 200,
      message: '设置已保存'
    });
  } catch (error) {
    console.error('保存系统设置失败:', error);
    return NextResponse.json({ code: 500, message: '保存失败' }, { status: 500 });
  }
}
