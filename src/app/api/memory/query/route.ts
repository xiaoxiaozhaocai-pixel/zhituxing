/**
 * /api/memory/query — Agent 共享记忆池 GET-only 端点
 * 供工具受限（只能发GET）的 Agent 使用
 * 支持：search / status
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MEMORY_API_KEY = process.env.MEMORY_API_KEY || '';
const SILICONFLOW_KEY = process.env.SILICONFLOW_API_KEY || '';
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPA_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || '';

function checkAuth(url: URL): boolean {
  const key = url.searchParams.get('key');
  return !!MEMORY_API_KEY && key === MEMORY_API_KEY;
}

function supabaseHeaders() {
  return { 'apikey': SUPA_SERVICE_KEY, 'Authorization': `Bearer ${SUPA_SERVICE_KEY}`, 'Content-Type': 'application/json' };
}

async function getEmbedding(text: string): Promise<number[]> {
  const r = await fetch('https://api.siliconflow.cn/v1/embeddings', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${SILICONFLOW_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'BAAI/bge-large-zh-v1.5', input: [text], encoding_format: 'float' }),
  });
  if (!r.ok) throw new Error(`Embedding error: ${r.status}`);
  const data = await r.json();
  return data.data[0].embedding;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  if (!checkAuth(url)) {
    return NextResponse.json({ status: 'error', message: 'unauthorized' }, { status: 401 });
  }

  const action = url.searchParams.get('action');
  const user_id = url.searchParams.get('user_id');
  if (!user_id) return NextResponse.json({ status: 'error', message: 'user_id required' }, { status: 400 });

  if (action === 'status') {
    try {
      const r = await fetch(`${SUPA_URL}/rest/v1/xiaozhi_memories?select=id,memory_type&user_id=eq.${encodeURIComponent(user_id)}`, { headers: supabaseHeaders() });
      if (!r.ok) return NextResponse.json({ status: 'error', message: await r.text() }, { status: 500 });
      const memories = await r.json();
      const byType: Record<string, number> = {};
      for (const m of memories) { const t = m.memory_type || 'general'; byType[t] = (byType[t] || 0) + 1; }
      return NextResponse.json({ status: 'ok', data: { total: memories.length, by_type: byType, user_id } });
    } catch (e) { return NextResponse.json({ status: 'error', message: String(e) }, { status: 500 }); }
  }

  if (action === 'search') {
    const query = url.searchParams.get('query') || '';
    const memory_type = url.searchParams.get('memory_type') || undefined;
    const top_k = parseInt(url.searchParams.get('top_k') || '10');
    if (!query) return NextResponse.json({ status: 'error', message: 'query required' }, { status: 400 });
    try {
      const embedding = await getEmbedding(query);
      const r = await fetch(`${SUPA_URL}/rest/v1/rpc/match_memories`, {
        method: 'POST', headers: supabaseHeaders(),
        body: JSON.stringify({ query_embedding: embedding, match_user_id: user_id, match_count: top_k * 2 }),
      });
      if (!r.ok) return NextResponse.json({ status: 'error', message: await r.text() }, { status: 500 });
      let results = await r.json();
      if (memory_type) results = results.filter((m: { memory_type?: string }) => m.memory_type === memory_type);
      results = results.slice(0, top_k);
      return NextResponse.json({ status: 'ok', data: results });
    } catch (e) { return NextResponse.json({ status: 'error', message: String(e) }, { status: 500 }); }
  }

  return NextResponse.json({ status: 'error', message: 'unknown action, supports: search, status' }, { status: 400 });
}
