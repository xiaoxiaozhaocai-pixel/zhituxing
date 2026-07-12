'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { 
  Sparkles, 
  Loader2, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  Calendar,
  MapPin,
  GraduationCap,
  Plus,
  Eye
} from 'lucide-react';

// 报告列表项接口
interface ReportItem {
  id: number;
  major: string;
  grade: string;
  city: string;
  is_latest: number;
  status: string;
  core_job: string;
  create_time: string;
}

export default function MyReportsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
// eslint-disable-next-line
      fetchReports();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentPage]);

  const fetchReports = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/career-planning/my-reports?page=${currentPage}&pageSize=10`, {
        headers: {
          'x-user-id': user.id.toString()
        }
      });
      
      const data = await response.json();
      
      if (data.code === 200) {
        setReports(data.data?.list || []);
        setTotalPages(data.data?.totalPages || 1);
      } else {
        setError(data.message || '获取报告列表失败');
      }
    } catch (error) {
      console.error('获取报告列表失败:', error);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#722ED1] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-7 h-7 text-[#722ED1]" />
              我的职业规划报告
            </h1>
            <p className="text-gray-500 mt-2">
              查看和管理您的职业规划报告
            </p>
          </div>
          <Link href="/career-planning">
            <Button className="bg-[#722ED1] hover:bg-[#722ED1]/90">
              <Plus className="w-4 h-4 mr-2" />
              生成新规划
            </Button>
          </Link>
        </div>

        {/* 加载状态 */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-[#722ED1] animate-spin" />
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 mb-6">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* 报告列表 */}
        {!loading && !error && (
          <>
            <div className="space-y-4">
              {reports.length === 0 ? (
                <Card className="border-2 border-dashed border-purple-200 hover:border-purple-300 transition-colors">
                  <CardContent className="p-16 text-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Sparkles className="w-12 h-12 text-purple-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">还没有职业规划报告</h3>
                    <p className="text-gray-500 mb-8 max-w-md mx-auto">
                      30秒生成专属职业规划，基于你的专业、年级和兴趣，精准匹配最适合你的岗位
                    </p>
                    <Link href="/career-planning">
                      <Button className="bg-gradient-to-r from-[#722ED1] to-[#9254DE] hover:from-[#722ED1]/90 hover:to-[#9254DE]/90 text-white px-8 py-6 text-lg font-bold shadow-lg shadow-purple-500/30">
                        <Sparkles className="w-5 h-5 mr-2" />
                        立即生成我的规划
                      </Button>
                    </Link>
                    <p className="text-sm text-gray-400 mt-4">永久免费 · 无次数限制 · 30秒出结果</p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="hover:shadow-md transition-shadow overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">生成时间</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">专业</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">年级</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">意向城市</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">核心方向</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">状态</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports.map((report) => (
                          <tr key={report.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                {formatDate(report.create_time)}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-700">
                              <div className="flex items-center gap-1">
                                <GraduationCap className="w-4 h-4 text-gray-400" />
                                {report.major || '未填写'}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-700">
                              {report.grade}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-700">
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                {report.city}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-700">
                              {report.core_job}
                            </td>
                            <td className="py-3 px-4">
                              <Badge className={
                                report.is_latest === 1 
                                  ? 'bg-green-100 text-green-700 border-green-200' 
                                  : 'bg-gray-100 text-gray-600 border-gray-200'
                              }>
                                {report.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <Link href={`/career-planning/report/${report.id}`}>
                                <Button variant="outline" size="sm" className="text-[#722ED1] border-purple-200 hover:bg-purple-50">
                                  <Eye className="w-4 h-4 mr-1" />
                                  查看
                                </Button>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  上一页
                </Button>
                <span className="text-sm text-gray-600">
                  第 {currentPage} / {totalPages} 页
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  下一页
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
