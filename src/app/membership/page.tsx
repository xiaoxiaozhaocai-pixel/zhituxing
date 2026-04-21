'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Zap, FileDown, BookOpen, Headphones, Loader2, Users, BarChart3, MessageCircle, Crown, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// 更新后的会员权益
const membershipBenefits = [
  {
    icon: <Zap className="w-8 h-8 text-[#165DFF]" />,
    title: '无限次AI核心服务',
    description: '职业规划、岗位查询、模拟面试、考研决策、能力测评无限次使用'
  },
  {
    icon: <FileDown className="w-8 h-8 text-[#165DFF]" />,
    title: '专属成长报告',
    description: '解锁所有报告完整内容，支持PDF格式下载'
  },
  {
    icon: <BarChart3 className="w-8 h-8 text-[#165DFF]" />,
    title: '胜任力动态评估',
    description: '专属胜任力雷达图，每月自动更新成长报告'
  },
  {
    icon: <Users className="w-8 h-8 text-[#165DFF]" />,
    title: '会员专属社群',
    description: '加入专属社群，获得每周直播答疑和求职指导'
  },
  {
    icon: <BookOpen className="w-8 h-8 text-[#165DFF]" />,
    title: '内推资源库',
    description: '会员专属内推资源库，定期更新企业校招内推码'
  },
  {
    icon: <Headphones className="w-8 h-8 text-[#165DFF]" />,
    title: '优先客服支持',
    description: '专属客服通道，问题1小时内响应'
  },
  {
    icon: <MessageCircle className="w-8 h-8 text-[#165DFF]" />,
    title: '增值服务折扣',
    description: '享受所有增值付费服务8折优惠'
  }
];

// 新的官方定价体系
const membershipPlans = [
  {
    id: 'trial',
    title: '体验会员',
    price: '¥9.9',
    period: '/30天',
    features: [
      '所有会员专属特权',
      '无限次AI核心服务',
      '完整报告内容查看',
      '胜任力动态评估'
    ],
    buttonText: '立即开通',
    isRecommended: false,
    buttonColor: 'bg-gray-600 hover:bg-gray-700',
    badge: null
  },
  {
    id: 'semester',
    title: '学期会员',
    price: '¥29.9',
    period: '/6个月',
    badge: '🔥 推荐',
    features: [
      '所有会员专属特权',
      '无限次AI核心服务',
      '完整报告内容查看',
      '胜任力动态评估',
      '会员专属内推资源'
    ],
    buttonText: '立即开通',
    isRecommended: true,
    buttonColor: 'bg-[#FF7D00] hover:bg-[#e67000]'
  },
  {
    id: 'yearly',
    title: '年度会员',
    price: '¥49.9',
    period: '/12个月',
    badge: '💰 最划算',
    features: [
      '所有会员专属特权',
      '无限次AI核心服务',
      '完整报告内容查看',
      '胜任力动态评估',
      '会员专属内推资源',
      '优先客服响应'
    ],
    buttonText: '立即开通',
    isRecommended: false,
    buttonColor: 'bg-[#165DFF] hover:bg-[#165DFF]/90'
  }
];

// 增值付费服务
const valueAddedServices = [
  {
    id: 'resume-refine',
    title: '1v1简历精修',
    price: '¥39.9',
    unit: '/次',
    description: '专业HR一对一指导，量身打造高质量简历',
    icon: <FileDown className="w-6 h-6" />
  },
  {
    id: 'interview-review',
    title: '1v1模拟面试复盘',
    price: '¥59.9',
    unit: '/次',
    description: '专业导师深度复盘，快速提升面试技巧',
    icon: <MessageCircle className="w-6 h-6" />
  },
  {
    id: 'career-report',
    title: '专属职业规划定制报告',
    price: '¥99.9',
    unit: '/份',
    description: '资深规划师定制，生成专属职业发展路线图',
    icon: <Crown className="w-6 h-6" />
  }
];

export default function MembershipPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('wechat');
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
    if (!selectedPlan) return;

    setIsProcessing(true);
    try {
      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan,
          paymentMethod
        })
      });

      const data = await res.json();

      if (data.success) {
        router.push(`/payment/${data.data.orderNo}`);
      } else {
        alert(data.error || '创建订单失败');
      }
    } catch (error) {
      console.error('支付失败:', error);
      alert('支付失败，请稍后重试');
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedPlanData = membershipPlans.find(p => p.id === selectedPlan);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            💎 职途星会员中心
          </h1>
          <p className="text-lg text-gray-600">
            开通会员，解锁无限AI服务+专属特权
          </p>
        </div>

        {/* Membership Benefits */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">会员专属权益</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {membershipBenefits.map((benefit, index) => (
              <Card key={index} className="border-2 border-gray-100 hover:border-[#165DFF]/20 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <CardContent className="pt-6 text-center">
                  <div className="mb-4 flex justify-center">{benefit.icon}</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                  <p className="text-gray-600 text-sm">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Membership Plans */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">选择适合您的套餐</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {membershipPlans.map((plan) => (
              <Card
                key={plan.id}
                className={`border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 ${
                  plan.isRecommended
                    ? 'border-[#FF7D00] relative'
                    : 'border-gray-100'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                    <span className="bg-[#FF7D00] text-white text-sm font-medium px-4 py-1 rounded-full shadow-lg">
                      {plan.badge}
                    </span>
                  </div>
                )}
                <CardHeader className="text-center pt-8">
                  <CardTitle className="text-xl font-bold text-gray-900">{plan.title}</CardTitle>
                  <CardDescription className="mt-4">
                    <div className="flex items-baseline justify-center">
                      <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                      <span className="text-gray-500 ml-1">{plan.period}</span>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-gray-700">
                        <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className={`w-full text-white py-6 h-auto text-lg ${plan.buttonColor}`}
                    onClick={() => handleSubscribe(plan.id)}
                  >
                    {plan.buttonText}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
          
          {/* 定价说明文案 */}
          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm bg-gray-100 inline-block px-4 py-2 rounded-lg">
              💡 核心学期会员定价仅为竞品同类服务的30%，远低于大学生月度平均可支配收入，大幅降低用户付费决策门槛
            </p>
          </div>
        </div>

        {/* Value-Added Services */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">增值付费服务</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {valueAddedServices.map((service) => (
              <Card
                key={service.id}
                className="border-2 border-gray-100 hover:border-[#165DFF]/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-[#165DFF]/10 rounded-xl flex items-center justify-center text-[#165DFF]">
                      {service.icon}
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-[#FF7D00]">{service.price}</span>
                      <span className="text-gray-500 text-sm">{service.unit}</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{service.title}</h3>
                  <p className="text-gray-600 text-sm mb-4">{service.description}</p>
                  <Button
                    className="w-full bg-[#165DFF] hover:bg-[#165DFF]/90 text-white"
                    onClick={() => handleSubscribe(service.id)}
                  >
                    立即预约
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 text-sm">
            💡 会员开通后7天内如未使用任何会员特权，可申请全额退款
          </p>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-center">支付方式</CardTitle>
              <CardDescription className="text-center">
                选择{selectedPlanData?.title} - {selectedPlanData?.price}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <button
                  className={`flex-1 py-4 rounded-lg border-2 transition-all ${
                    paymentMethod === 'wechat'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setPaymentMethod('wechat')}
                >
                  <div className="text-center">
                    <div className="w-10 h-10 bg-green-500 rounded-lg mx-auto mb-2 flex items-center justify-center">
                      <span className="text-white text-xl">W</span>
                    </div>
                    <span className="text-sm font-medium">微信支付</span>
                  </div>
                </button>
                <button
                  className={`flex-1 py-4 rounded-lg border-2 transition-all ${
                    paymentMethod === 'alipay'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setPaymentMethod('alipay')}
                >
                  <div className="text-center">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg mx-auto mb-2 flex items-center justify-center">
                      <span className="text-white text-xl">A</span>
                    </div>
                    <span className="text-sm font-medium">支付宝</span>
                  </div>
                </button>
              </div>
              <Button
                className={`w-full py-6 text-lg ${
                  paymentMethod === 'wechat'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white`}
                onClick={handlePayment}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    正在创建订单...
                  </>
                ) : (
                  <>确认支付 {selectedPlanData?.price}</>
                )}
              </Button>
            </CardContent>
            <CardFooter>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setShowPaymentModal(false)}
                disabled={isProcessing}
              >
                取消
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
