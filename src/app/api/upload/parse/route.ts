export const dynamic = 'force-dynamic';

// Polyfill DOMMatrix for Node.js (pdf-parse / pdfjs-dist dependency)
if (typeof globalThis.DOMMatrix === 'undefined') {
  // @ts-expect-error - minimal polyfill
  globalThis.DOMMatrix = class {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    constructor(init?: string | number[]) {
      if (typeof init === 'string' && init.startsWith('matrix(')) {
        const m = init.slice(7, -1).split(',').map(Number);
        this.a = m[0] ?? 1; this.b = m[1] ?? 0;
        this.c = m[2] ?? 0; this.d = m[3] ?? 1;
        this.e = m[4] ?? 0; this.f = m[5] ?? 0;
      }
    }
    multiply() { return this; }
    translate() { return this; }
    scale() { return this; }
    rotate() { return this; }
    transformPoint(p: { x: number; y: number }) { return { x: p.x, y: p.y }; }
  };
}
if (typeof globalThis.Path2D === 'undefined') {
  // @ts-expect-error - minimal polyfill
  globalThis.Path2D = class {};
}

import { NextRequest, NextResponse } from 'next/server';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '未收到文件' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: '文件大小不能超过10MB' }, { status: 413 });
    }

    const fileName = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());

    // PDF
    if (fileName.endsWith('.pdf')) {
      try {
        const { PDFParse } = await import('pdf-parse');
        const pdf = new PDFParse({ data: new Uint8Array(buffer) });
        const textResult = await pdf.getText();
        await pdf.destroy();
        const text = textResult.text.slice(0, 10000).trim();
        if (!text) {
          return NextResponse.json({ error: 'PDF无法提取文本，可能是扫描件或图片型PDF' }, { status: 422 });
        }
        return NextResponse.json({ text, pages: textResult.total });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('[upload/parse] PDF error:', msg);
        return NextResponse.json({ error: `PDF解析失败: ${msg}` }, { status: 422 });
      }
    }

    // DOCX
    if (fileName.endsWith('.docx')) {
      try {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        const text = result.value.slice(0, 10000).trim();
        if (!text) {
          return NextResponse.json({ error: 'DOCX文件无法提取文本，文件可能为空或损坏' }, { status: 422 });
        }
        return NextResponse.json({ text, pages: 1 });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('[upload/parse] DOCX error:', msg);
        return NextResponse.json({ error: `DOCX解析失败: ${msg}` }, { status: 422 });
      }
    }

    // DOC
    if (fileName.endsWith('.doc')) {
      const raw = buffer.toString('utf-8');
      const text = raw.replace(/[^\x20-\x7E\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\n\r]/g, ' ').slice(0, 10000).trim();
      if (!text || text.length < 20) {
        return NextResponse.json({ error: '旧版 .doc 格式解析效果不佳，建议另存为 .docx 或 .pdf 后重新上传' }, { status: 422 });
      }
      return NextResponse.json({ text, pages: 1 });
    }

    // TXT
    if (fileName.endsWith('.txt')) {
      const text = buffer.toString('utf-8').slice(0, 10000);
      return NextResponse.json({ text, pages: 1 });
    }

    return NextResponse.json({ error: '暂不支持此格式，支持：PDF、DOCX、DOC、TXT' }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[upload/parse] route error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
