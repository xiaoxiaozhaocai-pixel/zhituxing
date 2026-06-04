import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { parseAccessTokenFromCookie } from '@/lib/auth-cookies';

export async function POST(req: NextRequest) {
  const accessToken = parseAccessTokenFromCookie(req.headers);
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !authData?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = authData.user.id;
  const body = await req.json();
  const { title, resume_data } = body;
  if (!resume_data) {
    return NextResponse.json({ error: 'Missing resume_data' }, { status: 400 });
  }

  const { data: rows, error: qError } = await supabase
    .from('resumes')
    .select('id')
    .eq('user_id', userId)
    .limit(1);

  if (qError) throw qError;

  if (rows && rows.length > 0) {
    const { error: uError } = await supabase
      .from('resumes')
      .update({ title: title || '我的简历', data: resume_data, updated_at: new Date().toISOString() })
      .eq('id', rows[0].id);
    if (uError) throw uError;
    return NextResponse.json({ success: true, id: rows[0].id });
  }

  const { data: inserted, error: iError } = await supabase
    .from('resumes')
    .insert({ user_id: userId, title: title || '我的简历', data: resume_data, updated_at: new Date().toISOString() })
    .select('id')
    .single();

  if (iError) throw iError;
  return NextResponse.json({ success: true, id: inserted.id });
}

export async function GET(req: NextRequest) {
  const accessToken = parseAccessTokenFromCookie(req.headers);
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !authData?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('resumes')
    .select('id, title, data, updated_at')
    .eq('user_id', authData.user.id)
    .order('updated_at', { ascending: false })
    .limit(10);

  if (error) throw error;
  return NextResponse.json(data || []);
}
