# 任务：修复 P1 Bug #5 — DeepSeek 分支 SSE chunk 格式与 Coze 不一致

## 根因（主控已核查确认）

`career-planning/stream/route.ts` 第 124 行起的 `if (USE_DEEPSEEK)` 分支调用 `createDeepSeekRAGStream` → `createDeepSeekSSEStream`，该函数输出格式：

```
data: {"choices":[{"delta":{"content":"..."}}]}\n\n
data: [DONE]\n\n
```

但 Coze 分支（`createCozeSSEStream`）输出格式：

```
data: {"type":"text","content":"..."}\n\n
data: {"type":"done"}\n\n
data: {"type":"error","message":"..."}\n\n
event: structured_data\ndata: {"type":"xxx","data":{...}}\n\n
```

前端按 `parsed.type === 'text'` / `'done'` / `'error'` 解析。结果 DS 分支：
- 文本 chunk 全丢（因为 `parsed.type` 是 undefined）
- 流不会被认为是 done（`[DONE]` 没有 type 字段）

## 修复方向（请你选一个最稳的）

**方案 A**：修改 `src/lib/deepseek-chat.ts` 的 `createDeepSeekSSEStream`，让它输出 Coze 兼容格式。优点：一次修复影响所有 DS 调用方；缺点：可能影响其他直接消费 OpenAI 格式的代码（如果有的话）。

**方案 B**：在 `src/lib/rag-utils.ts` 的 `createDeepSeekRAGStream` 里包一层 transform，把 OpenAI 格式转 Coze 格式。优点：影响范围小；缺点：每个 RAG 路由都要单独考虑。

**方案 C**：在 `career-planning/stream/route.ts` 的 DS 分支里 pipe 一层 TransformStream。优点：最小爆炸半径；缺点：其他用 DS 的路由也得各自加一层。

请你先回答：
1. grep 一下还有哪些路由用 `createDeepSeekSSEStream` 或 `createDeepSeekRAGStream`？（假设你知道，否则建议 grep 命令）
2. 在三个方案里选一个最优的，并说明理由
3. 给 unified diff 补丁（按你选的方案）
4. 同时把"text/done/error/structured_data" 四种 chunk 类型都覆盖到（不要漏 error）

---

## 代码上下文

### src/lib/deepseek-chat.ts（DS SSE 生成器）
```ts
/**
 * DeepSeek 流式聊天封装
 * 用于智能体迁移：替代Coze Bot，使用DeepSeek API + 本地RAG
 */

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DeepSeekStreamOptions {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  onChunk?: (chunk: string) => void;
  signal?: AbortSignal;
}

/**
 * 调用DeepSeek流式API，返回完整的文本响应
 */
export async function deepSeekChat(options: DeepSeekStreamOptions): Promise<string> {
  const {
    messages,
    model = DEEPSEEK_MODEL,
    temperature = 0.7,
    maxTokens = 4096,
    onChunk,
    signal,
  } = options;

  if (!DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY not configured');
  }

  const response = await fetch(DEEPSEEK_BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: !!onChunk,
    }),
    signal,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} ${error}`);
  }

  // 非流式
  if (!onChunk) {
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  // 流式读取
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let fullContent = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      if (!trimmed.startsWith('data: ')) continue;

      try {
        const data = JSON.parse(trimmed.slice(6));
        const content = data.choices?.[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          onChunk(content);
        }
      } catch {
        // 跳过解析失败的行
      }
    }
  }

  return fullContent;
}

/**
 * 将DeepSeek流式响应转换为SSE格式（兼容前端EventSource消费）
 */
export function createDeepSeekSSEStream(options: DeepSeekStreamOptions): ReadableStream {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        await deepSeekChat({
          ...options,
          onChunk: (chunk) => {
            const data = JSON.stringify({
              choices: [{ delta: { content: chunk } }],
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          },
        });
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`));
        controller.close();
      }
    },
  });
}
```

### src/lib/rag-utils.ts createDeepSeekRAGStream（节选）
```ts

// ============================================================
// 功能4：createDeepSeekRAGStream - 创建DeepSeek RAG流
// ============================================================

/**
 * 创建 DeepSeek RAG SSE 流
 * @param systemPrompt 系统提示词（含 RAG 上下文）
 * @param userMessage 用户消息
 * @param history 对话历史（可选）
 * @returns ReadableStream（SSE 格式）
 */
export function createDeepSeekRAGStream(
  systemPrompt: string,
  userMessage: string,
  history?: ChatMessage[]
): ReadableStream {
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...(history || []),
    { role: 'user', content: userMessage },
  ];

  return createDeepSeekSSEStream({ messages });
}

/**
 * 创建带 RAG 上下文的系统提示词
 * @param basePrompt 基础提示词
 * @param ragContext RAG 上下文
 * @returns 完整的系统提示词
```

### Coze chunk 标准格式（前端协议）
```
data: {"type":"text","content":"..."}\n\n
event: structured_data\ndata: {"type":"xxx","data":{...}}\n\n
data: {"type":"error","message":"..."}\n\n
data: {"type":"done"}\n\n
```
