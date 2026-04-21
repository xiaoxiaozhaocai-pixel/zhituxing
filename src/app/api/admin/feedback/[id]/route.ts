import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 获取/更新单个工单
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('feedback')
      .select(`
        *,
        user:users(id, phone, nickname)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: '工单不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        userId: data.user_id,
        userPhone: data.user?.phone,
        userName: data.user?.nickname || '游客',
        content: data.content,
        type: data.type,
        status: data.status,
        contact: data.contact,
        reply: data.reply,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    });

  } catch (error) {
    console.error('获取工单详情失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}

// 回复工单
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { reply, status } = await request.json();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (reply !== undefined) {
      updateData.reply = reply;
    }

    if (status && ['pending', 'processing', 'resolved', 'closed'].includes(status)) {
      updateData.status = status;
    }

    const { data, error } = await supabase
      .from('feedback')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // 如果有用户ID，发送站内通知
    if (data.user_id && reply) {
      await supabase
        .from('notifications')
        .insert({
          user_id: data.user_id,
          title: '您的工单已回复',
          content: `您提交的「${data.content.slice(0, 20)}...」问题已有工作人员回复，请查看。`,
          type: 'system'
        });
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('回复工单失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
