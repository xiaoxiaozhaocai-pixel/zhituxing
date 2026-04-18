'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gift, Users, Trophy, Copy, Share2, CheckCircle } from 'lucide-react';

const inviteRules = [
  '邀请1位好友注册并完成首次AI提问，你和好友各获得3次免费AI次数+7天会员',
  '累计邀请3位好友，额外获得30天会员',
  '累计邀请10位好友，额外获得90天会员+1次简历精修服务',
  '邀请好友开通会员，你将获得30%现金分成（可提现到微信/支付宝）',
  '邀请人数上不封顶，奖励可叠加领取'
];

const inviteRecords = [
  { name: '李四', time: '2026-01-15 14:30', status: '已完成首次提问', reward: '3次AI+7天会员' },
  { name: '王五', time: '2026-01-14 10:20', status: '已注册', reward: '待完成首次提问' },
  { name: '赵六', time: '2026-01-12 16:45', status: '已开通会员', reward: '现金分成¥9.9' }
];

export default function InvitePage() {
  const [copied, setCopied] = useState(false);
  const [showPosterModal, setShowPosterModal] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://zhituxing.com/invite/abc123');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            🎁 邀请好友 免费领会员
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
              <h3 className="text-3xl font-bold text-gray-900 mb-1">3</h3>
              <p className="text-gray-600">累计邀请人数</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-gray-100 text-center">
            <CardContent className="pt-6">
              <Trophy className="w-12 h-12 text-[#FF7D00] mx-auto mb-4" />
              <h3 className="text-3xl font-bold text-gray-900 mb-1">14天</h3>
              <p className="text-gray-600">累计获得会员天数</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-gray-100 text-center">
            <CardContent className="pt-6">
              <Gift className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-3xl font-bold text-gray-900 mb-1">¥9.9</h3>
              <p className="text-gray-600">累计获得现金分成</p>
            </CardContent>
          </Card>
        </div>

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
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-3">你的专属邀请链接</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white px-3 py-2 rounded border text-sm break-all">
                    https://zhituxing.com/invite/abc123
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
                        复制链接
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
              查看你的邀请历史和奖励
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {inviteRecords.map((record, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{record.name}</p>
                    <p className="text-sm text-gray-500">{record.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-[#165DFF]">{record.status}</p>
                    <p className="text-xs text-gray-500">{record.reward}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Withdrawal Info */}
        <Card className="mt-8 bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              💰 提现规则
            </h3>
            <ul className="space-y-2 text-gray-700">
              <li>• 现金分成满10元即可提现</li>
              <li>• 提现方式：微信支付、支付宝支付</li>
              <li>• 提现到账时间：1-3个工作日</li>
              <li>• 提现手续费：无手续费</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Poster Modal */}
      {showPosterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center">邀请海报</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-[3/4] bg-gradient-to-br from-[#165DFF] to-[#165DFF]/80 rounded-lg flex flex-col items-center justify-center p-8 text-white text-center">
                <h3 className="text-2xl font-bold mb-4">职途星</h3>
                <p className="mb-6">你的AI职业规划助手</p>
                <div className="w-32 h-32 bg-white rounded-lg flex items-center justify-center mb-6">
                  <span className="text-gray-400">二维码</span>
                </div>
                <p className="text-sm">扫码注册，双方都能获得免费会员</p>
              </div>
            </CardContent>
            <div className="p-4 flex gap-3">
              <Button className="flex-1 bg-[#165DFF] hover:bg-[#165DFF]/90 text-white">
                保存图片
              </Button>
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setShowPosterModal(false)}
              >
                关闭
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
