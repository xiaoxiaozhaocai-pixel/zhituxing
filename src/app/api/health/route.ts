import { getSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('job_descriptions').select('id').limit(1);
    if (error) throw error;
    return NextResponse.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ status: 'error', database: 'disconnected', error: String(error) }, { status: 503 });
  }
}
