/**
 * useSSEStream — 统一的SSE流式解析Hook
 * 
 * 解析后端统一的SSE格式：
 * - data: {"type":"text","content":"..."}  — 文本增量
 * - event: structured_data + data: {...}   — 结构化数据
 * - data: {"type":"done"}                  — 流结束
 * - data: {"type":"error","message":"..."} — 错误
 * 
 * 提供：
 * - 打字机式渲染（逐字追加）
 * - 15秒未收到首个token显示"AI正在思考"
 * - 30秒超时提示重试
 * - 错误回调
 */

'use client';

import { useRef, useCallback, useState } from 'react';

export interface SSEStreamState {
  content: string;        // 累积的文本内容
  isStreaming: boolean;    // 是否正在流式接收
  isFirstToken: boolean;   // 是否还没收到第一个token
  isThinking: boolean;     // 是否15秒还没收到第一个token
  isTimeout: boolean;      // 是否30秒超时
  error: string | null;    // 错误信息
  structuredData: Array<{ type: string; data: Record<string, unknown> }>; // 结构化数据
}

export interface SSEStreamActions {
  startStream: (response: Response) => Promise<void>;
  reset: () => void;
  cancel: () => void;
}

export function useSSEStream(onError?: (error: string) => void): [SSEStreamState, SSEStreamActions] {
  const [state, setState] = useState<SSEStreamState>({
    content: '',
    isStreaming: false,
    isFirstToken: true,
    isThinking: false,
    isTimeout: false,
    error: null,
    structuredData: [],
  });

  const abortRef = useRef<AbortController | null>(null);
  const thinkingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (thinkingTimerRef.current) {
      clearTimeout(thinkingTimerRef.current);
      thinkingTimerRef.current = null;
    }
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setState({
      content: '',
      isStreaming: false,
      isFirstToken: true,
      isThinking: false,
      isTimeout: false,
      error: null,
      structuredData: [],
    });
  }, [clearTimers]);

  const cancel = useCallback(() => {
    clearTimers();
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setState(prev => ({ ...prev, isStreaming: false }));
  }, [clearTimers]);

  const startStream = useCallback(async (response: Response) => {
    // 重置状态
    setState({
      content: '',
      isStreaming: true,
      isFirstToken: true,
      isThinking: false,
      isTimeout: false,
      error: null,
      structuredData: [],
    });

    // 15秒后显示"AI正在思考"
    thinkingTimerRef.current = setTimeout(() => {
      setState(prev => {
        if (prev.isFirstToken) {
          return { ...prev, isThinking: true };
        }
        return prev;
      });
    }, 15000);

    // 30秒后超时
    timeoutTimerRef.current = setTimeout(() => {
      setState(prev => {
        if (prev.isFirstToken) {
          return { ...prev, isTimeout: true, isStreaming: false };
        }
        return prev;
      });
      if (abortRef.current) {
        abortRef.current.abort();
      }
    }, 30000);

    const reader = response.body?.getReader();
    if (!reader) {
      clearTimers();
      const errMsg = '无法读取AI响应';
      setState(prev => ({ ...prev, isStreaming: false, error: errMsg }));
      onError?.(errMsg);
      return;
    }

    const decoder = new TextDecoder();
    let sseBuffer = '';
    let fullContent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });

        // 按 \n\n 分割SSE事件
        const events = sseBuffer.split('\n\n');
        sseBuffer = events.pop() ?? '';

        for (const event of events) {
          if (!event.trim()) continue;

          // 解析SSE事件
          let eventType = 'message';
          let dataLine = '';

          for (const line of event.split('\n')) {
            if (line.startsWith('event:')) {
              eventType = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              dataLine = line.slice(5).trim();
            }
          }

          if (!dataLine) continue;

          // 处理结构化数据事件
          if (eventType === 'structured_data') {
            try {
              const parsed = JSON.parse(dataLine);
              setState(prev => ({
                ...prev,
                structuredData: [...prev.structuredData, { type: parsed.type, data: parsed.data }],
              }));
            } catch {
              // 忽略解析错误
            }
            continue;
          }

          // 处理普通消息事件
          try {
            const parsed = JSON.parse(dataLine);

            if (parsed.type === 'text' && parsed.content) {
              // 收到第一个token，清除思考/超时计时器
              fullContent += parsed.content;
              setState(prev => ({
                ...prev,
                content: fullContent,
                isFirstToken: false,
                isThinking: false,
                isTimeout: false,
              }));
              clearTimers();
            } else if (parsed.type === 'done') {
              // 流完成
              setState(prev => ({ ...prev, isStreaming: false }));
              clearTimers();
            } else if (parsed.type === 'error') {
              const errMsg = parsed.message || 'AI生成出错';
              setState(prev => ({ ...prev, isStreaming: false, error: errMsg }));
              onError?.(errMsg);
              clearTimers();
            }
          } catch {
            // 兼容：非JSON的纯文本内容（旧格式回退）
            if (dataLine && !dataLine.startsWith('{')) {
              fullContent += dataLine;
              setState(prev => ({
                ...prev,
                content: fullContent,
                isFirstToken: false,
                isThinking: false,
                isTimeout: false,
              }));
              clearTimers();
            }
          }
        }
      }
    } catch (err: unknown) {
      const _err_ = err as Error;
      if (err instanceof DOMException && _err_.name === 'AbortError') {
        // 用户取消，不报错
      } else {
        const errMsg = '网络连接中断，请重试';
        setState(prev => ({ ...prev, isStreaming: false, error: errMsg }));
        onError?.(errMsg);
      }
    } finally {
      clearTimers();
      setState(prev => {
        if (prev.isStreaming) {
          return { ...prev, isStreaming: false };
        }
        return prev;
      });
      try { reader.releaseLock(); } catch { /* ignore */ }
    }
  }, [clearTimers, onError]);

  return [state, { startStream, reset, cancel }];
}
