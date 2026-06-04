// @force-rebuild-v2
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, FileText, Eye, MessageCircle, ArrowRight, History, Save, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;
function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  supabaseClient = createClient(url, key);
  return supabaseClient;
}

// 简历结构化字段
interface ResumeSections {
  basic: { name: string; phone: string; email: string; school: string; major: string; graduation: string };
  education: Array<{ school: string; degree: string; major: string; time: string; gpa?: string }>;
  experience: Array<{ company: string; role: string; time: string; description: string[] }>;
  projects: Array<{ name: string; role: string; time: string; description: string[] }>;
  skills: string[];
}

const emptyResume: ResumeSections = {
  basic: { name: '', phone: '', email: '', school: '', major: '', graduation: '' },
  education: [],
  experience: [],
  projects: [],
  skills: [],
};

export default function ResumeBuilderPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [resume, setResume] = useState<ResumeSections>(emptyResume);
  const [activeTab, setActiveTab] = useState<'chat' | 'preview'>('preview');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);

  // 自动加载已有简历
  useEffect(() => {
    if (!user) return;
    getSupabaseClient()
      .from('resumes')
      .select('id, data')
      .order('updated_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setResume(data[0].data);
          setSavedId(data[0].id);
        }
      })
      .catch(() => {});
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { title: '我的简历', data: resume, updated_at: new Date().toISOString() };
      if (savedId) {
        await getSupabaseClient().from('resumes').update(payload).eq('id', savedId);
      } else {
        const { data } = await getSupabaseClient().from('resumes').insert(payload).select('id').single();
        if (data) setSavedId(data.id);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Save failed:', e);
    }
    setSaving(false);
  };

  useEffect(() => {
    if (!loading && !user) router.push('/auth');
  }, [user, loading, router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 从 AI 回复中提取结构化简历数据
  const extractResumeData = useCallback((content: string) => {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
    if (!jsonMatch) return;
    try {
      const data = JSON.parse(jsonMatch[1]);
      if (data.resume) {
        setResume(prev => ({ ...prev, ...data.resume }));
      }
    } catch { /* 不是有效的 JSON，忽略 */ }
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isStreaming || !user) return;
    
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsStreaming(true);
    
    abortRef.current = new AbortController();
    let fullResponse = '';
    
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({
          message: userMsg,
          botType: 'resume',
          history: messages,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error('请求失败');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;
        // 实时更新最后一条消息
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === 'assistant') {
            last.content = fullResponse;
          } else {
            updated.push({ role: 'assistant', content: fullResponse });
          }
          return updated;
        });
      }
      
      extractResumeData(fullResponse);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，出了点问题，请重试。' }]);
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;
  if (!user) return null;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="h-14 bg-white border-b flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-blue-600 font-bold text-lg">职途星</Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-700 font-medium">简历创作助手</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleSave} disabled={saving}>
            {saved ? <Check className="h-4 w-4 mr-1 text-green-500" /> : <Save className="h-4 w-4 mr-1" />}
            {saved ? '已保存' : '保存'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setResume(emptyResume)}>
            <History className="h-4 w-4 mr-1" /> 清空简历
          </Button>
          <Link href="/assistant?botType=interview">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              模拟面试 <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </header>

      {/* 主内容区：双栏 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左栏：对话 */}
        <div className="w-[45%] min-w-[400px] border-r bg-white flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 mt-12">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 text-blue-300" />
                <p className="text-lg font-medium mb-2">我是小职，帮你写简历～</p>
                <p className="text-sm">告诉我你的教育背景、项目经历、实习经验</p>
                <p className="text-sm">我会一边聊一边帮你填好简历</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-4 py-2.5 ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}
            {isStreaming && messages[messages.length - 1]?.role === 'assistant' && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-xl px-4 py-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* 输入区 */}
          <div className="border-t p-3">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="说说你的经历，比如「我在校学生会做过部长」..."
                className="min-h-[44px] max-h-[120px] resize-none text-sm"
                rows={1}
                disabled={isStreaming}
              />
              <Button 
                onClick={handleSend} 
                disabled={!input.trim() || isStreaming}
                size="icon"
                className="shrink-0 bg-blue-600 hover:bg-blue-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* 右栏：简历预览 */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="max-w-[700px] mx-auto">
            {/* 简历预览卡片 */}
            <Card className="shadow-sm">
              <CardContent className="p-8">
                {/* 基本信息 */}
                {resume.basic.name && (
                  <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{resume.basic.name || '姓名'}</h1>
                    <div className="text-sm text-gray-500 space-x-3">
                      {resume.basic.phone && <span>📱 {resume.basic.phone}</span>}
                      {resume.basic.email && <span>📧 {resume.basic.email}</span>}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {resume.basic.school && <span>{resume.basic.school}</span>}
                      {resume.basic.major && <span> · {resume.basic.major}</span>}
                      {resume.basic.graduation && <span> · {resume.basic.graduation}届</span>}
                    </div>
                  </div>
                )}

                {/* 教育经历 */}
                {resume.education.length > 0 && (
                  <Section title="教育经历">
                    {resume.education.map((edu, i) => (
                      <div key={i} className="mb-3">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{edu.school}</span>
                          <span className="text-gray-500">{edu.time}</span>
                        </div>
                        <div className="text-sm text-gray-600">{edu.major} · {edu.degree}</div>
                        {edu.gpa && <div className="text-xs text-gray-400">GPA: {edu.gpa}</div>}
                      </div>
                    ))}
                  </Section>
                )}

                {/* 实习/工作经历 */}
                {resume.experience.length > 0 && (
                  <Section title="实习经历">
                    {resume.experience.map((exp, i) => (
                      <div key={i} className="mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{exp.company} · {exp.role}</span>
                          <span className="text-gray-500">{exp.time}</span>
                        </div>
                        <ul className="mt-1 list-disc list-inside text-sm text-gray-700 space-y-0.5">
                          {exp.description.map((desc, j) => (
                            <li key={j}>{desc}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </Section>
                )}

                {/* 项目经历 */}
                {resume.projects.length > 0 && (
                  <Section title="项目经历">
                    {resume.projects.map((proj, i) => (
                      <div key={i} className="mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{proj.name} · {proj.role}</span>
                          <span className="text-gray-500">{proj.time}</span>
                        </div>
                        <ul className="mt-1 list-disc list-inside text-sm text-gray-700 space-y-0.5">
                          {proj.description.map((desc, j) => (
                            <li key={j}>{desc}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </Section>
                )}

                {/* 技能 */}
                {resume.skills.length > 0 && (
                  <Section title="专业技能">
                    <div className="flex flex-wrap gap-2">
                      {resume.skills.map((skill, i) => (
                        <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </Section>
                )}

                {/* 空白状态 */}
                {!resume.basic.name && resume.education.length === 0 && resume.experience.length === 0 && (
                  <div className="text-center text-gray-300 py-16">
                    <FileText className="h-16 w-16 mx-auto mb-4" />
                    <p className="text-lg">简历预览区</p>
                    <p className="text-sm mt-1">在左侧和小职聊聊，简历会实时生成</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* 移动端标签切换 */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex">
        <button 
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-3 text-center text-sm ${activeTab === 'chat' ? 'text-blue-600 border-t-2 border-blue-600' : 'text-gray-500'}`}
        >
          <MessageCircle className="h-4 w-4 inline mr-1" /> 对话
        </button>
        <button 
          onClick={() => setActiveTab('preview')}
          className={`flex-1 py-3 text-center text-sm ${activeTab === 'preview' ? 'text-blue-600 border-t-2 border-blue-600' : 'text-gray-500'}`}
        >
          <Eye className="h-4 w-4 inline mr-1" /> 简历预览
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-bold text-gray-900 border-b-2 border-blue-500 pb-1 mb-3">{title}</h2>
      {children}
    </div>
  );
}
