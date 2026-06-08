'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import GenerateGuideModal from '@/components/GenerateGuideModal';
import AIResponseRenderer from '@/components/AIResponseRenderer';
import {
  Sparkles, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  ChevronRight,
  Edit3,
  Zap,
  BookOpen,
  Target,
  TrendingUp,
  ListChecks,
  Lock,
  LogIn
} from 'lucide-react';
import Breadcrumb from '@/components/Breadcrumb';

// 年级选项
const gradeOptions = [
  '大一', '大二', '大三', '大四', 
  '研一', '研二', '研三', '已毕业'
];

// 用户信息接口
interface UserProfile {
  personality_type?: string;
  major?: string;
  grade?: string;
  graduation_year?: number;
  city?: string;
  target_city?: string;
  job_intention?: string;
  skills?: string[];
  internship_experience?: string;
  project_experience?: string;
  awards?: string;
}

export default function CareerPlanningPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [loading, _setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [message, setMessage] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showGuideModal, setShowGuideModal] = useState(false);
  
  const [form, setForm] = useState({
    major: '',
    grade: '',
    target_city: '',
    job_intention: '',
    personality_type: '',
    skills: [] as string[],
  });

  const contentRef = useRef<HTMLDivElement>(null);
  const scrollAnimRef = useRef<number | null>(null);
  const isUserNearBottomRef = useRef(true);

  const [_showLoginPrompt, _setShowLoginPrompt] = useState(true);

  useEffect(() => {
    // 不再自动跳转，改为显示提示
  }, [user, authLoading, router]);

  // 读取用户个人信息
  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  // 检测用户是否主动向上滚动
  const handleContentScroll = useCallback(() => {
    const container = contentRef.current;
    if (!container) return;
    const threshold = 100;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    isUserNearBottomRef.current = distanceFromBottom < threshold;
  }, []);

  // 自动滚动到最新内容
  useEffect(() => {
    if (generatedContent && contentRef.current && isUserNearBottomRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [generatedContent]);

  // SSE流式输出时持续滚动到底部
  useEffect(() => {
    if (generating) {
      const scrollLoop = () => {
        const container = contentRef.current;
        if (container && isUserNearBottomRef.current) {
          container.scrollTop = container.scrollHeight;
        }
        scrollAnimRef.current = requestAnimationFrame(scrollLoop);
      };
      scrollAnimRef.current = requestAnimationFrame(scrollLoop);
      return () => {
        if (scrollAnimRef.current) cancelAnimationFrame(scrollAnimRef.current);
      };
    }
    return;
  }, [generating]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/user/profile', {
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success && data.data) {
        setUserProfile(data.data);
        // 自动填充表单 - 从已保存的个人资料预填
        setForm(prev => ({
          ...prev,
          major: data.data.major || '',
          grade: data.data.grade || '',
          target_city: data.data.target_cities?.[0] || data.data.city || '',
          job_intention: data.data.target_job || data.data.job_intention || '',
          personality_type: data.data.personality_type || '',
          skills: Array.isArray(data.data.skills) ? data.data.skills : (data.data.skills ? String(data.data.skills).split(',').map((s: string) => s.trim()).filter(Boolean) : []),
        }));
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  // 更新表单字段
  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // 生成职业规划
  const handleGenerate = () => {
    if (!user) return;
    
    if (!form.grade) {
      setMessage({ type: 'error', text: '请选择年级' });
      return;
    }
    
    // 检查是否已完善个人信息，未完善则弹出引导
    const hasProfile = userProfile && (userProfile.major || userProfile.grade);
    if (!hasProfile) {
      setShowGuideModal(true);
      return;
    }
    
    // 已完善信息，直接生成
    doGenerate();
  };

  // 保存个人信息到数据库（并行，不阻塞AI生成）
  const saveProfileToDB = async () => {
    if (!user) return;
    try {
      await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id.toString(),
        },
        body: JSON.stringify({
          major: form.major,
          grade: form.grade,
          target_city: form.target_city,
          job_intention: form.job_intention,
          personality_type: form.personality_type,
          skills: form.skills,
        }),
      });
    } catch (e) {
      console.error('保存个人信息失败:', e);
    }
  };

  // 执行流式生成
  const doGenerate = async () => {
    if (!user) return;
    
    setGenerating(true);
    setGeneratedContent('');
    setMessage(null);
    
    // 并行保存个人信息到数据库
    saveProfileToDB();
    
    try {
      // 调用流式API
      const response = await fetch('/api/career-planning/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
        },
        body: JSON.stringify({
          major: form.major || userProfile?.major || '',
          grade: form.grade,
          city: form.target_city || userProfile?.target_city || userProfile?.city || '',
          skills: form.skills?.join(', ') || userProfile?.skills?.join(', ') || '',
          personality: form.personality_type || userProfile?.personality_type || '',
          workExperience: userProfile?.internship_experience || '',
          awards: userProfile?.awards || ''
        })
      });

      if (!response.ok) {
        throw new Error(`请求失败 (${response.status})`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取AI响应');
      }

      const decoder = new TextDecoder();
      let fullContent = '';
      let sseBuffer = '';

      // 超时计时器
      const thinkingTimer = setTimeout(() => {
        if (!fullContent) {
          setMessage({ type: 'info', text: 'AI正在思考，请耐心等待...' });
        }
      }, 15000);

      const longWaitTimer = setTimeout(() => {
        if (!fullContent) {
          setMessage({ type: 'info', text: '生成时间较长，请耐心等待...' });
        }
      }, 30000);

      const timeoutTimer = setTimeout(() => {
        if (!fullContent) {
          setMessage({ type: 'error', text: '请求超时，请重试' });
          setGenerating(false);
          reader.cancel().catch(() => {});
        }
      }, 60000);

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

            // 结构化数据事件 — 保存状态，后续渲染卡片
            if (eventType === 'structured_data') {
              // 结构化数据已由后端解析保存，前端由AIResponseRenderer自动渲染
              continue;
            }

            try {
              const data = JSON.parse(dataLine);

              if (data.type === 'text' && data.content) {
                clearTimeout(thinkingTimer);
                clearTimeout(longWaitTimer);
                clearTimeout(timeoutTimer);
                fullContent += data.content;
                // 过滤残留的 <<DATA>> 标记
                const displayContent = fullContent.replace(/<<\s*DATA\s*:\s*type\s*=\s*\w+\s*>>[\s\S]*?<<\s*END\s*>>/gi, '').trim();
                setGeneratedContent(displayContent);
                setMessage(null);
              } else if (data.type === 'done') {
                clearTimeout(thinkingTimer);
                clearTimeout(longWaitTimer);
                clearTimeout(timeoutTimer);
              } else if (data.type === 'error') {
                clearTimeout(thinkingTimer);
                clearTimeout(longWaitTimer);
                clearTimeout(timeoutTimer);
                throw new Error(data.message || 'AI生成出错');
              }
            } catch (e) {
              if (e instanceof Error && e.message !== 'AI生成出错') {
                // 兼容旧格式
                const data = JSON.parse(dataLine);
                if (data.content) {
                  clearTimeout(thinkingTimer);
                  clearTimeout(timeoutTimer);
                  fullContent += data.content;
                  setGeneratedContent(fullContent);
                  setMessage(null);
                }
                if (data.error) {
                  clearTimeout(thinkingTimer);
                  clearTimeout(timeoutTimer);
                  throw new Error(data.error);
                }
              } else {
                throw e;
              }
            }
          }
        }
      } finally {
        clearTimeout(thinkingTimer);
        clearTimeout(timeoutTimer);
      }

      // 生成完成后，保存报告
      if (fullContent) {
        await saveReport(fullContent);
      }
      
    } catch (error) {
      console.error('生成失败:', error);
      setMessage({ type: 'error', text: '生成失败，请稍后重试' });
      setGenerating(false);
    }
  };

  // 保存报告
  const saveReport = async (content: string) => {
    if (!user) return;
    
    try {
      // 先调用保存接口
      const response = await fetch('/api/career-planning/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id.toString()
        },
        body: JSON.stringify({
          major: form.major || userProfile?.major || '',
          grade: form.grade,
          target_city: form.target_city || userProfile?.target_city || '',
          content: content // 传递生成的内容
        })
      });

      const data = await response.json();
      
      if (data.code === 200) {
        setMessage({ type: 'success', text: '职业规划报告生成成功！' });
        // 跳转到报告页
        setTimeout(() => {
          router.push(`/career-planning/report/${data.data.report_id}`);
        }, 1500);
      } else {
        setMessage({ type: 'error', text: data.message || '保存失败' });
      }
    } catch (error) {
      console.error('保存失败:', error);
      setMessage({ type: 'error', text: '保存失败' });
    } finally {
      setGenerating(false);
    }
  };

  // 关闭生成结果，重新开始
  const resetGeneration = () => {
    setGeneratedContent('');
    setMessage(null);
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#722ED1] animate-spin" />
      </div>
    );
  }

  // 未登录提示
  if (!user && !authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4">
          {/* 页面标题 */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              AI智能职业规划
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              生成你的专属职业规划
            </h1>
            <p className="text-gray-500 text-lg">
              30秒完成，开启你的大学职业成长之路
            </p>
          </div>

          {/* 登录提示卡片 */}
          <Card className="border-purple-200 shadow-xl">
            <CardContent className="py-16 text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Lock className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">登录解锁完整功能</h3>
              <p className="text-gray-500 mb-6">登录后可保存职业规划，追踪目标进展，获取个性化建议</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
                <Link href="/auth">
                  <Button className="w-full sm:w-auto px-8 py-6 text-lg bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 shadow-lg">
                    <LogIn className="w-5 h-5 mr-2" />
                    立即登录
                  </Button>
                </Link>
                <Link href="/jobs">
                  <Button variant="outline" className="w-full sm:w-auto px-6 py-6">
                    先浏览岗位
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const hasProfile = userProfile && (userProfile.major || userProfile.grade);

  // 正在生成状态
  if (generating || generatedContent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
        <Breadcrumb theme="light" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4" />
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* 标题 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              AI智能生成中...
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              正在生成您的专属职业规划
            </h1>
            <p className="text-gray-500">
              基于 {form.major || userProfile?.major || '未知专业'} · {form.grade}
            </p>
          </div>

          {/* 生成内容展示 */}
          <Card className="mb-6 border-purple-200 shadow-lg">
            <CardHeader className="pb-3 border-b bg-purple-50/50">
              <CardTitle className="flex items-center gap-2 text-purple-700">
                <BookOpen className="w-5 h-5" />
                职业规划报告
                {generating && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div 
                ref={contentRef}
                onScroll={handleContentScroll}
                className="min-h-[400px] max-h-[600px] overflow-y-auto prose prose-purple max-w-none"
              >
                {generatedContent ? (
                  <AIResponseRenderer rawText={generatedContent} streaming={generating} role="assistant" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin mb-4" />
                    <p>正在思考中，请稍候...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 操作按钮 */}
          {!generating && generatedContent && (
            <div className="flex justify-center gap-4">
              <Button 
                onClick={resetGeneration}
                variant="outline"
                className="border-purple-300 text-purple-700"
              >
                重新生成
              </Button>
              <Link href="/career-planning/my-reports">
                <Button className="bg-purple-600 hover:bg-purple-700">
                  查看完整报告
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 默认表单页面
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* 顶部标题区 */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            AI智能职业规划
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            生成你的专属职业规划
          </h1>
          <p className="text-gray-500 text-lg mb-4">
            30秒完成，开启你的大学职业成长之路
          </p>
        </div>

        {/* 功能介绍 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="flex flex-col items-center p-4 bg-white rounded-xl shadow-sm">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
              <Target className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm font-medium text-gray-700 text-center">精准匹配</span>
          </div>
          <div className="flex flex-col items-center p-4 bg-white rounded-xl shadow-sm">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-700 text-center">成长路径</span>
          </div>
          <div className="flex flex-col items-center p-4 bg-white rounded-xl shadow-sm">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
              <ListChecks className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm font-medium text-gray-700 text-center">行动清单</span>
          </div>
          <div className="flex flex-col items-center p-4 bg-white rounded-xl shadow-sm">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-3">
              <Sparkles className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-sm font-medium text-gray-700 text-center">实时更新</span>
          </div>
        </div>

        {/* 用户信息读取区 - 紫色渐变背景 */}
        <Card className="mb-6 border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-indigo-50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {hasProfile ? (
                  <>
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <div>
                      <span className="text-gray-800 font-medium">
                        已读取您的个人信息，将为您生成更精准的规划
                      </span>
                      <p className="text-sm text-green-600 mt-0.5">规划精准度：100%</p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-6 h-6 text-purple-500" />
                    <div>
                      <span className="text-gray-800 font-medium">
                        完善个人信息，规划精准度提升100%
                      </span>
                      <p className="text-sm text-gray-500 mt-0.5">完善信息后，精准度从50%提升至100%</p>
                    </div>
                  </>
                )}
              </div>
              <Link href="/profile/info?from=/career-planning">
                <Button className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white">
                  <Edit3 className="w-4 h-4 mr-1" />
                  {hasProfile ? '编辑信息' : '去完善'}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* 消息提示 */}
        {message && (
          <div className={`mb-6 px-4 py-3 rounded-lg flex items-center gap-2 ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : message.type === 'info'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : message.type === 'info' ? (
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* 极速生成区 */}
        <Card className="mb-6 hover:shadow-xl transition-all border-2 border-purple-300 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl font-bold text-purple-700">
              <Zap className="w-6 h-6" />
              30秒极速生成（无需完善信息）
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 所属专业 */}
            <div className="space-y-2">
              <Label htmlFor="major" className="font-medium text-gray-700">所属专业</Label>
              <Input
                id="major"
                value={form.major}
                onChange={(e) => updateField('major', e.target.value)}
                placeholder="如：计算机科学与技术、市场营销"
                className="border-2 border-purple-200 focus:border-purple-500 h-12 text-base"
              />
            </div>

            {/* 当前年级 */}
            <div className="space-y-2">
              <Label htmlFor="grade" className="font-medium text-gray-700">
                当前年级 <span className="text-red-500">*</span>
              </Label>
              <select
                id="grade"
                value={form.grade}
                onChange={(e) => updateField('grade', e.target.value)}
                className="w-full h-12 px-4 rounded-lg border-2 border-purple-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-500 text-base"
              >
                <option value="">请选择年级</option>
                {gradeOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* 意向城市 */}
            <div className="space-y-2">
              <Label htmlFor="target_city" className="font-medium text-gray-700">意向城市（可选）</Label>
              <Input
                id="target_city"
                value={form.target_city}
                onChange={(e) => updateField('target_city', e.target.value)}
                placeholder="如：北京、上海、深圳"
                className="border-2 border-purple-200 focus:border-purple-500 h-12 text-base"
              />
            </div>

            {/* 生成按钮 */}
            <Button 
              onClick={handleGenerate}
              disabled={loading || !form.grade}
              className="w-full h-14 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-6 h-6 mr-2" />
              )}
              生成我的职业规划
            </Button>
            <p className="text-center text-sm text-gray-500 flex items-center justify-center gap-2">
              ✅ 永久免费 · 无次数限制 · 无需注册
            </p>
          </CardContent>
        </Card>

        {/* 底部会员引导 */}
        <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 mb-6">
          <CardContent className="p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              💡 生成规划后，开通9.9元终身会员即可解锁：
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                '无限次AI模拟面试',
                '完整能力测评报告',
                '学长学姐上岸简历模板',
                '2026校招内推码合集'
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <Link href="/membership">
              <Button variant="outline" className="w-full border-2 border-gray-300 hover:bg-gray-50 h-11">
                了解会员权益
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* 底部提示 */}
        <div className="text-center mt-8 text-sm text-gray-400">
          <p>职业规划基于您的个人信息，通过AI算法生成</p>
          <p>结果仅供参考，具体求职决策请结合实际情况</p>
        </div>
      </div>

      {/* 生成前置引导弹窗 */}
      <GenerateGuideModal
        show={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        onContinue={() => {
          setShowGuideModal(false);
          doGenerate();
        }}
      />
    </div>
  );
}
