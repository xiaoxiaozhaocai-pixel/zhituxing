'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { 
  CheckCircle, 
  XCircle, 
  Loader2,
  AlertCircle,
  Briefcase,
  User,
  Calendar,
  MapPin,
  Building2,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  MessageSquare
} from 'lucide-react';

// 提交记录接口
interface Submission {
  id: number;
  user_id: number;
  user_nickname: string;
  job_name: string;
  industry: string;
  city: string;
  company_name: string;
  company_type: string;
  salary_min: number | null;
  salary_max: number | null;
  skills: string | null;
  jd_content: string;
  status: number;
  reject_reason: string | null;
  create_time: string;
  update_time: string;
}

export default function JdReviewPage() {
  const { user, loading: authLoading } = useAuth();
  
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState<number | null>(null);
  
  // 详情弹窗
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      fetchSubmissions();
    }
  }, [user, authLoading, currentPage, filterStatus]);

  const fetchSubmissions = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', '10');
      if (filterStatus !== null) {
        params.append('status', filterStatus.toString());
      }
      
      const response = await fetch(`/api/admin/jd?${params.toString()}`);
      const data = await response.json();
      
      if (data.code === 200) {
        setSubmissions(data.data?.list || []);
        setTotalPages(data.data?.total_pages || 1);
      } else {
        setError(data.message || '获取审核列表失败');
      }
    } catch (error) {
      console.error('获取审核列表失败:', error);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 审核通过
  const handleApprove = async (id: number) => {
    setActionLoading(true);
    setActionMessage(null);
    
    try {
      const response = await fetch(`/api/admin/jd/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'approve'
        })
      });
      
      const data = await response.json();
      
      if (data.code === 200) {
        setActionMessage({ type: 'success', text: '审核通过，奖励已发放' });
        setSelectedSubmission(null);
        fetchSubmissions();
      } else {
        setActionMessage({ type: 'error', text: data.message || '操作失败' });
      }
    } catch (error) {
      console.error('审核失败:', error);
      setActionMessage({ type: 'error', text: '网络错误，请稍后重试' });
    } finally {
      setActionLoading(false);
    }
  };

  // 审核驳回
  const handleReject = async (id: number) => {
    if (!rejectReason.trim()) {
      setActionMessage({ type: 'error', text: '请填写驳回原因' });
      return;
    }
    
    setActionLoading(true);
    setActionMessage(null);
    
    try {
      const response = await fetch(`/api/admin/jd/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'reject',
          reject_reason: rejectReason
        })
      });
      
      const data = await response.json();
      
      if (data.code === 200) {
        setActionMessage({ type: 'success', text: '已驳回，通知已发送' });
        setSelectedSubmission(null);
        setRejectReason('');
        fetchSubmissions();
      } else {
        setActionMessage({ type: 'error', text: data.message || '操作失败' });
      }
    } catch (error) {
      console.error('驳回失败:', error);
      setActionMessage({ type: 'error', text: '网络错误，请稍后重试' });
    } finally {
      setActionLoading(false);
    }
  };

  // 获取状态信息
  const getStatusInfo = (status: number) => {
    switch (status) {
      case 0:
        return {
          label: '待审核',
          color: 'bg-yellow-100 text-yellow-700 border-yellow-200'
        };
      case 1:
        return {
          label: '已通过',
          color: 'bg-green-100 text-green-700 border-green-200'
        };
      case 2:
        return {
          label: '已驳回',
          color: 'bg-red-100 text-red-700 border-red-200'
        };
      default:
        return {
          label: '未知',
          color: 'bg-gray-100 text-gray-700 border-gray-200'
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
            <CheckCircle className="w-7 h-7 text-[#165DFF]" />
            JD审核管理
          </h1>
          <p className="text-gray-500 mt-2">
            审核用户提交的校招JD，通过后可发放奖励
          </p>
        </div>

        {/* 消息提示 */}
        {actionMessage && (
          <div className={`mb-6 px-4 py-3 rounded-lg flex items-center gap-2 ${
            actionMessage.type === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {actionMessage.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
            <span>{actionMessage.text}</span>
          </div>
        )}

        {/* 筛选器 */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">筛选状态：</span>
              <div className="flex gap-2">
                <Button 
                  variant={filterStatus === null ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus(null)}
                  className={filterStatus === null ? 'bg-[#165DFF]' : ''}
                >
                  全部
                </Button>
                <Button 
                  variant={filterStatus === 0 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setFilterStatus(0); setCurrentPage(1); }}
                  className={filterStatus === 0 ? 'bg-yellow-500' : ''}
                >
                  待审核
                </Button>
                <Button 
                  variant={filterStatus === 1 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setFilterStatus(1); setCurrentPage(1); }}
                  className={filterStatus === 1 ? 'bg-green-500' : ''}
                >
                  已通过
                </Button>
                <Button 
                  variant={filterStatus === 2 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setFilterStatus(2); setCurrentPage(1); }}
                  className={filterStatus === 2 ? 'bg-red-500' : ''}
                >
                  已驳回
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

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

        {/* 列表 */}
        {!loading && !error && (
          <>
            <div className="space-y-4">
              {submissions.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600">暂无待审核记录</h3>
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
                              <Badge className={statusInfo.color} variant="outline">
                                {statusInfo.label}
                              </Badge>
                            </div>
                            
                            {/* 企业信息 */}
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                              <span className="flex items-center gap-1">
                                <Building2 className="w-4 h-4" />
                                {submission.company_name}
                              </span>
                              {submission.city && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  {submission.city}
                                </span>
                              )}
                              {submission.company_type && (
                                <span>{submission.company_type}</span>
                              )}
                              {(submission.salary_min || submission.salary_max) && (
                                <span className="flex items-center gap-1 text-[#FF7D00]">
                                  <DollarSign className="w-4 h-4" />
                                  {formatSalary(submission.salary_min, submission.salary_max)}元/月
                                </span>
                              )}
                            </div>

                            {/* 技能标签 */}
                            {submission.skills && (
                              <div className="flex flex-wrap gap-2 mb-3">
                                {submission.skills.split(',').map((skill, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {skill.trim()}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {/* 提交者和时间 */}
                            <div className="flex items-center gap-4 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {submission.user_nickname || `用户${submission.user_id}`}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(submission.create_time)}
                              </span>
                            </div>

                            {/* 驳回原因 */}
                            {submission.status === 2 && submission.reject_reason && (
                              <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mt-3 flex items-start gap-2">
                                <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <div>
                                  <span className="font-medium">驳回原因：</span>
                                  {submission.reject_reason}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* 操作按钮 */}
                          <div className="flex flex-col gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedSubmission(submission)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              查看详情
                            </Button>
                            {submission.status === 0 && (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="bg-green-500 hover:bg-green-600"
                                  onClick={() => handleApprove(submission.id)}
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  通过
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-500 border-red-200 hover:bg-red-50"
                                  onClick={() => {
                                    setSelectedSubmission(submission);
                                    setRejectReason('');
                                  }}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  驳回
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
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

      {/* 详情弹窗 */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[#165DFF]" />
                JD详情
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => { setSelectedSubmission(null); setRejectReason(''); }}
              >
                <X className="w-5 h-5" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 基本信息 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">基本信息</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">岗位名称：</span>
                    <span className="font-medium">{selectedSubmission.job_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">企业名称：</span>
                    <span className="font-medium">{selectedSubmission.company_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">所属行业：</span>
                    <span>{selectedSubmission.industry || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">工作城市：</span>
                    <span>{selectedSubmission.city || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">企业类型：</span>
                    <span>{selectedSubmission.company_type || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">薪资范围：</span>
                    <span className="text-[#FF7D00]">
                      {formatSalary(selectedSubmission.salary_min, selectedSubmission.salary_max)}元/月
                    </span>
                  </div>
                </div>
                {selectedSubmission.skills && (
                  <div className="mt-3">
                    <span className="text-gray-500 text-sm">技能要求：</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedSubmission.skills.split(',').map((skill, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {skill.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 提交者信息 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">提交者信息</h4>
                <div className="text-sm">
                  <span className="text-gray-500">提交用户：</span>
                  <span>{selectedSubmission.user_nickname || `用户${selectedSubmission.user_id}`}</span>
                </div>
                <div className="text-sm mt-1">
                  <span className="text-gray-500">提交时间：</span>
                  <span>{formatDate(selectedSubmission.create_time)}</span>
                </div>
              </div>

              {/* JD内容 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">JD内容</h4>
                <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {selectedSubmission.jd_content}
                </div>
              </div>

              {/* 驳回原因输入 */}
              {selectedSubmission.status === 0 && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-red-700 mb-3">驳回原因</h4>
                  <Textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="请输入驳回原因"
                    rows={3}
                  />
                </div>
              )}

              {/* 操作按钮 */}
              {selectedSubmission.status === 0 && (
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => { setSelectedSubmission(null); setRejectReason(''); }}
                  >
                    取消
                  </Button>
                  <Button
                    variant="outline"
                    className="text-red-500 border-red-200 hover:bg-red-50"
                    onClick={() => handleReject(selectedSubmission.id)}
                    disabled={actionLoading || !rejectReason.trim()}
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4 mr-2" />
                    )}
                    确认驳回
                  </Button>
                  <Button
                    className="bg-green-500 hover:bg-green-600"
                    onClick={() => handleApprove(selectedSubmission.id)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    审核通过
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
