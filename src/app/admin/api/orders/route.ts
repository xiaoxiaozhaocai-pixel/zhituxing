import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-auth';

const supabase = getSupabaseAdmin();

export async function GET(request: NextRequest) {
  const _authCheck = requireAdmin(request);
  if (_authCheck) return _authCheck;
  try {
    const sp = request.nextUrl.searchParams;
    const status = sp.get('status') || 'pending';
    const signPath = sp.get('sign');
    if (signPath) return NextResponse.json({ code: 200, data: { url: signPath } });

    const { data: orders, error } = await supabase
      .from('membership_orders')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) { console.error('[orders]', error); return NextResponse.json({ code: 200, data: [] }); }
    return NextResponse.json({ code: 200, data: orders || [] });
  } catch (e) {
    console.error('[orders] GET:', e);
    return NextResponse.json({ code: 200, data: [] });
  }
}
