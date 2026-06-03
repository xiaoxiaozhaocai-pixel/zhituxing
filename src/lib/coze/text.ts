/**
 * 纯文本流模块（fallback，模拟打字效果）
 */

export function createTextStream(text: string): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let index = 0;
      const chunkSize = 5;

      while (index < text.length) {
        const chunk = text.slice(index, index + chunkSize);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: chunk })}\n\n`));
        index += chunkSize;
        await new Promise(resolve => setTimeout(resolve, 30));
      }

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
      controller.close();
    },
  });
}
