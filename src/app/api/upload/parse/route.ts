import { NextRequest, NextResponse } from 'next/server';
import { PDFParse } from 'pdf-parse';

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
      const pdf = new PDFParse({ data: new Uint8Array(buffer) });
      const textResult = await pdf.getText();
      await pdf.destroy();
      const text = textResult.text.slice(0, 10000).trim();
      const pageCount = textResult.total;
      if (!text) {
        return NextResponse.json({ error: 'PDF无法提取文本，可能是扫描件或图片型PDF' }, { status: 422 });
      }
      return NextResponse.json({ text, pages: pageCount });
    }

    // DOCX — 动态导入，避免生产环境顶层 import 失败影响其他格式
    if (fileName.endsWith('.docx')) {
      try {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        const text = result.value.slice(0, 10000).trim();
        if (!text) {
          return NextResponse.json({ error: 'DOCX文件无法提取文本，文件可能为空或损坏' }, { status: 422 });
        }
        return NextResponse.json({ text, pages: 1 });
      } catch (e) {
        console.error('[upload/parse] mammoth failed:', e);
        return NextResponse.json({ error: 'DOCX解析失败，请尝试转为PDF后上传' }, { status: 422 });
      }
    }

    // DOC（旧格式兼容）
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
    const _err_ = err as Error;
    console.error('文件解析失败:', err);
    return NextResponse.json({ error: '文件解析失败: ' + (_err_.message || '未知错误') }, { status: 500 });
  }
}
