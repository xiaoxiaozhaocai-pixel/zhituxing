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

    if (fileName.endsWith('.txt')) {
      const text = buffer.toString('utf-8').slice(0, 10000);
      return NextResponse.json({ text, pages: 1 });
    }

    return NextResponse.json({ error: '暂不支持此格式，请转为PDF或TXT后上传' }, { status: 400 });
  } catch (err: unknown) {
    const _err_ = err as Error;
    console.error('文件解析失败:', err);
    return NextResponse.json({ error: '文件解析失败: ' + (_err_.message || '未知错误') }, { status: 500 });
  }
}
