'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Zap, FileDown, Headphones, Loader2, Users, BarChart3, MessageCircle, Crown, Star, Gift, Download, FileText, Users2, BookOpen } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

// 会员权益（一次性解锁全部）
const membershipBenefits = [
  {
    icon: <MessageCircle className="w-8 h-8 text-[#FF7D00]" />,
    title: '无限次AI模拟面试',
    description: 'HR初面+业务面试+高管终面，无限次全流程模拟，逐题详细点评'
  },
  {
    icon: <BarChart3 className="w-8 h-8 text-[#165DFF]" />,
    title: '完整6维能力测评',
    description: '完整版测评报告，与同专业TOP10%差距对比，专属提升计划'
  },
  {
    icon: <Star className="w-8 h-8 text-[#722ED1]" />,
    title: '胜任力评估',
    description: '可视化能力雷达图，短板分析与针对性提升建议'
  },
  {
    icon: <Zap className="w-8 h-8 text-[#722ED1]" />,
    title: '每月自动职业规划复盘',
    description: '根据当月数据自动更新规划，实时跟踪求职进度'
  },
  {
    icon: <FileDown className="w-8 h-8 text-[#165DFF]" />,
    title: '完整版考研就业决策',
    description: '院校/专业推荐，个性化备考计划，历年分数线分析'
  },
  {
    icon: <Gift className="w-8 h-8 text-[#FF7D00]" />,
    title: '求职大礼包',
    description: '学长上岸简历模板 + 校招内推码 + 行测/专业笔试真题'
  },
  {
    icon: <Headphones className="w-8 h-8 text-[#FF7D00]" />,
    title: '增值服务8折',
    description: '1v1简历精修、面试复盘、职业规划定制报告全部8折'
  }
];

// 求职大礼包内容
const giftPackage = [
  {
    icon: <FileText className="w-5 h-5" />,
    title: '学长学姐上岸简历',
    description: '各专业真实脱敏简历模板',
    type: 'word模板'
  },
  {
    icon: <Users2 className="w-5 h-5" />,
    title: '校招内推码',
    description: '广西本地国企/大厂内推通道',
    type: '持续更新'
  },
  {
    icon: <BookOpen className="w-5 h-5" />,
    title: '笔试真题题库',
    description: '行测+专业笔试历年真题',
    type: 'PDF资料'
  }
];

export default function MembershipPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubscribe = (planId: string) => {
    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }
    setSelectedPlan(planId);
    setShowPaymentModal(true);
  };

  const handlePayment = async () => {
    setIsProcessing(true);
    // TODO: 接入真实支付
    setTimeout(() => {
      setIsProcessing(false);
      setShowPaymentModal(false);
      alert('支付功能暂未开放，请联系客服开通');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#FF7D00] to-[#FF9A2E] text-white py-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">9.9元，解锁全部求职神器</h1>
          <p className="text-xl text-orange-100 mb-6">
            一杯奶茶钱，搞定求职全流程
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full text-sm">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            首1000名用户可享 9.9元 终身会员
          </div>
        </div>
      </div>

      {/* 求职大礼包 - 前置展示 */}
      <div className="max-w-6xl mx-auto px-4 -mt-6 relative z-10">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-200 shadow-xl">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/30">
                <Gift className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">🎁 确定性交付：求职大礼包</h3>
                <p className="text-sm text-gray-600">开通会员即可下载，马上用得上</p>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {giftPackage.map((item, index) => (
                <div key={index} className="bg-white rounded-xl p-4 border border-green-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600 flex-shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{item.title}</div>
                    <div className="text-xs text-gray-500">{item.type}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 text-center">
            <Button 
              onClick={() => handleSubscribe('monthly')}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-8 py-3 text-lg font-bold shadow-lg shadow-green-500/30"
            >
              <Crown className="w-5 h-5 mr-2" />
              立即开通会员 · 下载全部
            </Button>
          </div>
        </div>
      </div>

      {/* 会员定价方案 */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">选择你的会员类型</h2>
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* 月度会员 */}
          <Card className="border-2 border-[#FF7D00] relative">
            <div className="absolute -top-3 left-4 px-3 py-1 bg-[#FF7D00] text-white text-sm rounded-full">
              推荐
            </div>
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl">月度会员</CardTitle>
              <div className="mt-2">
                <span className="text-4xl font-bold text-[#FF7D00]">9.9</span>
                <span className="text-gray-500">元 / 月</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Check className="w-4 h-4 text-green-500" />
                解锁全部付费功能
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Check className="w-4 h-4 text-green-500" />
                无限次AI模拟面试
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Check className="w-4 h-4 text-green-500" />
                完整能力测评报告
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Check className="w-4 h-4 text-green-500" />
                胜任力评估雷达图
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => handleSubscribe('monthly')}
                className="w-full bg-gradient-to-r from-[#FF7D00] to-[#FF9A2E] hover:opacity-90 text-white h-11"
              >
                立即开通
              </Button>
            </CardFooter>
          </Card>

          {/* 终身会员（首1000名） */}
          <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
            <div className="absolute -top-3 left-4 px-3 py-1 bg-purple-600 text-white text-sm rounded-full">
              首1000名
            </div>
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl">终身会员</CardTitle>
              <div className="mt-2">
                <span className="text-4xl font-bold text-purple-600">9.9</span>
                <span className="text-gray-500">元 一次性</span>
              </div>
              <div className="text-xs text-purple-600 mt-1">限前1000名，售完恢复原价</div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Check className="w-4 h-4 text-purple-500" />
                <span className="font-medium">永久解锁全部功能</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Check className="w-4 h-4 text-purple-500" />
                未来所有新功能免费
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Check className="w-4 h-4 text-purple-500" />
                专属终身会员标识
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Check className="w-4 h-4 text-purple-500" />
                优先客服通道
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => handleSubscribe('lifetime')}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white h-11"
              >
                抢前1000名
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* 求职大礼包 */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Gift className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">求职大礼包</h3>
              <p className="text-sm text-gray-500">开通会员即可下载</p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {giftPackage.map((item, index) => (
              <div key={index} className="bg-white rounded-xl p-4 border border-green-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                    {item.icon}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{item.title}</div>
                    <div className="text-xs text-gray-500">{item.type}</div>
                  </div>
                </div>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 会员权益详情 */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">会员专属权益</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {membershipBenefits.map((benefit, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">{benefit.icon}</div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">{benefit.title}</h3>
                    <p className="text-sm text-gray-600">{benefit.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 底部CTA */}
      <div className="bg-gradient-to-r from-[#FF7D00] to-[#FF9A2E] py-12">
        <div className="max-w-4xl mx-auto px-4 text-center text-white">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            一杯奶茶钱，搞定求职全流程
          </h2>
          <p className="text-lg text-orange-100 mb-6">
            AI职业规划永久免费，9.9元解锁全部求职神器
          </p>
          <Button 
            onClick={() => {
              if (!isAuthenticated) {
                router.push('/auth');
              } else {
                handleSubscribe('monthly');
              }
            }}
            className="bg-white text-[#FF7D00] hover:bg-orange-50 h-14 px-12 text-lg font-bold shadow-lg hover:shadow-xl transition-all"
          >
            立即开通 9.9元会员
          </Button>
        </div>
      </div>

      {/* 支付弹窗 */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="text-center mb-6">
              <div className="text-3xl font-bold text-[#FF7D00] mb-2">
                {selectedPlan === 'lifetime' ? '9.9元' : '9.9元 / 月'}
              </div>
              <p className="text-gray-600">
                {selectedPlan === 'lifetime' 
                  ? '终身会员，永久解锁全部功能' 
                  : '月度会员，解锁全部付费功能'}
              </p>
            </div>
            <div className="space-y-3 mb-6">
              <Button 
                variant="outline" 
                className="w-full h-12 justify-start pl-4"
                onClick={() => {}}
              >
                <span className="w-8 h-8 bg-green-500 rounded text-white text-sm flex items-center justify-center mr-3">微</span>
                微信支付
              </Button>
              <Button 
                variant="outline" 
                className="w-full h-12 justify-start pl-4"
                onClick={() => {}}
              >
                <span className="w-8 h-8 bg-blue-500 rounded text-white text-sm flex items-center justify-center mr-3">支</span>
                支付宝
              </Button>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowPaymentModal(false)}
              >
                取消
              </Button>
              <Button 
                className="flex-1 bg-[#FF7D00] hover:bg-[#FF7D00]/90"
                onClick={handlePayment}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  '确认支付'
                )}
              </Button>
            </div>
            <p className="text-center text-xs text-gray-400 mt-4">
              支付即表示同意《会员服务协议》
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
