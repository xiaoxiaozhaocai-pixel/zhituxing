'use client';

import { useState, useEffect, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import GenerateGuideModal from '@/components/GenerateGuideModal';
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
  ListChecks
} from 'lucide-react';

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
  job_intention?: string;
  skills?: string;
  internship_experience?: string;
  project_experience?: string;
  awards?: string;
}

// 格式化JSON内容为可读文本
function formatJsonContent(jsonStr: string): ReactNode {
  try {
    // 尝试解析JSON
    const parsed = JSON.parse(jsonStr);
    
    // 递归提取所有文本内容
    const extractText = (obj: unknown, indent: number = 0): React.ReactNode => {
      if (typeof obj === 'string') return obj;
      if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
      if (obj === null || obj === undefined) return null;
      
      if (Array.isArray(obj)) {
        return obj.map((item, index) => (
          <span key={index}>
            {extractText(item, indent)}
            {index < obj.length - 1 && <br />}
          </span>
        ));
      }
      
      if (typeof obj === 'object') {
        const entries = Object.entries(obj as object);
        return entries.map(([key, value], index) => (
          <span key={key}>
            {'  '.repeat(indent)}
            <span className="text-purple-600 font-medium">{key}: </span>
            {typeof value === 'object' && value !== null ? (
              <>
                {extractText(value, indent + 1)}
              </>
            ) : (
              <span className="text-gray-800">{extractText(value)}</span>
            )}
            {index < entries.length - 1 && <br />}
          </span>
        ));
      }
      
      return null;
    };
    
    return extractText(parsed);
  } catch (e) {
    // 如果不是有效JSON，显示原始文本
    return jsonStr;
  }
}

// 检查是否为JSON格式
function isJsonFormat(str: string): boolean {
  const trimmed = str.trim();
  return (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
         (trimmed.startsWith('[') && trimmed.endsWith(']'));
}

export default function CareerPlanningPage() {
  const router = useRouter();
  const { user, quota, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showGuideModal, setShowGuideModal] = useState(false);
  
  const [form, setForm] = useState({
    major: '',
    grade: '',
    city: ''
  });

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [user, authLoading, router]);

  // 读取用户个人信息
  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  // 自动滚动到最新内容
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [generatedContent]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/user/profile', {
        headers: {
          'x-user-id': user.id.toString()
        }
      });
      
      const data = await response.json();
      
      if (data.code === 200 && data.data) {
        setUserProfile(data.data);
        // 自动填充表单
        setForm(prev => ({
          ...prev,
          major: data.data.major || '',
          grade: data.data.grade || '',
          city: data.data.city || ''
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

  // 执行流式生成
  const doGenerate = async () => {
    if (!user) return;
    
    setGenerating(true);
    setGeneratedContent('');
    setMessage(null);
    
    try {
      // 调用流式API
      const response = await fetch('/api/career-planning/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          major: form.major || userProfile?.major || '',
          grade: form.grade,
          city: form.city || userProfile?.city || '',
          skills: userProfile?.skills || '',
          personality: userProfile?.personality_type || '',
          workExperience: userProfile?.internship_experience || '',
          awards: userProfile?.awards || ''
        })
      });

      if (!response.ok) {
        throw new Error('请求失败');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取响应');
      }

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.error) {
                throw new Error(data.error);
              }
              
              if (data.content) {
                fullContent += data.content;
                setGeneratedContent(fullContent);
              }
              
              if (data.done) {
                break;
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
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
          city: form.city || userProfile?.city || '',
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

  const hasProfile = userProfile && (userProfile.major || userProfile.grade);

  // 正在生成状态
  if (generating || generatedContent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
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
                className="min-h-[400px] max-h-[600px] overflow-y-auto prose prose-purple max-w-none"
              >
                {generatedContent ? (
                  <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                    {isJsonFormat(generatedContent) ? (
                      formatJsonContent(generatedContent)
                    ) : (
                      generatedContent
                    )}
                    {generating && (
                      <span className="inline-block w-2 h-5 bg-purple-600 animate-pulse ml-1" />
                    )}
                  </div>
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
          {/* 永久免费标识 */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-full text-sm">
            <CheckCircle className="w-4 h-4" />
            永久免费 · 无次数限制 · 报告PDF可下载
          </div>
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

        {/* 用户信息读取区 */}
        <Card className="mb-6 border-purple-200 bg-purple-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {hasProfile ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-gray-700">
                      已读取您的个人信息，将为您生成更精准的规划
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                    <span className="text-gray-700">
                      完善个人信息，规划精准度提升100%
                    </span>
                  </>
                )}
              </div>
              <Link href="/profile/info">
                <Button variant="outline" size="sm" className="border-purple-300 text-purple-700 hover:bg-purple-100">
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
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* 极速生成区 */}
        <Card className="mb-6 hover:shadow-lg transition-shadow border-2 border-purple-200">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg text-purple-700">
              <Zap className="w-5 h-5" />
              30秒极速生成（无需完善信息）
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 所属专业 */}
            <div className="space-y-2">
              <Label htmlFor="major">所属专业</Label>
              <Input
                id="major"
                value={form.major}
                onChange={(e) => updateField('major', e.target.value)}
                placeholder="如：计算机科学与技术、市场营销"
                className="border-gray-200 focus:border-purple-400"
              />
            </div>

            {/* 当前年级 */}
            <div className="space-y-2">
              <Label htmlFor="grade">
                当前年级 <span className="text-red-500">*</span>
              </Label>
              <select
                id="grade"
                value={form.grade}
                onChange={(e) => updateField('grade', e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
              >
                <option value="">请选择年级</option>
                {gradeOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* 意向城市 */}
            <div className="space-y-2">
              <Label htmlFor="city">意向城市（可选）</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => updateField('city', e.target.value)}
                placeholder="如：北京、上海、深圳"
                className="border-gray-200 focus:border-purple-400"
              />
            </div>

            {/* 生成按钮 */}
            <Button 
              onClick={handleGenerate}
              disabled={loading || !form.grade}
              className="w-full h-12 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5 mr-2" />
              )}
              生成我的职业规划
            </Button>
          </CardContent>
        </Card>

        {/* 完整生成区 */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 mb-1">
                  完善信息，获取100%精准规划
                </h3>
                <p className="text-sm text-gray-500">
                  填写更多个人信息，获得更精准的职业建议
                </p>
              </div>
              <Link href="/profile/info">
                <Button variant="outline" className="border-gray-300">
                  去完善个人信息
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
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
