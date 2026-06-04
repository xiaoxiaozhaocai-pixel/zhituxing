import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { parseAccessTokenFromCookie } from '@/lib/auth-cookies';

export async function POST(req: NextRequest) {
  try {
    const accessToken = parseAccessTokenFromCookie(req.headers);
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabaseAdmin();
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !authData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { title, resume_data } = body;
    if (!resume_data) return NextResponse.json({ error: 'Missing resume_data' }, { status: 400 });

    const userId = authData.user.id;
    const { data: rows } = await supabase.from('resumes').select('id').eq('user_id', userId).limit(1);

    if (rows && rows.length > 0) {
      await supabase.from('resumes').update({
        title: title || '我的简历', data: resume_data, updated_at: new Date().toISOString()
      }).eq('id', rows[0].id);
      return NextResponse.json({ success: true, id: rows[0].id });
    }

    const { data: inserted, error } = await supabase.from('resumes').insert({
      user_id: userId, title: title || '我的简历', data: resume_data, updated_at: new Date().toISOString()
    }).select('id').single();

    if (error) throw error;
    return NextResponse.json({ success: true, id: inserted.id });
  } catch (err: any) {
    return NextResponse.json({ error: '保存失败' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const accessToken = parseAccessTokenFromCookie(req.headers);
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabaseAdmin();
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !authData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase.from('resumes')
      .select('id, title, data, updated_at')
      .eq('user_id', authData.user.id)
      .order('updated_at', { ascending: false }).limit(10);

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: '读取失败' }, { status: 500 });
  }
}
