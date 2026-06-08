'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { Sparkles, 
  Loader2, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  User,
  Calendar,
  MapPin,
  GraduationCap,
  Eye } from 'lucide-react';

// 报告项接口
interface ReportItem {
  id: number;
  user_id: number;
  user_nickname: string;
  user_phone: string;
  major: string;
  grade: string;
  city: string;
  is_latest: number;
  create_time: string;
}

// 年级选项
const gradeOptions = ['大一', '大二', '大三', '大四', '研一', '研二', '研三', '已毕业'];

export default function AdminCareerPlanningPage() {
  const { user, loading: authLoading } = useAuth();
  
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchParams, setSearchParams] = useState({
    user_id: '',
    major: '',
    grade: ''
  });

  useEffect(() => {
    if (user) {
      fetchReports();
    }
  }, [user, currentPage, searchParams]);

  const fetchReports = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('pageSize', '10');
      if (searchParams.user_id) params.append('user_id', searchParams.user_id);
      if (searchParams.major) params.append('major', searchParams.major);
      if (searchParams.grade) params.append('grade', searchParams.grade);
      
      const response = await fetch(`/api/admin/career-planning?${params.toString()}`, {
        headers: {
          'x-admin-id': user.id.toString()
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

  // 搜索处理
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchReports();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#722ED1] animate-spin" />
      </div>
    );
  }

  // 非管理员不能访问
  if (user && user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">权限不足</h2>
            <p className="text-gray-500">您没有权限访问此页面</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-[#722ED1]" />
            职业规划报告管理
          </h1>
          <p className="text-gray-500 mt-2">
            查看和管理所有用户的职业规划报告
          </p>
        </div>

        {/* 搜索筛选区 */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <label className="text-sm text-gray-600">用户ID</label>
                <Input
                  value={searchParams.user_id}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, user_id: e.target.value }))}
                  placeholder="输入用户ID"
                  className="w-32"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-gray-600">专业</label>
                <Input
                  value={searchParams.major}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, major: e.target.value }))}
                  placeholder="输入专业"
                  className="w-40"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-gray-600">年级</label>
                <select
                  value={searchParams.grade}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, grade: e.target.value }))}
                  className="h-10 px-3 rounded-lg border border-gray-200 bg-white"
                >
                  <option value="">全部</option>
                  {gradeOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <Button type="submit" className="bg-[#722ED1] hover:bg-[#722ED1]/90">
                搜索
              </Button>
              <Button 
                type="button" 
                variant="outline"
                onClick={() => {
                  setSearchParams({ user_id: '', major: '', grade: '' });
                  setCurrentPage(1);
                }}
              >
                重置
              </Button>
            </form>
          </CardContent>
        </Card>

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
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">ID</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">用户</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">专业</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">年级</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">意向城市</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">生成时间</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-gray-500">
                          暂无数据
                        </td>
                      </tr>
                    ) : (
                      reports.map((report) => (
                        <tr key={report.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {report.id}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <div>
                                <div className="text-gray-700">{report.user_nickname}</div>
                                <div className="text-xs text-gray-400">{report.user_phone}</div>
                              </div>
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
                          <td className="py-3 px-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              {formatDate(report.create_time)}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <a href={`/career-planning/report/${report.id}`} target="_blank">
                              <Button variant="outline" size="sm" className="text-[#722ED1] border-purple-200 hover:bg-purple-50">
                                <Eye className="w-4 h-4 mr-1" />
                                查看
                              </Button>
                            </a>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

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
