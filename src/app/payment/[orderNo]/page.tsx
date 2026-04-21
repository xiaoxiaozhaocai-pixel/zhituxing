'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle, Crown, ArrowRight, Gift } from 'lucide-react';

export default function PaymentResultPage() {
  const params = useParams();
  const router = useRouter();
  const orderNo = params.orderNo as string;
  
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [orderInfo, setOrderInfo] = useState<{
    planName: string;
    amount: number;
  } | null>(null);

  useEffect(() => {
    // 模拟支付回调处理
    const processPayment = async () => {
      try {
        // 调用支付回调API
        const res = await fetch('/api/payment/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderNo,
            status: 'paid',
            paidAt: new Date().toISOString()
          })
        });

        const data = await res.json();
        
        if (data.success) {
          setSuccess(true);
          // 从订单中获取套餐信息
          const ordersRes = await fetch('/api/payment');
          const ordersData = await ordersRes.json();
          const order = ordersData.data?.orders?.find((o: { orderNo: string }) => o.orderNo === orderNo);
          if (order) {
            setOrderInfo({
              planName: order.planName,
              amount: order.amount
            });
          }
        } else {
          setSuccess(false);
        }
      } catch (error) {
        console.error('处理支付结果失败:', error);
        setSuccess(false);
      } finally {
        setLoading(false);
      }
    };

    if (orderNo) {
      processPayment();
    }
  }, [orderNo]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">正在处理支付结果...</p>
        </div>
      </div>
    );
  }

  if (!success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✕</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">支付失败</h2>
            <p className="text-gray-600 mb-6">支付过程出现问题，请稍后重试</p>
            <div className="flex gap-4">
              <Link href="/membership" className="flex-1">
                <Button variant="outline" className="w-full">返回会员中心</Button>
              </Link>
              <Button 
                className="flex-1 bg-[#165DFF]"
                onClick={() => router.push('/membership')}
              >
                重试支付
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white py-12">
      <div className="max-w-md w-full mx-4">
        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-25"></div>
            <div className="relative w-24 h-24 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center shadow-lg">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">支付成功！</h1>
          <p className="text-gray-600">
            恭喜您成为职途星{orderInfo?.planName || '会员'}
          </p>
        </div>

        {/* Order Info */}
        <Card className="mb-6 border-2 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-600">套餐</span>
              <span className="font-semibold text-gray-900">{orderInfo?.planName || '会员'}</span>
            </div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-600">金额</span>
              <span className="font-semibold text-green-600 text-xl">
                ¥{orderInfo?.amount?.toFixed(2) || '0.00'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">订单号</span>
              <span className="text-sm text-gray-500">{orderNo}</span>
            </div>
          </CardContent>
        </Card>

        {/* Benefits Reminder */}
        <Card className="mb-6 bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Gift className="w-6 h-6 text-orange-500" />
              <span className="font-semibold text-gray-900">会员专属特权</span>
            </div>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                无限次AI服务（岗位查询、职业规划等）
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                海量求职资源免费下载
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                专属成长报告生成
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                优先客服支持
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          <Link href="/assistant">
            <Button className="w-full bg-[#165DFF] hover:bg-[#165DFF]/90 h-12 text-lg">
              <Crown className="w-5 h-5 mr-2" />
              立即体验AI服务
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <Link href="/profile">
            <Button variant="outline" className="w-full h-12">
              查看我的会员
            </Button>
          </Link>
        </div>

        {/* Share Section */}
        <div className="mt-8 p-4 bg-blue-50 rounded-xl text-center">
          <p className="text-sm text-gray-600 mb-2">分享给好友，双方都能获得额外配额</p>
          <Button variant="outline" size="sm" className="border-blue-300 text-blue-600">
            邀请好友
          </Button>
        </div>
      </div>
    </div>
  );
}
