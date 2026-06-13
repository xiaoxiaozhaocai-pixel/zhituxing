'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Crown, Check, Zap, BarChart3, Network, Sparkles, Star, Shield, Loader2, ImageIcon, X, Download
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import Image from 'next/image';

const MEMBERSHIP_PLANS = [
  {
    name: '月度会员',
    price: 9.9,
    period: '月',
    description: '轻松体验会员权益',
    features: [
      '无限AI对话次数',
      '完整岗位匹配分析',
      '技能图谱全功能',
      '学习路径规划',
      '对话导出（无限次）',
      '1个月有效期'
    ],
    popular: true,
    slug: 'monthly'
  },
  {
    name: '学期会员',
    price: 29.9,
    period: '学期',
    description: '适合短期求职准备',
    features: [
      '无限AI对话次数',
      '完整岗位匹配分析',
      '技能图谱全功能',
      '学习路径规划',
      '测评报告PDF导出',
      '对话导出（无限次）',
      '4个月有效期'
    ],
    popular: false,
    slug: 'semester'
  },
  {
    name: '年度会员',
    price: 69.9,
    period: '年',
    description: '最受欢迎的选择',
    features: [
      '无限AI对话次数',
      '完整岗位匹配分析',
      '技能图谱全功能',
      '学习路径规划',
      '测评报告PDF导出',
      'AI模拟面试无限次',
      '职业规划深度分析',
      '对话导出（无限次）',
      '12个月有效期'
    ],
    popular: false,
    slug: 'yearly'
  },
  {
    name: '永久会员',
    price: 199,
    period: '永久',
    description: '一次购买终身使用',
    features: [
      '所有年度会员权益',
      '永久有效无限制',
      '优先新功能体验',
      '专属客服支持',
      '简历优化服务',
      '求职指导咨询'
    ],
    popular: false,
    slug: 'lifetime'
  }
];

const FREE_BENEFITS = [
  { icon: <Zap className="w-5 h-5" />, title: 'AI对话', desc: '每日10次对话' },
  { icon: <BarChart3 className="w-5 h-5" />, title: '匹配分析', desc: '基础岗位匹配' },
  { icon: <Network className="w-5 h-5" />, title: '技能图谱', desc: '查看技能关系' },
  { icon: <Sparkles className="w-5 h-5" />, title: '岗位搜索', desc: '搜索职位、查看详情' },
  { icon: <Download className="w-5 h-5" />, title: '对话导出', desc: '每日3次导出机会' },
];

export default function MembershipPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<typeof MEMBERSHIP_PLANS[0] | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'wechat' | 'alipay'>('wechat');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [userNote, setUserNote] = useState('');
  const [orderStatus, setOrderStatus] = useState<'idle' | 'uploading' | 'submitting' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null);

  const handleOpenPlan = useCallback((plan: typeof MEMBERSHIP_PLANS[0]) => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/membership');
      return;
    }
    setSelectedPlan(plan);
    setScreenshotFile(null);
    setScreenshotPreview(null);
    setUserNote('');
    setOrderStatus('idle');
    setErrorMessage('');
    setPaymentMethod('wechat');
    setDialogOpen(true);
  }, [isAuthenticated, router]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('仅支持 JPG、PNG、WebP 格式的图片');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片大小不能超过 5MB');
      return;
    }

    setScreenshotFile(file);
    setScreenshotPreview(URL.createObjectURL(file));
    setErrorMessage('');
  }, []);

  const clearScreenshot = useCallback(() => {
    setScreenshotFile(null);
    setScreenshotPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleSubmitOrder = useCallback(async () => {
    if (!selectedPlan || !screenshotFile) return;

    setOrderStatus('uploading');
    setErrorMessage('');

    try {
      // Step 1: Upload screenshot
      const uploadFormData = new FormData();
      uploadFormData.append('file', screenshotFile);

      const uploadRes = await fetch('/api/orders/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (uploadRes.status === 401) {
        toast.error('登录已过期，请重新登录');
        router.push('/login?redirect=/membership');
        return;
      }

      const uploadData = await uploadRes.json();
      if (uploadData.code !== 200) {
        setOrderStatus('error');
        setErrorMessage(uploadData.message || '上传截图失败');
        return;
      }

      const { path } = uploadData.data;

      // Step 2: Create order
      setOrderStatus('submitting');
      const orderBody: Record<string, unknown> = {
        plan: selectedPlan.slug,
        payment_method: paymentMethod,
        payment_screenshot_url: path,
      };
      if (userNote.trim()) {
        orderBody.user_note = userNote.trim().slice(0, 500);
      }

      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderBody),
      });

      if (orderRes.status === 401) {
        toast.error('登录已过期，请重新登录');
        router.push('/login?redirect=/membership');
        return;
      }

      if (orderRes.status === 409) {
        toast.error('您已是终身会员，无需购买其他套餐');
        setDialogOpen(false);
        return;
      }

      const orderData = await orderRes.json();
      if (orderData.code !== 200) {
        setOrderStatus('error');
        setErrorMessage(orderData.message || '创建订单失败');
        return;
      }

      toast.success('订单提交成功，请等待审核');
      setDialogOpen(false);
      router.push('/profile/orders');
    } catch {
      setOrderStatus('error');
      setErrorMessage('网络异常，请重试');
      toast.error('网络异常，请重试');
    }
  }, [selectedPlan, screenshotFile, paymentMethod, userNote, router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4">
        {/* 标题 */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-100 to-blue-100 text-blue-700 border border-blue-200 mb-4">
            <Crown className="w-5 h-5" /> 会员中心
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            解锁全部功能，加速职业发展
          </h1>
          <p className="text-gray-500 max-w-lg mx-auto">
            选择适合你的会员套餐，享受无限AI对话、深度分析、专业报告等高级功能
          </p>
        </div>

        {/* 会员套餐卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {MEMBERSHIP_PLANS.map((plan) => (
            <Card 
              key={plan.name} 
              className={`relative overflow-hidden transition-all hover:shadow-lg ${
                plan.popular 
                  ? 'border-blue-500 ring-2 ring-blue-500/20 scale-[1.02] bg-gradient-to-b from-blue-50 to-white' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-blue-500 to-blue-500 text-white text-xs px-3 py-1 rounded-bl-lg">
                  🔥 入门首选
                </div>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  {plan.name}
                  {plan.popular && <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />}
                </CardTitle>
                <p className="text-sm text-gray-500">{plan.description}</p>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">¥{plan.price}</span>
                  <span className="text-sm text-gray-500 ml-1">/{plan.period}</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button 
                  className={`w-full ${
                    plan.popular 
                      ? 'bg-gradient-to-r from-blue-500 to-blue-500 hover:from-blue-600 hover:to-blue-600' 
                      : 'bg-gray-800 hover:bg-gray-900'
                  }`}
                  onClick={() => handleOpenPlan(plan)}
                >
                  立即开通
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 免费用户权益 */}
        <Card className="mb-8 border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-500" /> 免费用户权益
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FREE_BENEFITS.map((b) => (
                <div key={b.title} className="flex items-center gap-3 p-4 rounded-lg bg-gray-50">
                  <span className="text-blue-500">{b.icon}</span>
                  <div>
                    <div className="font-medium text-gray-800">{b.title}</div>
                    <div className="text-sm text-gray-500">{b.desc}</div>
                  </div>
                  <Check className="w-5 h-5 text-green-500 ml-auto" />
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-gray-500 mt-4">
              免费用户可体验基础功能，升级会员解锁全部能力 ✨
            </p>
          </CardContent>
        </Card>

        {/* FAQ */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">常见问题</h3>
          <div className="max-w-2xl mx-auto space-y-2">
            {[
              { q: '审核需要多久？', a: '提交订单后，管理员会在 1 小时内完成审核，审核通过后会员权益自动激活。' },
              { q: '审核未通过怎么办？', a: '如果支付金额不符或截图不清晰，管理员会驳回并注明原因。您可以在「我的订单」中查看驳回原因，重新提交即可。' },
              { q: '付款后可以退款吗？', a: '会员权益激活后，如因平台原因无法正常使用，可联系客服全额退款。因个人原因退款，按剩余有效期比例退还。' },
            ].map((faq, i) => (
                <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setFaqOpenIndex(faqOpenIndex === i ? null : i)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm text-left text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium">{faq.q}</span>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${faqOpenIndex === i ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {faqOpenIndex === i && (
                    <div className="px-4 pb-3 text-sm text-gray-500">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>

        {/* 底部提示 */}
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-2">
            所有套餐均支持发票开具，如有问题请联系客服
          </p>
          <p className="text-xs text-gray-400">
            职途星 — 让每个大学生都能获得专业的就业指导
          </p>
        </div>
      </div>

      {/* 下单 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              开通 {selectedPlan?.name} - ¥{selectedPlan?.price}
            </DialogTitle>
            <DialogDescription>
              请选择支付方式并上传付款截图完成订单
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 支付方式选择 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">支付方式</label>
              <div className="flex gap-4">
                <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                  paymentMethod === 'wechat' 
                    ? 'border-green-500 bg-green-50 text-green-700' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    value="wechat"
                    checked={paymentMethod === 'wechat'}
                    onChange={() => setPaymentMethod('wechat')}
                    className="sr-only"
                  />
                  <span className="text-lg">💚</span>
                  <span className="font-medium">微信支付</span>
                </label>
                <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                  paymentMethod === 'alipay' 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    value="alipay"
                    checked={paymentMethod === 'alipay'}
                    onChange={() => setPaymentMethod('alipay')}
                    className="sr-only"
                  />
                  <span className="text-lg">💙</span>
                  <span className="font-medium">支付宝</span>
                </label>
              </div>
            </div>

            {/* 金额警告（醒目红框，防止用户付错金额） */}
            {selectedPlan && (
              <div className="rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3 text-center">
                <p className="text-sm text-red-700 font-semibold">
                  ⚠️ 请支付准确金额：<span className="text-lg font-bold">¥{selectedPlan.price.toFixed(1)}</span> 整
                  <button
                    onClick={() => { navigator.clipboard.writeText(String(selectedPlan.price)); toast.success('金额已复制'); }}
                    className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-white border border-red-300 rounded-md hover:bg-red-100 transition-colors"
                  >
                    📋 复制
                  </button>
                </p>
                <p className="text-xs text-red-600 mt-1">
                  金额不符的订单将被审核驳回，不予开通会员
                </p>
              </div>
            )}

            {/* 收款码（按支付方式切换；key 强制 React 重挂载 img，避免浏览器缓存复用） */}
            <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${paymentMethod === 'wechat' ? 'border-green-300 bg-green-50/50' : 'border-blue-300 bg-blue-50/50'}`}>
              <Image
                key={paymentMethod}
                src={paymentMethod === 'wechat' ? '/images/payment/wechat-pay.jpg' : '/images/payment/alipay-pay.jpg'}
                alt={paymentMethod === 'wechat' ? '微信支付收款码' : '支付宝收款码'}
                width={192}
                height={192}
                className="mx-auto rounded-lg shadow-sm mb-3 object-contain"
                priority
              />
              <p className="text-sm text-gray-700 font-medium">
                {paymentMethod === 'wechat' ? '使用微信扫一扫支付' : '使用支付宝扫一扫支付'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                转账时请备注您的注册手机号或邮箱，付款后下方上传截图
              </p>
              <p className="text-xs text-gray-400 mt-1">
                扫码遇到问题？加客服微信 <strong>zhituxing</strong> 协助
              </p>
            </div>

            {/* 上传截图 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">上传付款截图</label>
              {!screenshotPreview ? (
                <div 
                  className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">点击选择截图文件</p>
                  <p className="text-xs text-gray-400 mt-1">支持 JPG、PNG、WebP，最大 5MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              ) : (
                <div className="relative">
                  <Image 
                    src={screenshotPreview} 
                    alt="付款截图预览" 
                    width={400}
                    height={192}
                    className="w-full max-h-48 object-contain rounded-lg border border-gray-200"
                    unoptimized
                  />
                  <button
                    className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
                    onClick={clearScreenshot}
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                  <p className="text-xs text-gray-500 mt-1">{screenshotFile?.name}</p>
                </div>
              )}
            </div>

            {/* 备注 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                备注 <span className="text-gray-400 font-normal">（可选）</span>
              </label>
              <textarea
                className="w-full border border-gray-200 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                maxLength={500}
                placeholder="如有备注请填写，如转账时备注的姓名"
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
              />
              <p className="text-xs text-gray-400 text-right">{userNote.length}/500</p>
            </div>

            {/* 错误提示 */}
            {orderStatus === 'error' && errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3">
                {errorMessage}
              </div>
            )}

            {/* 提交按钮 */}
            <Button
              className="w-full bg-gradient-to-r from-blue-500 to-blue-500 hover:from-blue-600 hover:to-blue-600"
              disabled={!screenshotFile || orderStatus === 'uploading' || orderStatus === 'submitting'}
              onClick={handleSubmitOrder}
            >
              {orderStatus === 'uploading' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  上传截图中...
                </>
              ) : orderStatus === 'submitting' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  创建订单中...
                </>
              ) : (
                '提交订单'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}