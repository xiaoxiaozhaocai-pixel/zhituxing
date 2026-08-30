/**
 * 数据贡献单独同意 API
 * 
 * 依据：个人信息保护法
 * 用户数据用于AI模型训练需单独同意，与个性化推荐脱钩
 * 
 * GET   - 查询用户数据贡献状态
 * POST  - 开启/关闭数据贡献
 * DELETE - 撤回数据贡献授权
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 当前生效的告知文本
const CONTRIBUTION_DISCLOSURE = {
  purpose: 'AI模型训练与优化',
  scope: '脱敏、聚合后的使用数据（包括岗位浏览、匹配结果反馈、能力评估分数等统计特征），不包含个人身份信息、对话原文或原始简历内容',
  retention: '训练后仅保留聚合统计特征，不保留个人原始数据',
};

/**
 * GET - 查询用户数据贡献状态
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('data_contribution')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[data-contribution] 查询失败:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({
        enabled: false,
        exists: false,
        disclosure: CONTRIBUTION_DISCLOSURE,
      });
    }

    return NextResponse.json({
      enabled: data.contribution_enabled && !data.withdrawn_at,
      exists: true,
      withdrawn: !!data.withdrawn_at,
      consented_at: data.consented_at,
      withdrawn_at: data.withdrawn_at,
      disclosure: { ...CONTRIBUTION_DISCLOSURE },
    });
  } catch (err) {
    console.error('[data-contribution] GET 异常:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

/**
 * POST - 开启或关闭数据贡献
 * Body: { enabled: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const enable = body.enabled === true;

    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '';
    const ua = request.headers.get('user-agent') || '';

    const { data, error } = await supabase
      .from('data_contribution')
      .upsert(
        {
          user_id: userId,
          contribution_enabled: enable,
          consented_at: enable ? now : null,
          withdrawn_at: enable ? null : (body.enabled === false ? now : null),
          ip_address: ip,
          user_agent: ua,
          updated_at: now,
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('[data-contribution] 保存失败:', error);
      return NextResponse.json({ error: '保存失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      enabled: data.contribution_enabled,
      consented_at: data.consented_at,
    });
  } catch (err) {
    console.error('[data-contribution] POST 异常:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

/**
 * DELETE - 撤回数据贡献授权
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('data_contribution')
      .update({
        contribution_enabled: false,
        withdrawn_at: now,
        updated_at: now,
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: true,
          message: '未找到授权记录，无需撤回',
        });
      }
      console.error('[data-contribution] 撤回失败:', error);
      return NextResponse.json({ error: '撤回失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      withdrawn: true,
      withdrawn_at: data.withdrawn_at,
    });
  } catch (err) {
    console.error('[data-contribution] DELETE 异常:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
