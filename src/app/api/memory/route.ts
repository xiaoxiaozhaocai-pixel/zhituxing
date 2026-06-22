/**
 * /api/memory — Agent 共享记忆池
 * 供 CCO/CBO/CGO/CTO/CSO/CFO 通过 HTTP 调用，共享 Supabase pgvector 记忆库
 * 
 * 鉴权：X-Memory-Key header (POST) 或 ?key=xxx query param (GET)
 * 隔离：每个 Agent 使用固定 user_id
 * Embedding：SiliconFlow BAAI/bge-large-zh-v1.5 (1024维)
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MEMORY_API_KEY = process.env.MEMORY_API_KEY || '';
const SILICONFLOW_KEY = process.env.SILICONFLOW_API_KEY || '';
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPA_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || '';

const EMBEDDING_MODEL = 'BAAI/bge-large-zh-v1.5';

// === 鉴权 ===

function checkAuth(request: NextRequest, url: URL): boolean {
  const headerKey = request.headers.get('x-memory-key');
  const queryKey = url.searchParams.get('key');
  return (headerKey !== null && headerKey === MEMORY_API_KEY) || (queryKey !== null && queryKey === MEMORY_API_KEY);
}

// === 工具函数 ===

async function getEmbedding(text: string): Promise<number[]> {
  const r = await fetch('https://api.siliconflow.cn/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SILICONFLOW_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: [text],
      encoding_format: 'float',
    }),
  });
  if (!r.ok) throw new Error(`SiliconFlow embedding error: ${r.status}`);
  const data = await r.json();
  return data.data[0].embedding;
}

function supabaseHeaders() {
  return {
    'apikey': SUPA_SERVICE_KEY,
    'Authorization': `Bearer ${SUPA_SERVICE_KEY}`,
    'Content-Type': 'application/json',
  };
}

// === 操作处理 ===

async function handleAdd(body: {
  user_id: string;
  content: string;
  memory_type?: string;
  importance?: number;
  metadata?: Record<string, unknown>;
}) {
  const { user_id, content, memory_type = 'general', importance = 0.5, metadata = {} } = body;
  if (!content) return NextResponse.json({ status: 'error', message: 'content required' }, { status: 400 });

  try {
    const dup = await fetch(
      `${SUPA_URL}/rest/v1/xiaozhi_memories?select=id&user_id=eq.${encodeURIComponent(user_id)}&content=eq.${encodeURIComponent(content)}&limit=1`,
      { headers: { ...supabaseHeaders(), 'Prefer': 'count=exact' } }
    );
    if (dup.ok) {
      const existing = await dup.json();
      if (existing.length > 0) {
        await fetch(
          `${SUPA_URL}/rest/v1/xiaozhi_memories?id=eq.${existing[0].id}`,
          { method: 'PATCH', headers: { ...supabaseHeaders(), 'Prefer': 'return=minimal' }, body: JSON.stringify({ last_accessed: new Date().toISOString() }) }
        );
        return NextResponse.json({ status: 'duplicate', action: 'touched', id: existing[0].id });
      }
    }

    const embedding = await getEmbedding(content);
    const similar = await fetch(`${SUPA_URL}/rest/v1/rpc/match_memories`, {
      method: 'POST',
      headers: supabaseHeaders(),
      body: JSON.stringify({ query_embedding: embedding, match_user_id: user_id, match_count: 3 }),
    });
    if (similar.ok) {
      const similarData = await similar.json();
      if (similarData.length > 0 && similarData[0].similarity >= 0.85) {
        return NextResponse.json({
          status: 'conflict',
          action: 'skipped',
          conflict_with: { id: similarData[0].id, content: similarData[0].content, similarity: similarData[0].similarity },
        });
      }
    }

    const now = new Date().toISOString();
    const r = await fetch(`${SUPA_URL}/rest/v1/xiaozhi_memories`, {
      method: 'POST',
      headers: { ...supabaseHeaders(), 'Prefer': 'return=representation' },
      body: JSON.stringify({
        user_id, content, embedding, memory_type, importance, metadata,
        created_at: now, last_accessed: now, access_count: 0,
      }),
    });
    if (!r.ok) {
      const err = await r.text();
      return NextResponse.json({ status: 'error', message: err }, { status: 500 });
    }
    const record = (await r.json())[0];
    return NextResponse.json({ status: 'created', id: record.id, content });
  } catch (e) {
    return NextResponse.json({ status: 'error', message: String(e) }, { status: 500 });
  }
}

async function handleSearch(body: { user_id: string; query: string; memory_type?: string; top_k?: number }) {
  const { user_id, query, memory_type, top_k = 10 } = body;
  if (!query) return NextResponse.json({ status: 'error', message: 'query required' }, { status: 400 });

  try {
    const embedding = await getEmbedding(query);
    const r = await fetch(`${SUPA_URL}/rest/v1/rpc/match_memories`, {
      method: 'POST',
      headers: supabaseHeaders(),
      body: JSON.stringify({ query_embedding: embedding, match_user_id: user_id, match_count: top_k * 2 }),
    });
    if (!r.ok) {
      const err = await r.text();
      return NextResponse.json({ status: 'error', message: err }, { status: 500 });
    }
    let results = await r.json();

    if (memory_type) {
      results = results.filter((m: { memory_type: string }) => m.memory_type === memory_type);
    }
    results = results.slice(0, top_k);

    for (const mem of results) {
      fetch(`${SUPA_URL}/rest/v1/xiaozhi_memories?id=eq.${mem.id}`, {
        method: 'PATCH',
        headers: { ...supabaseHeaders(), 'Prefer': 'return=minimal' },
        body: JSON.stringify({ last_accessed: new Date().toISOString(), access_count: (mem.access_count || 0) + 1 }),
      }).catch(() => {});
    }

    return NextResponse.json({ status: 'ok', data: results });
  } catch (e) {
    return NextResponse.json({ status: 'error', message: String(e) }, { status: 500 });
  }
}

async function handleForget(body: { user_id: string; memory_id: string }) {
  const { user_id, memory_id } = body;
  if (!memory_id) return NextResponse.json({ status: 'error', message: 'memory_id required' }, { status: 400 });

  try {
    const r = await fetch(
      `${SUPA_URL}/rest/v1/xiaozhi_memories?id=eq.${encodeURIComponent(memory_id)}&user_id=eq.${encodeURIComponent(user_id)}`,
      { method: 'DELETE', headers: { ...supabaseHeaders(), 'Prefer': 'return=minimal' } }
    );
    if (r.ok) return NextResponse.json({ status: 'deleted', id: memory_id });
    return NextResponse.json({ status: 'error', message: await r.text() }, { status: 500 });
  } catch (e) {
    return NextResponse.json({ status: 'error', message: String(e) }, { status: 500 });
  }
}

async function handleStatus(body: { user_id: string }) {
  const { user_id } = body;

  try {
    const r = await fetch(
      `${SUPA_URL}/rest/v1/xiaozhi_memories?select=id,memory_type&user_id=eq.${encodeURIComponent(user_id)}`,
      { headers: supabaseHeaders() }
    );
    if (!r.ok) return NextResponse.json({ status: 'error', message: await r.text() }, { status: 500 });

    const memories = await r.json();
    const byType: Record<string, number> = {};
    for (const m of memories) {
      const t = m.memory_type || 'general';
      byType[t] = (byType[t] || 0) + 1;
    }

    return NextResponse.json({ status: 'ok', data: { total: memories.length, by_type: byType, user_id } });
  } catch (e) {
    return NextResponse.json({ status: 'error', message: String(e) }, { status: 500 });
  }
}

// === POST 主入口（完整功能） ===

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  if (!MEMORY_API_KEY || !checkAuth(request, url)) {
    return NextResponse.json({ status: 'error', message: 'unauthorized' }, { status: 401 });
  }

  let body: { action?: string; user_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: 'error', message: 'invalid json' }, { status: 400 });
  }

  const { action, user_id } = body;
  if (!user_id) return NextResponse.json({ status: 'error', message: 'user_id required' }, { status: 400 });

  switch (action) {
    case 'add': return handleAdd(body as Parameters<typeof handleAdd>[0]);
    case 'search': return handleSearch(body as Parameters<typeof handleSearch>[0]);
    case 'forget': return handleForget(body as Parameters<typeof handleForget>[0]);
    case 'status': return handleStatus(body as Parameters<typeof handleStatus>[0]);
    default: return NextResponse.json({ status: 'error', message: `unknown action: ${action}` }, { status: 400 });
  }
}

// === GET 入口（仅 read-only：search + status，供工具受限的 Agent 使用） ===
// 注意：GET 会把 key 暴露在 URL 中，仅内部使用

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  if (!MEMORY_API_KEY || !checkAuth(request, url)) {
    return NextResponse.json({ status: 'error', message: 'unauthorized' }, { status: 401 });
  }

  const action = url.searchParams.get('action');
  const user_id = url.searchParams.get('user_id');
  if (!user_id) return NextResponse.json({ status: 'error', message: 'user_id required' }, { status: 400 });

  switch (action) {
    case 'search': {
      const query = url.searchParams.get('query') || '';
      const memory_type = url.searchParams.get('memory_type') || undefined;
      const top_k = parseInt(url.searchParams.get('top_k') || '10');
      return handleSearch({ user_id, query, memory_type, top_k });
    }
    case 'status':
      return handleStatus({ user_id });
    default:
      return NextResponse.json({ status: 'error', message: 'GET only supports search and status' }, { status: 400 });
  }
}
