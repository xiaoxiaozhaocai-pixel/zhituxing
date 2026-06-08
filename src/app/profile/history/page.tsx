'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {Card, CardContent} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, MessageSquare, Trash2, Clock, Briefcase, GraduationCap, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface ChatHistory {
  id: string;
  bot_type: string;
  title: string;
  preview: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

const botIcons: Record<string, React.ReactNode> = {
  jobs: <Briefcase className="w-4 h-4" />,
  interview: <GraduationCap className="w-4 h-4" />,
  career: <Sparkles className="w-4 h-4" />
};

const botNames: Record<string, string> = {
  jobs: '全行业岗位百科',
  interview: '模拟面试官',
  career: 'AI职业生涯规划'
};

const botColors: Record<string, string> = {
  jobs: 'text-[#165DFF] bg-[#165DFF]/10',
  interview: 'text-[#00B42A] bg-[#00B42A]/10',
  career: 'text-[#722ED1] bg-[#722ED1]/10'
};

export default function HistoryPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [histories, setHistories] = useState<ChatHistory[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [deleting, setDeleting] = useState<string | null>(null);

  // 未登录则跳转到登录页
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  // 获取对话历史
  useEffect(() => {
    if (user) {
// eslint-disable-next-line
      fetchHistories();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeTab]);

  const fetchHistories = async () => {
    setDataLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== 'all') {
        params.set('bot_type', activeTab);
      }
      params.set('limit', '50');

      const response = await fetch(`/api/chat/history?${params.toString()}`, {
        headers: {
          'x-user-id': user!.id
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setHistories(data.data.histories);
      }
    } catch (error) {
      console.error('获取对话历史失败:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    
    setDeleting(id);
    try {
      const response = await fetch(`/api/chat/history/${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user.id
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setHistories(histories.filter(h => h.id !== id));
      }
    } catch (error) {
      console.error('删除对话失败:', error);
    } finally {
      setDeleting(null);
    }
  };

  const handleContinue = (history: ChatHistory) => {
    router.push(`/assistant?history=${history.id}&bot=${history.bot_type}`);
  };

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#165DFF]" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const filteredHistories = activeTab === 'all' 
    ? histories 
    : histories.filter(h => h.bot_type === activeTab);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              我的对话历史
            </h1>
            <p className="text-gray-600">
              共 {histories.length} 条对话记录
            </p>
          </div>
          <Link href="/profile">
            <Button variant="ghost">返回个人中心</Button>
          </Link>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              全部
            </TabsTrigger>
            <TabsTrigger value="jobs" className="gap-2">
              <Briefcase className="w-4 h-4" />
              岗位百科
            </TabsTrigger>
            <TabsTrigger value="interview" className="gap-2">
              <GraduationCap className="w-4 h-4" />
              模拟面试
            </TabsTrigger>
            <TabsTrigger value="career" className="gap-2">
              <Sparkles className="w-4 h-4" />
              职业规划
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {filteredHistories.length === 0 ? (
              <Card className="border-2 border-gray-100">
                <CardContent className="py-16 text-center">
                  <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">暂无对话记录</h3>
                  <p className="text-gray-500 mb-4">开始和AI助手对话，记录会自动保存到这里</p>
                  <Button 
                    className="bg-[#165DFF] hover:bg-[#165DFF]/90"
                    onClick={() => router.push('/assistant')}
                  >
                    去和AI助手对话
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredHistories.map((history) => (
                  <Card 
                    key={history.id} 
                    className="hover:border-[#165DFF]/50 transition-colors"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Bot Icon */}
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${botColors[history.bot_type] || botColors.jobs}`}>
                          {botIcons[history.bot_type] || <MessageSquare className="w-4 h-4" />}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-gray-900 line-clamp-1">
                              {history.title}
                            </h3>
                            <span className={`text-xs px-2 py-0.5 rounded ${botColors[history.bot_type] || ''}`}>
                              {botNames[history.bot_type] || 'AI助手'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 line-clamp-2 mb-2">
                            {history.preview || '暂无预览'}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(history.updated_at).toLocaleString('zh-CN')}
                            </span>
                            <span>{history.message_count} 条消息</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            className="bg-[#165DFF] hover:bg-[#165DFF]/90"
                            onClick={() => handleContinue(history)}
                          >
                            继续对话
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(history.id)}
                            disabled={deleting === history.id}
                          >
                            {deleting === history.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4 text-gray-400" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
