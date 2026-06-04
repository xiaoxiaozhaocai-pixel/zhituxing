import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

// GET: 加载用户简历
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: '缺少 userId' }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('resumes')
      .select('id, title, data, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('[resume] Load error:', error);
      return NextResponse.json({ error: '加载失败' }, { status: 500 });
    }
    
    return NextResponse.json({ resume: data || null });
  } catch (err) {
    console.error('[resume] GET error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// POST: 保存简历
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, title, data: resumeData } = body;
    
    if (!userId || !resumeData) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    
    const { data: existing } = await supabase
      .from('resumes')
      .select('id')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1);
    
    let result;
    if (existing && existing.length > 0) {
      result = await supabase
        .from('resumes')
        .update({ title: title || '我的简历', data: resumeData, updated_at: new Date().toISOString() })
        .eq('id', existing[0].id)
        .select('id')
        .single();
    } else {
      result = await supabase
        .from('resumes')
        .insert({ user_id: userId, title: title || '我的简历', data: resumeData })
        .select('id')
        .single();
    }
    
    if (result.error) {
      console.error('[resume] Save error:', result.error);
      return NextResponse.json({ error: '保存失败' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, id: result.data.id });
  } catch (err) {
    console.error('[resume] POST error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
