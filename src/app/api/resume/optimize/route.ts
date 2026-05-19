import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const supabase = getSupabaseAdmin();

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { resumeId, targetPosition, optimizedContent, suggestions } = body;

    const { data: optimization, error } = await supabase
      .from('resume_optimizations')
      .insert({
        user_id: userId,
        resume_id: resumeId,
        target_position: targetPosition,
        optimized_content: optimizedContent,
        suggestions,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: optimization });
  } catch (error) {
    console.error('优化简历失败:', error);
    return NextResponse.json({ error: '优化失败' }, { status: 500 });
  }
}
