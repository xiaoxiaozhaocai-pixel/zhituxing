/**
 * 生物识别信息单独同意 API
 * 
 * 依据：《个人信息保护法》第29条
 * 敏感个人信息（包括生物识别信息）需取得个人单独同意
 * 
 * GET  - 查询用户同意状态
 * POST - 授予单独同意
 * DELETE - 撤回同意
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 当前生效的告知文本（需与前端弹窗内容保持同步）
const CONSENT_DISCLOSURE = {
  purpose: 'AI模拟面试生物特征识别',
  scope: '面试过程中的语音特征、面部表情特征、回答内容的行为特征分析，用于评估面试表现和提供改进建议',
  retention: '面试会话结束后立即删除，不保留原始生物特征数据',
};

/**
 * GET - 查询用户生物识别同意状态
 * 返回 { consented: boolean, can_withdraw: boolean, details: {...} }
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('biometric_consent')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[biometric-consent] 查询失败:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    // 没有记录 = 从未授权
    if (!data) {
      return NextResponse.json({
        consented: false,
        exists: false,
        disclosure: CONSENT_DISCLOSURE,
      });
    }

    return NextResponse.json({
      consented: data.consent_granted && !data.withdrawn_at,
      exists: true,
      withdrawn: !!data.withdrawn_at,
      consented_at: data.consented_at,
      withdrawn_at: data.withdrawn_at,
      disclosure: {
        purpose: data.consent_purpose,
        scope: data.data_processing_scope,
        retention: data.retention_period,
      },
    });
  } catch (err) {
    console.error('[biometric-consent] GET 异常:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

/**
 * POST - 授予生物识别信息单独同意
 * Body: { purpose, scope, retention } (可选，不传则使用服务端默认值)
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const supabase = getSupabaseAdmin();

    const now = new Date().toISOString();
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '';
    const ua = request.headers.get('user-agent') || '';

    const { data, error } = await supabase
      .from('biometric_consent')
      .upsert(
        {
          user_id: userId,
          consent_granted: true,
          consent_purpose: body.purpose || CONSENT_DISCLOSURE.purpose,
          data_processing_scope: body.scope || CONSENT_DISCLOSURE.scope,
          retention_period: body.retention || CONSENT_DISCLOSURE.retention,
          consented_at: now,
          withdrawn_at: null, // 重新授权时清除撤回标记
          ip_address: ip,
          user_agent: ua,
          updated_at: now,
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('[biometric-consent] 保存失败:', error);
      return NextResponse.json({ error: '保存失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      consented: true,
      consented_at: data.consented_at,
    });
  } catch (err) {
    console.error('[biometric-consent] POST 异常:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

/**
 * DELETE - 撤回生物识别信息单独同意
 * 软删除：设置 withdrawn_at，不清除记录
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
      .from('biometric_consent')
      .update({
        consent_granted: false,
        withdrawn_at: now,
        updated_at: now,
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      // 如果用户从未授权过，不存在记录
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: true,
          message: '未找到同意记录，无需撤回',
        });
      }
      console.error('[biometric-consent] 撤回失败:', error);
      return NextResponse.json({ error: '撤回失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      withdrawn: true,
      withdrawn_at: data.withdrawn_at,
    });
  } catch (err) {
    console.error('[biometric-consent] DELETE 异常:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
