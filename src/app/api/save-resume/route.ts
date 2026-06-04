import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { parseAccessTokenFromCookie } from '@/lib/auth-cookies';

export async function POST(req: NextRequest) {
  try {
    const accessToken = parseAccessTokenFromCookie(req.headers);
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, resume_data } = body;
    if (!resume_data) {
      return NextResponse.json({ error: 'Missing resume_data' }, { status: 400 });
    }

    // Upsert: check if user already has a resume
    const { data: existing } = await supabase
      .from('resumes')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('resumes')
        .update({ title: title || '我的简历', data: resume_data, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (error) throw error;
      return NextResponse.json({ success: true, id: existing.id });
    }

    const { data, error } = await supabase
      .from('resumes')
      .insert({ user_id: user.id, title: title || '我的简历', data: resume_data, updated_at: new Date().toISOString() })
      .select().single();
    if (error) throw error;
    return NextResponse.json({ success: true, id: data.id });
  } catch (err: any) {
    console.error('[save-resume]', err);
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const accessToken = parseAccessTokenFromCookie(req.headers);
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('resumes')
      .select('id, title, data, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
