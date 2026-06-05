import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { SettingItem } from '@/lib/types';

const supabase = getSupabaseAdmin();

// 获取系统设置
export async function GET(request: NextRequest) {
  try {
    const { data: settings } = await supabase
      .from('system_settings')
      .select('*')
      .order('key');

    // 转换为对象格式
    const settingsObj = (settings || []).reduce((acc: Record<string, string>, item: SettingItem) => {
      acc[item.key] = item.value;
      return acc;
    }, {});

    return NextResponse.json({
      code: 200,
      data: settingsObj
    });
  } catch (error) {
    console.error('获取设置失败:', error);
    return NextResponse.json({ code: 500, message: '获取失败' }, { status: 500 });
  }
}

// 更新设置
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value, adminId, adminUsername } = body;

    if (!key) {
      return NextResponse.json({ code: 400, message: '缺少key' }, { status: 400 });
    }

    const { error } = await supabase
      .from('system_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() });

    if (error) throw error;

    // 记录操作日志
    await supabase.from('admin_operation_logs').insert({
      admin_id: adminId || 0,
      admin_username: adminUsername || 'unknown',
      operation_type: 'settings_update',
      operation_content: `更新设置: ${key} = ${JSON.stringify(value)}`
    });

    return NextResponse.json({ code: 200, message: '更新成功' });
  } catch (error) {
    console.error('更新设置失败:', error);
    return NextResponse.json({ code: 500, message: '操作失败' }, { status: 500 });
  }
}
