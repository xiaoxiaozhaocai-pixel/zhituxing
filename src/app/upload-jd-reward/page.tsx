'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { 
  Upload, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  AlertCircle,
  Crown,
  FileText,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Award,
  Gift,
  HelpCircle,
  Shield,
  Zap,
  Star
} from 'lucide-react';

// 提交记录接口
interface Submission {
  id: number;
  job_name: string;
  company_name: string;
  city: string;
  status: number;
  reject_reason: string | null;
  reward_granted: boolean;
  created_at: string;
}

export default function UploadJdRewardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload');
  const [_showTextInput, setShowTextInput] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  
  // 表单状态
  const [jobName, setJobName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [city, setCity] = useState('');
  const [salary, setSalary] = useState('');
  const [jdContent, setJdContent] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 进度计算
  const approvedCount = submissions.filter(s => s.status === 1 && !s.reward_granted).length;
  const progress = Math.min((approvedCount / 3) * 100, 100);
  const remaining = Math.max(0, 3 - approvedCount);
  const isComplete = approvedCount >= 3;

  // 获取提交记录
  const fetchSubmissions = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/jd/submit', {
        headers: {
          'x-user-id': user.id.toString()
        }
      });
      
      const data = await response.json();
      
      if (data.code === 200) {
        setSubmissions(data.data?.list || []);
      }
    } catch (error) {
      console.error('获取提交记录失败:', error);
    } finally {
      setListLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth?redirect=/upload-jd-reward');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchSubmissions();
    }
  }, [user, fetchSubmissions]);

  // 提交JD
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!jobName || !companyName || !jdContent) {
      setMessage({ type: 'error', text: '请填写必填项：岗位名称、企业名称、JD内容' });
      return;
    }

    if (!user) return;

    setSubmitting(true);
    setMessage(null);

    try {
      // 解析薪资范围
      let salaryMin = null;
      let salaryMax = null;
      const salaryMatch = salary.match(/(\d+)[kK]?\s*[-~]\s*(\d+)[kK]?/);
      if (salaryMatch) {
        salaryMin = parseInt(salaryMatch[1]!) * 1000;
        salaryMax = parseInt(salaryMatch[2]!) * 1000;
      }

      const response = await fetch('/api/jd/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id.toString()
        },
        body: JSON.stringify({
          job_name: jobName,
          company_name: companyName,
          city: city || null,
          salary_min: salaryMin,
          salary_max: salaryMax,
          jd_content: jdContent
        })
      });

      const data = await response.json();

      if (data.code === 200) {
        setMessage({ type: 'success', text: data.message || '提交成功！' });
        // 清空表单
        setJobName('');
        setCompanyName('');
        setCity('');
        setSalary('');
        setJdContent('');
        setShowTextInput(false);
        // 刷新提交记录
        await fetchSubmissions();
      } else {
        setMessage({ type: 'error', text: data.message || '提交失败' });
      }
    } catch (error) {
      console.error('提交失败:', error);
      setMessage({ type: 'error', text: '网络错误，请稍后重试' });
    } finally {
      setSubmitting(false);
    }
  };

  const faqs = [
    {
      q: '上传的JD会泄露我的个人信息吗？',
      a: '绝对不会。我们只会提取岗位公开信息，不会收集任何个人隐私，所有上传的JD都会脱敏处理后展示。'
    },
    {
      q: '审核需要多久？',
      a: '系统自动初审10分钟内完成，人工复核24小时内完成，审核结果会通过站内信通知你。'
    },
    {
      q: '会员什么时候到账？',
      a: '累计3条审核通过后，终身会员会自动到账，无需手动领取，立即生效。'
    },
    {
      q: '我已经是会员了，上传JD还有奖励吗？',
      a: '有的。已开通会员的用户，上传3条审核通过后，可额外获得6个月会员时长。'
    },
    {
      q: '可以上传哪些企业的JD？',
      a: '支持所有企业的校招JD，包括国企、央企、互联网、事业单位等。必须是2026届应届毕业生校招岗位。'
    }
  ];

  const renderStatus = (status: number, rewardGranted: boolean) => {
    switch (status) {
      case 0:
        return <span className="text-gray-500 flex items-center gap-1"><Clock className="w-4 h-4" /> 待审核</span>;
      case 1:
        return (
          <span className="text-green-600 flex items-center gap-1">
            <CheckCircle className="w-4 h-4" /> 
            审核通过 
            {rewardGranted && <Award className="w-4 h-4 text-orange-500" />}
          </span>
        );
      case 2:
        return <span className="text-red-600 flex items-center gap-1"><XCircle className="w-4 h-4" /> 审核不通过</span>;
      default:
        return null;
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#722ED1]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* 顶部Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-full text-sm mb-4">
            <Gift className="w-4 h-4" />
            限时活动
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            <span className="text-yellow-300">上传3条</span>真实校招JD
            <br />
            <span className="text-4xl md:text-5xl">免费领9.9元终身会员</span>
          </h1>
          <p className="text-white/90 text-lg mb-6">
            永久解锁无限次AI模拟面试 + 全套求职工具
          </p>
          <div className="flex items-center justify-center gap-2 text-yellow-200">
            <Crown className="w-6 h-6" />
            <span className="font-medium">一杯奶茶钱，永久省掉</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 进度条 */}
        <Card className="mb-8 border-2 border-orange-200 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-500" />
                <span className="font-bold text-lg text-gray-900">
                  你的上传进度
                </span>
              </div>
              <span className="text-2xl font-bold text-orange-500">
                {approvedCount}/3
              </span>
            </div>
            <Progress value={progress} className="h-3" indicatorClassName="bg-gradient-to-r from-orange-400 to-orange-500" />
            <p className="text-sm text-gray-500 mt-2">
              {isComplete ? (
                <span className="text-green-600 font-medium flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  恭喜！终身会员已自动到账
                </span>
              ) : (
                <>还差 <span className="text-orange-500 font-bold">{remaining}条</span>，即可领取9.9元终身会员</>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Tab切换 */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'upload'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50 border'
            }`}
          >
            <Upload className="w-5 h-5 inline mr-2" />
            上传JD
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50 border'
            }`}
          >
            <FileText className="w-5 h-5 inline mr-2" />
            我的上传 ({submissions.length})
          </button>
        </div>

        {activeTab === 'upload' ? (
          <>
            {/* 3步流程 */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-600" />
                  3步免费领终身会员
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">
                      1
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1">上传真实校招JD</h4>
                    <p className="text-sm text-gray-500">粘贴岗位文本或上传截图，支持任意企业校招岗位</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">
                      2
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1">等待审核通过</h4>
                    <p className="text-sm text-gray-500">系统自动初审+人工复核，24小时内出结果</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                    <div className="w-12 h-12 bg-orange-500 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">
                      3
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1">自动到账终身会员</h4>
                    <p className="text-sm text-gray-500">累计3条审核通过，会员自动开通，永久有效</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 上传表单 */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit}>
                  {message && (
                    <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                      message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {message.type === 'success' ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <AlertCircle className="w-5 h-5" />
                      )}
                      {message.text}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        岗位名称 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={jobName}
                        onChange={(e) => setJobName(e.target.value)}
                        placeholder="例如：前端开发工程师（2026届校招）"
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          企业名称 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="例如：阿里巴巴"
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          工作城市
                        </label>
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="例如：北京"
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        薪资范围（可选）
                      </label>
                      <input
                        type="text"
                        value={salary}
                        onChange={(e) => setSalary(e.target.value)}
                        placeholder="例如：15k-25k 或 15000-25000"
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        JD内容 <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={jdContent}
                        onChange={(e) => setJdContent(e.target.value)}
                        placeholder="粘贴岗位描述内容，包括岗位职责、任职要求等..."
                        rows={8}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all resize-none"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full mt-6 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-lg py-6 shadow-lg"
                  >
                    {submitting ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5 mr-2" />
                    )}
                    {submitting ? '提交中...' : '立即提交JD'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* 审核标准 */}
            <Card className="mb-6 border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  审核通过标准
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    必须是2026年应届毕业生校招岗位，实习/社招岗位不通过
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    包含完整的岗位名称、薪资范围、工作城市、企业名称
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    岗位描述清晰，无明显虚假、重复、过时内容
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    未被其他用户上传过的全新岗位
                  </li>
                </ul>
                <div className="mt-4 p-3 bg-orange-100 rounded-lg text-orange-700 text-sm">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  禁止上传重复、虚假、非校招岗位，违规账号将取消奖励资格
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="pt-6">
              {listLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                </div>
              ) : submissions.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">暂无上传记录</p>
                  <Button
                    onClick={() => setActiveTab('upload')}
                    className="mt-4 bg-purple-600 hover:bg-purple-700"
                  >
                    去上传JD
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {submissions.map((item) => (
                    <div
                      key={item.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{item.job_name}</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            {item.company_name}
                            {item.city && ` · ${item.city}`}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            提交于 {new Date(item.created_at).toLocaleDateString('zh-CN')}
                          </p>
                        </div>
                        <div className="text-right">
                          {renderStatus(item.status, item.reward_granted)}
                          {item.status === 2 && item.reject_reason && (
                            <p className="text-xs text-red-500 mt-1 max-w-[200px] text-right">
                              原因：{item.reject_reason}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 常见问题 */}
        <Card className="mt-8">
          <CardContent className="pt-6">
            <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-purple-600" />
              常见问题
            </h3>
            <div className="space-y-2">
              {faqs.map((faq, index) => (
                <div key={index} className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium text-gray-900">{faq.q}</span>
                    {expandedFaq === index ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  {expandedFaq === index && (
                    <div className="px-4 pb-4 text-gray-600 text-sm">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 安全说明 */}
        <div className="mt-6 text-center text-sm text-gray-500 flex items-center justify-center gap-4">
          <span className="flex items-center gap-1">
            <Shield className="w-4 h-4" />
            信息安全
          </span>
          <span>|</span>
          <span className="flex items-center gap-1">
            <Star className="w-4 h-4" />
            真实可靠
          </span>
          <span>|</span>
          <span className="flex items-center gap-1">
            <Zap className="w-4 h-4" />
            快速审核
          </span>
        </div>
      </div>
    </div>
  );
}
