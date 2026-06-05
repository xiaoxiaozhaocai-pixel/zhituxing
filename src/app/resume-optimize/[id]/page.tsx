'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Copy, CheckCircle, Crown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMembership } from '@/contexts/MembershipContext';

interface OptimizationDetail {
  id: string;
  target_position: string;
  original_content: string;
  optimized_content: string;
  suggestions: Array<{ type: string; title: string; suggestion: string }>;
  status: string;
  created_at: string;
}

export default function ResumeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading, quota } = useAuth();
  const { isMember } = useMembership();
  const [detail, setDetail] = useState<OptimizationDetail | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && params.id) {
      fetchDetail();
    }
  }, [user, params.id]);

  const fetchDetail = async () => {
    if (!user || !params.id) return;
    
    setDataLoading(true);
    try {
      const response = await fetch(`/api/resume/${params.id}`, {
        headers: { 'x-user-id': user.id }
      });
      const data = await response.json();
      
      if (data.success) {
        setDetail(data.data);
      }
    } catch (error) {
      console.error('获取详情失败:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleCopy = () => {
    if (detail?.optimized_content) {
      navigator.clipboard.writeText(detail.optimized_content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#165DFF]" />
      </div>
    );
  }

  if (!user || !detail) {
    return null;
  }

  const isMember = isMember;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push('/resume-optimize')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {detail.target_position}
              </h1>
              <p className="text-gray-500 text-sm">
                优化时间：{new Date(detail.created_at).toLocaleString('zh-CN')}
              </p>
            </div>
          </div>
          <Badge variant={detail.status === 'completed' ? 'default' : 'secondary'}>
            {detail.status === 'completed' ? '已完成' : '处理中'}
          </Badge>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Original */}
          <Card className="border-2 border-gray-100">
            <CardHeader>
              <CardTitle>原始简历</CardTitle>
              <CardDescription>您提交的原始简历内容</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm whitespace-pre-wrap">
                {detail.original_content}
              </div>
            </CardContent>
          </Card>

          {/* Optimized */}
          <Card className="border-2 border-[#165DFF]/30">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  优化后简历
                  {isMember && (
                    <Badge className="bg-gradient-to-r from-[#FF7D00] to-[#FF9A00] text-white">
                      <Crown className="w-3 h-3 mr-1" />
                      会员专属
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>AI智能优化的简历内容</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? (
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 mr-2" />
                )}
                {copied ? '已复制' : '复制'}
              </Button>
            </CardHeader>
            <CardContent>
              {isMember ? (
                <div className="bg-gradient-to-br from-[#165DFF]/5 to-white p-4 rounded-lg whitespace-pre-wrap">
                  {detail.optimized_content}
                </div>
              ) : (
                <div className="relative">
                  <div className="bg-gradient-to-br from-[#165DFF]/5 to-white p-4 rounded-lg whitespace-pre-wrap blur-sm select-none">
                    {detail.optimized_content}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-white/90 p-6 rounded-lg text-center shadow-lg">
                      <Crown className="w-8 h-8 text-[#FF7D00] mx-auto mb-2" />
                      <p className="font-medium text-gray-900 mb-2">开通会员查看完整内容</p>
                      <Button
                        className="bg-[#FF7D00] hover:bg-[#e67000] text-white"
                        onClick={() => router.push('/membership')}
                      >
                        立即开通会员
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Suggestions */}
        <Card className="mt-6 border-2 border-gray-100">
          <CardHeader>
            <CardTitle>优化建议</CardTitle>
            <CardDescription>
              共 {detail.suggestions.length} 条优化建议
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {detail.suggestions.map((item, index) => (
                <div key={index} className="flex gap-3 p-4 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-[#165DFF]/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-[#165DFF]" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{item.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{item.suggestion}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="mt-6 flex gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/resume-optimize')}
          >
            继续优化
          </Button>
          <Link href="/assistant">
            <Button className="bg-[#165DFF] hover:bg-[#165DFF]/90">
              让AI模拟面试
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
