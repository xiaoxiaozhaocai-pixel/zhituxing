'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { 
  Upload, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  AlertCircle,
  Briefcase,
  ArrowLeft,
  Award,
  Calendar
} from 'lucide-react';

// 提交记录接口
interface Submission {
  id: number;
  job_name: string;
  industry: string;
  city: string;
  company_name: string;
  salary_min: number | null;
  salary_max: number | null;
  status: number;
  reject_reason: string | null;
  create_time: string;
  update_time: string;
}

export default function JdSubmissionsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
// eslint-disable-next-line
      fetchSubmissions();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchSubmissions = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/jd/submit', {
        headers: {
          'x-user-id': user.id.toString()
        }
      });
      
      const data = await response.json();
      
      if (data.code === 200) {
        setSubmissions(data.data || []);
      } else {
        setError(data.message || '获取提交记录失败');
      }
    } catch (error) {
      console.error('获取提交记录失败:', error);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 获取状态信息
  const getStatusInfo = (status: number) => {
    switch (status) {
      case 0:
        return {
          label: '待审核',
          color: 'bg-yellow-100 text-yellow-700',
          icon: <Clock className="w-4 h-4" />
        };
      case 1:
        return {
          label: '已通过',
          color: 'bg-green-100 text-green-700',
          icon: <CheckCircle className="w-4 h-4" />
        };
      case 2:
        return {
          label: '已驳回',
          color: 'bg-red-100 text-red-700',
          icon: <XCircle className="w-4 h-4" />
        };
      default:
        return {
          label: '未知',
          color: 'bg-gray-100 text-gray-700',
          icon: <AlertCircle className="w-4 h-4" />
        };
    }
  };

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 格式化薪资
  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return '面议';
    if (min && max) return `${(min/1000).toFixed(0)}k-${(max/1000).toFixed(0)}k`;
    if (min) return `${(min/1000).toFixed(0)}k+`;
    return `~${(max! / 1000).toFixed(0)}k`;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#165DFF] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* 返回按钮 */}
        <Link href="/profile" className="inline-flex items-center text-gray-600 hover:text-[#165DFF] mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" />
          返回个人中心
        </Link>

        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Upload className="w-7 h-7 text-[#165DFF]" />
              我的JD提交
            </h1>
            <p className="text-gray-500 mt-2">
              查看您提交的JD审核状态和奖励记录
            </p>
          </div>
          <Link href="/jobs/submit">
            <Button className="bg-[#165DFF] hover:bg-[#165DFF]/90">
              <Upload className="w-4 h-4 mr-2" />
              提交新JD
            </Button>
          </Link>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-[#165DFF]">
                {submissions.filter(s => s.status === 1).length}
              </div>
              <div className="text-sm text-gray-500 mt-1 flex items-center justify-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                已通过
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-yellow-500">
                {submissions.filter(s => s.status === 0).length}
              </div>
              <div className="text-sm text-gray-500 mt-1 flex items-center justify-center gap-1">
                <Clock className="w-4 h-4 text-yellow-500" />
                待审核
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-gray-400">
                {submissions.length}
              </div>
              <div className="text-sm text-gray-500 mt-1 flex items-center justify-center gap-1">
                <Briefcase className="w-4 h-4" />
                总计提交
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 加载状态 */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-[#165DFF] animate-spin" />
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 mb-6">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* 提交列表 */}
        {!loading && !error && (
          <div className="space-y-4">
            {submissions.length === 0 ? (
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-12 text-center">
                  <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">暂无提交记录</h3>
                  <p className="text-gray-400 mb-6">快去上传真实JD，赢取免费奖励吧！</p>
                  <Link href="/jobs/submit">
                    <Button className="bg-[#165DFF] hover:bg-[#165DFF]/90">
                      <Upload className="w-4 h-4 mr-2" />
                      立即上传JD
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              submissions.map(submission => {
                const statusInfo = getStatusInfo(submission.status);
                return (
                  <Card key={submission.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* 岗位名称和企业 */}
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {submission.job_name}
                            </h3>
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${statusInfo.color}`}>
                              {statusInfo.icon}
                              {statusInfo.label}
                            </span>
                          </div>
                          
                          {/* 企业信息 */}
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                            <span className="flex items-center gap-1">
                              <Briefcase className="w-4 h-4" />
                              {submission.company_name}
                            </span>
                            {submission.city && (
                              <span>{submission.city}</span>
                            )}
                            {submission.industry && (
                              <span className="text-gray-400">|</span>
                            )}
                            {submission.industry && (
                              <span>{submission.industry}</span>
                            )}
                          </div>

                          {/* 薪资范围 */}
                          {(submission.salary_min || submission.salary_max) && (
                            <div className="text-sm text-[#FF7D00] font-medium mb-3">
                              薪资：{formatSalary(submission.salary_min, submission.salary_max)}元/月
                            </div>
                          )}

                          {/* 驳回原因 */}
                          {submission.status === 2 && submission.reject_reason && (
                            <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mt-3">
                              驳回原因：{submission.reject_reason}
                            </div>
                          )}

                          {/* 奖励提示 */}
                          {submission.status === 1 && (
                            <div className="bg-green-50 text-green-700 px-3 py-2 rounded-lg text-sm mt-3 flex items-center gap-2">
                              <Award className="w-4 h-4" />
                              恭喜！审核已通过，3次AI次数+7天会员已发放
                            </div>
                          )}
                        </div>

                        {/* 提交时间 */}
                        <div className="text-right text-sm text-gray-400">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(submission.create_time)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
