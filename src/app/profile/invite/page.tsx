'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Gift, Users, Trophy, Copy, Share2, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const inviteRules = [
  '邀请1位好友注册并完成首次AI提问，双方各获得3次AI次数+7天会员',
  '累计邀请3人，额外获得30天会员',
  '累计邀请10人，额外获得90天会员+1次免费简历精修服务'
];

interface InviteRecord {
  id: string;
  invitee_name: string;
  reward_quota: number;
  reward_days: number;
  status: string;
  created_at: string;
  claimed_at: string;
}

interface InviteStats {
  total_invites: number;
  claimed_rewards: number;
  total_quota_earned: number;
  total_days_earned: number;
}

export default function InvitePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showPosterModal, setShowPosterModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [stats, setStats] = useState<InviteStats>({ total_invites: 0, claimed_rewards: 0, total_quota_earned: 0, total_days_earned: 0 });
  const [records, setRecords] = useState<InviteRecord[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // 未登录则跳转到登录页
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  // 获取邀请数据
  useEffect(() => {
    if (user) {
      fetchInviteData();
    }
  }, [user]);

  const fetchInviteData = async () => {
    setDataLoading(true);
    try {
      // 获取邀请码和统计
      const codeResponse = await fetch('/api/invite/my-code');
      const codeData = await codeResponse.json();
      
      if (codeData.success) {
        setInviteCode(codeData.data.invite_code);
        setStats(codeData.data.stats);
      }

      // 获取邀请记录
      const recordsResponse = await fetch('/api/invite/my-invites');
      const recordsData = await recordsResponse.json();
      
      if (recordsData.success) {
        setRecords(recordsData.data.my_invites);
      }
    } catch (error) {
      console.error('获取邀请数据失败:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/auth?invite_code=${inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  const getStatusText = (record: InviteRecord) => {
    if (record.status === 'claimed') {
      return `已领取：${record.reward_quota}次AI+${record.reward_days}天会员`;
    }
    return '待领取';
  };

  const getStatusColor = (record: InviteRecord) => {
    if (record.status === 'claimed') {
      return 'text-green-600';
    }
    return 'text-[#FF7D00]';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            邀请好友 免费领会员
          </h1>
          <p className="text-lg text-gray-600">
            邀请好友一起使用职途星，双方都能获得丰厚奖励
          </p>
        </div>

        {/* Invite Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="border-2 border-gray-100 text-center">
            <CardContent className="pt-6">
              <Users className="w-12 h-12 text-[#165DFF] mx-auto mb-4" />
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{stats.total_invites}</h3>
              <p className="text-gray-600">累计邀请人数</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-gray-100 text-center">
            <CardContent className="pt-6">
              <Trophy className="w-12 h-12 text-[#FF7D00] mx-auto mb-4" />
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{stats.total_days_earned}天</h3>
              <p className="text-gray-600">累计获得会员天数</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-gray-100 text-center">
            <CardContent className="pt-6">
              <Gift className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{stats.total_quota_earned}次</h3>
              <p className="text-gray-600">累计获得AI次数</p>
            </CardContent>
          </Card>
        </div>

        {/* 里程碑进度 */}
        <Card className="mb-8 border-2 border-[#FF7D00]/30 bg-gradient-to-r from-[#FF7D00]/5 to-transparent">
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">里程碑奖励进度</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${stats.total_invites >= 3 ? 'bg-green-500' : 'bg-gray-300'}`}>
                    {stats.total_invites >= 3 ? <CheckCircle className="w-5 h-5 text-white" /> : <span className="text-white text-sm">3</span>}
                  </div>
                  <span className="text-gray-700">邀请3人 → 额外30天会员</span>
                </div>
                <span className="text-sm text-gray-500">{Math.min(stats.total_invites, 3)}/3</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-[#FF7D00] h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((stats.total_invites / 3) * 100, 100)}%` }}
                />
              </div>
              
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${stats.total_invites >= 10 ? 'bg-green-500' : 'bg-gray-300'}`}>
                    {stats.total_invites >= 10 ? <CheckCircle className="w-5 h-5 text-white" /> : <span className="text-white text-sm">10</span>}
                  </div>
                  <span className="text-gray-700">邀请10人 → 90天会员+简历精修</span>
                </div>
                <span className="text-sm text-gray-500">{Math.min(stats.total_invites, 10)}/10</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-[#165DFF] h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((stats.total_invites / 10) * 100, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Invite Rules */}
          <Card className="border-2 border-gray-100">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Gift className="w-6 h-6 text-[#FF7D00] mr-2" />
                邀请奖励规则
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {inviteRules.map((rule, index) => (
                  <li key={index} className="flex items-start">
                    <div className="w-6 h-6 bg-[#165DFF]/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 mr-3">
                      <span className="text-[#165DFF] text-sm font-bold">{index + 1}</span>
                    </div>
                    <span className="text-gray-700">{rule}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Invite Methods */}
          <Card className="border-2 border-gray-100">
            <CardHeader>
              <CardTitle>邀请方式</CardTitle>
              <CardDescription>
                选择一种方式邀请好友
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 邀请码 */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">你的专属邀请码</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white px-4 py-3 rounded border text-xl font-bold text-center tracking-wider">
                    {inviteCode || '加载中...'}
                  </code>
                  <Button
                    onClick={handleCopyCode}
                    className={copied ? 'bg-green-500 hover:bg-green-600' : 'bg-[#165DFF] hover:bg-[#165DFF]/90'}
                  >
                    {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">好友注册时填写此邀请码，双方都能获得奖励</p>
              </div>

              {/* 邀请链接 */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-3">你的专属邀请链接</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white px-3 py-2 rounded border text-sm break-all">
                    {inviteCode ? `${window.location.origin}/auth?invite_code=${inviteCode}` : '加载中...'}
                  </code>
                  <Button
                    onClick={handleCopyLink}
                    className={copied ? 'bg-green-500 hover:bg-green-600' : 'bg-[#165DFF] hover:bg-[#165DFF]/90'}
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        已复制
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        复制
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <Button
                className="w-full bg-[#FF7D00] hover:bg-[#e67000] text-white"
                onClick={() => setShowPosterModal(true)}
              >
                <Share2 className="w-4 h-4 mr-2" />
                生成邀请海报
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Invite Records */}
        <Card className="mt-8 border-2 border-gray-100">
          <CardHeader>
            <CardTitle>邀请记录</CardTitle>
            <CardDescription>
              查看你的邀请历史和奖励（共{records.length}条记录）
            </CardDescription>
          </CardHeader>
          <CardContent>
            {records.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>暂无邀请记录</p>
                <p className="text-sm">快去邀请好友吧！</p>
              </div>
            ) : (
              <div className="space-y-4">
                {records.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{record.invitee_name}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(record.created_at).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm ${getStatusColor(record)}`}>{getStatusText(record)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Link href="/profile">
            <Button variant="ghost">返回个人中心</Button>
          </Link>
        </div>
      </div>

      {/* Poster Modal */}
      <Dialog open={showPosterModal} onOpenChange={setShowPosterModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">邀请海报</DialogTitle>
          </DialogHeader>
          <div className="aspect-[3/4] bg-gradient-to-br from-[#165DFF] to-[#722ED1] rounded-lg flex flex-col items-center justify-center p-8 text-white text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl font-bold">职</span>
            </div>
            <h3 className="text-2xl font-bold mb-2">职途星</h3>
            <p className="mb-4 text-white/80">你的AI职业规划助手</p>
            <div className="w-40 h-40 bg-white rounded-lg flex flex-col items-center justify-center mb-4">
              <span className="text-gray-600 text-sm mb-2">邀请码</span>
              <span className="text-2xl font-bold text-[#165DFF] tracking-wider">{inviteCode}</span>
            </div>
            <p className="text-sm text-white/80">扫码注册，双方都能获得3次免费AI次数</p>
          </div>
          <div className="flex gap-3 mt-4">
            <Button 
              className="flex-1 bg-[#165DFF] hover:bg-[#165DFF]/90 text-white"
              onClick={() => {
                // 分享功能
                if (navigator.share) {
                  navigator.share({
                    title: '职途星 - AI职业规划助手',
                    text: `我的邀请码是 ${inviteCode}，注册职途星双方都能获得免费AI次数！`,
                    url: `${window.location.origin}/auth?invite_code=${inviteCode}`
                  });
                } else {
                  handleCopyLink();
                }
              }}
            >
              <Share2 className="w-4 h-4 mr-2" />
              分享海报
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowPosterModal(false)}
            >
              关闭
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
