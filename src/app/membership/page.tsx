'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Zap, FileDown, BookOpen, Headphones, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const membershipBenefits = [
  {
    icon: <Zap className="w-8 h-8 text-[#165DFF]" />,
    title: '无限次AI服务',
    description: '岗位查询、职业规划、模拟面试、成功率测算无限次使用'
  },
  {
    icon: <FileDown className="w-8 h-8 text-[#165DFF]" />,
    title: '专属成长报告',
    description: '生成可下载PDF格式的完整职业规划报告'
  },
  {
    icon: <BookOpen className="w-8 h-8 text-[#165DFF]" />,
    title: '海量求职资源',
    description: '免费下载1000+简历模板、面试题库、求职干货'
  },
  {
    icon: <Headphones className="w-8 h-8 text-[#165DFF]" />,
    title: '优先客服支持',
    description: '专属客服通道，问题1小时内响应'
  }
];

const membershipPlans = [
  {
    id: 'monthly',
    title: '月卡',
    price: '¥9.9',
    period: '/月',
    features: ['所有会员特权'],
    buttonText: '立即开通',
    isRecommended: false,
    buttonColor: 'bg-[#165DFF] hover:bg-[#165DFF]/90'
  },
  {
    id: 'quarterly',
    title: '季卡（推荐）',
    price: '¥19.9',
    period: '/季',
    originalPrice: '折合6.6元/月',
    features: ['所有会员特权', '额外赠送30天会员'],
    buttonText: '立即开通',
    isRecommended: true,
    buttonColor: 'bg-[#FF7D00] hover:bg-[#e67000]'
  },
  {
    id: 'yearly',
    title: '年卡',
    price: '¥49.9',
    period: '/年',
    originalPrice: '折合4.1元/月',
    features: ['所有会员特权', '额外赠送90天会员', '1次简历精修服务'],
    buttonText: '立即开通',
    isRecommended: false,
    buttonColor: 'bg-[#165DFF] hover:bg-[#165DFF]/90'
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
        // 跳转到支付页面
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {membershipBenefits.map((benefit, index) => (
              <Card key={index} className="border-2 border-gray-100 hover:border-[#165DFF]/20 transition-all duration-300 hover:shadow-lg">
                <CardContent className="pt-6 text-center">
                  <div className="mb-4">{benefit.icon}</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                  <p className="text-gray-600 text-sm">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Membership Plans */}
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
              {plan.isRecommended && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-[#FF7D00] text-white text-sm font-medium px-4 py-1 rounded-full">
                    推荐
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
                  {plan.originalPrice && (
                    <p className="text-sm text-[#165DFF] mt-1">{plan.originalPrice}</p>
                  )}
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
                选择{membershipPlans.find(p => p.id === selectedPlan)?.title} - {membershipPlans.find(p => p.id === selectedPlan)?.price}
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
                  <>确认支付 ¥{membershipPlans.find(p => p.id === selectedPlan)?.price.replace('¥', '')}</>
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
