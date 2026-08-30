import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ============================================================
// 配置
// ============================================================
const MAX_EVENTS_PER_BATCH = 50;
const MAX_EVENT_DATA_SIZE = 4 * 1024; // 4KB / event_data
const IP_HASH_SALT = process.env.ANALYTICS_IP_SALT || 'zhituxing-default-salt-v1';

// 与前端 AnalyticsTracker 枚举保持一致
const ALLOWED_EVENT_TYPES = new Set([
  'page_view',
  'chat_send',
  'match_view',
  'assessment_start',
  'assessment_complete',
  'learning_path_view',
  'skill_graph_explore',
  'paywall_show',
  'paywall_convert',
  'interview_start',
  'interview_complete',
]);

// ============================================================
// 工具
// ============================================================
function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return createHash('sha256').update(ip + IP_HASH_SALT).digest('hex').slice(0, 16);
}

function extractIp(request: NextRequest): string | null {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  const xri = request.headers.get('x-real-ip');
  if (xri) return xri.trim();
  return null;
}

interface EventInput {
  event_type?: unknown;
  user_id?: unknown;
  event_data?: unknown;
  session_id?: unknown;
  membership_type?: unknown;
  timestamp?: unknown;
}

interface EventRow {
  event_type: string;
  user_id: string | null;
  session_id: string | null;
  membership_type: string;
  event_data: Record<string, unknown>;
  page_url: string | null;
  ip_hash: string | null;
}

function sanitizeEvent(raw: EventInput, ipHash: string | null): EventRow | null {
  if (typeof raw.event_type !== 'string') return null;
  if (!ALLOWED_EVENT_TYPES.has(raw.event_type)) return null;

  const userId =
    typeof raw.user_id === 'string' || typeof raw.user_id === 'number'
      ? String(raw.user_id).slice(0, 128)
      : null;
  const sessionId = typeof raw.session_id === 'string' ? raw.session_id.slice(0, 128) : null;
  const membershipType = typeof raw.membership_type === 'string'
    ? raw.membership_type.slice(0, 32)
    : 'free';

  let eventData: Record<string, unknown> = {};
  if (raw.event_data && typeof raw.event_data === 'object') {
    try {
      const serialized = JSON.stringify(raw.event_data);
      if (serialized.length <= MAX_EVENT_DATA_SIZE) {
        eventData = raw.event_data as Record<string, unknown>;
      }
    } catch {
      // 序列化失败则丢弃
    }
  }

  // 从 event_data 提取 page_url（usePageView 会塞 url 字段）
  let pageUrl: string | null = null;
  const candidate = eventData.url ?? eventData.page;
  if (typeof candidate === 'string' && candidate.length <= 512) {
    pageUrl = candidate;
  }

  return {
    event_type: raw.event_type.slice(0, 64),
    user_id: userId,
    session_id: sessionId,
    membership_type: membershipType,
    event_data: eventData,
    page_url: pageUrl,
    ip_hash: ipHash,
  };
}

// ============================================================
// POST — 上报行为事件
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: true, ingested: 0 });
    }

    const events = Array.isArray((body as { events?: unknown }).events)
      ? ((body as { events: unknown[] }).events as EventInput[])
      : [];

    if (events.length === 0) {
      return NextResponse.json({ success: true, ingested: 0 });
    }

    // 防刷：硬截断
    const batch = events.slice(0, MAX_EVENTS_PER_BATCH);
    const ipHash = hashIp(extractIp(request));

    const rows: EventRow[] = [];
    for (const raw of batch) {
      const row = sanitizeEvent(raw, ipHash);
      if (row) rows.push(row);
    }

    if (rows.length === 0) {
      return NextResponse.json({ success: true, ingested: 0 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      // 环境变量缺失：不让前端感知，仅日志
      console.error('[analytics] missing supabase env');
      return NextResponse.json({ success: true, ingested: 0 });
    }

    const res = await fetch(`${supabaseUrl}/rest/v1/analytics_events`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(rows),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[analytics] insert failed', res.status, text);
      // 不暴露细节给前端
      return NextResponse.json({ success: true, ingested: 0 });
    }

    return NextResponse.json({ success: true, ingested: rows.length });
  } catch (e) {
    console.error('[analytics] handler error', e);
    return NextResponse.json({ success: true, ingested: 0 });
  }
}

// ============================================================
// GET — 健康检查
// ============================================================
export async function GET() {
  return NextResponse.json({ success: true });
}
