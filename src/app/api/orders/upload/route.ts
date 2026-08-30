import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

/**
 * /api/orders/upload
 *
 * 用户上传付款截图到 Supabase Storage（payment-screenshots bucket）
 * - multipart/form-data，字段名 file
 * - 路径：{user_id}/{timestamp}.{ext}
 * - 限制：≤5MB，image/jpeg | image/png | image/webp
 * - 返回 path（存库） + signed_url（1h，前端预览用）
 */

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const BUCKET = 'payment-screenshots';
const SIGNED_URL_TTL_SEC = 3600;

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ code: 401, message: '请先登录' }, { status: 401 });
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json({ code: 400, message: '请求格式错误' }, { status: 400 });
    }

    const file = form.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ code: 400, message: '缺少 file 字段' }, { status: 400 });
    }

    const mime = file.type || '';
    const ext = ALLOWED_TYPES[mime];
    if (!ext) {
      return NextResponse.json({ code: 400, message: '只支持 JPG / PNG / WebP 格式' }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json({ code: 400, message: '文件大小需在 0-5MB 之间' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const timestamp = Date.now();
    const path = `${user.id}/${timestamp}.${ext}`;

    const arrayBuf = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuf);

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, {
        contentType: mime,
        upsert: false,
      });

    if (upErr) {
      console.error('[orders upload] storage upload err:', upErr.message);
      return NextResponse.json({ code: 500, message: '上传失败：' + upErr.message }, { status: 500 });
    }

    // 给前端预览用的 signed URL（1h）
    const { data: signed, error: signErr } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SEC);

    if (signErr || !signed) {
      console.error('[orders upload] sign url err:', signErr?.message);
      // 上传已成功，预览 URL 失败不致命
      return NextResponse.json({
        code: 200,
        data: { path, signed_url: '' },
      });
    }

    return NextResponse.json({
      code: 200,
      data: { path, signed_url: signed.signedUrl },
    });
  } catch (err) {
    console.error('[orders upload] unexpected:', err);
    return NextResponse.json({ code: 500, message: '服务器错误' }, { status: 500 });
  }
}
