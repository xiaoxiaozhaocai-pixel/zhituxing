import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { title, resume_data } = body;

    if (!resume_data) {
      return NextResponse.json({ error: 'Missing resume_data' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('resumes')
      .select('id')
      .eq('user_id', session.user.id)
      .limit(1)
      .single();

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
      .insert({ user_id: session.user.id, title: title || '我的简历', data: resume_data, updated_at: new Date().toISOString() })
      .select().single();
    if (error) throw error;
    return NextResponse.json({ success: true, id: data.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data } = await supabase
      .from('resumes')
      .select('id, title, data, updated_at')
      .eq('user_id', session.user.id)
      .order('updated_at', { ascending: false })
      .limit(10);

    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
