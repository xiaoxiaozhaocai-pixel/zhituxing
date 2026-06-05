'use client';

import { useState, useRef, useCallback } from 'react';
import InterviewResultCard from '@/components/cards/InterviewResultCard';
import CareerPlanCard from '@/components/cards/CareerPlanCard';
import JdMatchCard from '@/components/cards/JdMatchCard';
import SkillAssessmentCard from '@/components/cards/SkillAssessmentCard';

type BotType = 'jobs' | 'interview' | 'decision' | 'career';

interface StructuredData {
  type: string;
  data: Record<string, unknown>;
}

export default function TestE2EPage() {
  const [message, setMessage] = useState('');
  const [botType, setBotType] = useState<BotType>('career');
  const [streamText, setStreamText] = useState('');
  const [structuredDataList, setStructuredDataList] = useState<StructuredData[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleSend = useCallback(async () => {
    if (!message.trim() || loading) return;

    setLoading(true);
    setStreamText('');
    setStructuredDataList([]);

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'test-user-001',
        },
        body: JSON.stringify({
          message: message.trim(),
          botType,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        setStreamText(`HTTP Error: ${response.status} ${response.statusText}`);
        setLoading(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setStreamText('Error: No response body');
        setLoading(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split('\n');
        buffer = '';

        let currentEvent = '';
        let currentData = '';

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            currentData = line.slice(5).trim();
          } else if (line === '' && (currentEvent || currentData)) {
            // End of SSE event
            if (currentEvent === 'structured_data' && currentData) {
              try {
                const parsed = JSON.parse(currentData);
                setStructuredDataList(prev => [...prev, { type: parsed.type || 'unknown', data: parsed }]);
              } catch {
                console.error('Failed to parse structured_data:', currentData);
              }
            } else if (currentData && currentEvent !== 'structured_data') {
              // Regular text message
              try {
                const parsed = JSON.parse(currentData);
                if (parsed.content) {
                  setStreamText(prev => prev + parsed.content);
                } else if (typeof parsed === 'string') {
                  setStreamText(prev => prev + parsed);
                }
              } catch {
                // Not JSON, treat as plain text
                setStreamText(prev => prev + currentData);
              }
            }
            currentEvent = '';
            currentData = '';
          } else if (line && !line.startsWith('event:') && !line.startsWith('data:')) {
            // Might be plain text without SSE framing (fallback mode)
            // Accumulate to handle partial lines
            buffer = line;
          }
        }

        // Handle remaining buffer as potential plain text
        if (buffer.trim()) {
          // Check if it's not an SSE partial event
          if (!buffer.startsWith('event:') && !buffer.startsWith('data:')) {
            setStreamText(prev => prev + buffer);
            buffer = '';
          }
        }
      }
    } catch (err: unknown) {
      const _err_ = err as Error;
      if (err instanceof Error && _err_.name !== 'AbortError') {
        setStreamText(prev => prev + `\n\nError: ${_err_.message}`);
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [message, botType, loading]);

  const handleAbort = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
  }, []);

  const renderStructuredCard = (item: StructuredData, index: number) => {
    const { type, data } = item;
    switch (type) {
      case 'interview_result':
      case 'interview':
        return <InterviewResultCard key={index} data={data} />;
      case 'career_plan':
      case 'career':
        return <CareerPlanCard key={index} data={data} />;
      case 'jd_match':
      case 'jobs':
        return <JdMatchCard key={index} data={data} />;
      case 'skill_assessment':
      case 'assessment':
        return <SkillAssessmentCard key={index} data={data} />;
      default:
        return (
          <div key={index} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm text-gray-500">未知类型: {type}</p>
            <pre className="mt-2 text-xs text-gray-600 overflow-auto max-h-40">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">端到端测试页面</h1>

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6 space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">消息内容</label>
              <input
                type="text"
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="输入测试消息..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">智能体类型</label>
              <select
                value={botType}
                onChange={e => setBotType(e.target.value as BotType)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
              >
                <option value="jobs">职搭子 (jobs)</option>
                <option value="interview">模拟面试 (interview)</option>
                <option value="decision">考研就业决策 (decision)</option>
                <option value="career">职业规划 (career)</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSend}
                disabled={loading || !message.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {loading ? '发送中...' : '发送'}
              </button>
              {loading && (
                <button
                  onClick={handleAbort}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium"
                >
                  停止
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-2 text-xs text-gray-400">
            <span>用户ID: test-user-001</span>
            <span>|</span>
            <span>接口: /api/chat</span>
          </div>
        </div>

        {/* Stream Output */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">流式文本输出</h2>
          <div className="min-h-[120px] max-h-[400px] overflow-y-auto bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
            {streamText || <span className="text-gray-400">等待发送消息...</span>}
          </div>
        </div>

        {/* Structured Data Cards */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            结构化数据卡片
            {structuredDataList.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">({structuredDataList.length}条)</span>
            )}
          </h2>
          {structuredDataList.length > 0 ? (
            <div className="space-y-4">
              {structuredDataList.map((item, index) => renderStructuredCard(item, index))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-400 text-sm">
              暂无结构化数据（等待智能体返回 &lt;&lt;DATA:type=xxx&gt;&gt; 标记）
            </div>
          )}
        </div>

        {/* Raw Structured Data Debug */}
        {structuredDataList.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">原始JSON调试</h2>
            <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-auto max-h-[300px]">
              {JSON.stringify(structuredDataList, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
