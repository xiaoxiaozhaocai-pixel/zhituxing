'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Bot, 
  Gift, 
  Headphones,
  HelpCircle,
  MessageSquare,
  ChevronRight,
  Phone,
  Mail,
  Copy,
  Check
} from 'lucide-react';

const faqCategories = [
  { id: 'account', label: '账户与会员', icon: <User className="w-5 h-5" /> },
  { id: 'ai', label: 'AI服务与配额', icon: <Bot className="w-5 h-5" /> },
  { id: 'invite', label: '邀请奖励', icon: <Gift className="w-5 h-5" /> },
  { id: 'support', label: '技术支持', icon: <Headphones className="w-5 h-5" /> }
];

const faqs = [
  // 账户与会员
  {
    category: 'account',
    question: '如何注册职途星账号？',
    answer: '点击首页的「注册」按钮，输入手机号并获取验证码，设置密码后即可完成注册。注册后自动获得5次免费AI服务次数。'
  },
  {
    category: 'account',
    question: '忘记密码怎么办？',
    answer: '在登录页面点击「忘记密码」，输入注册时的手机号，接收验证码后即可重置新密码。'
  },
  {
    category: 'account',
    question: '收不到验证码怎么办？',
    answer: '1. 检查手机信号是否正常；2. 确认短信拦截箱是否有拦截记录；3. 尝试重新获取验证码；4. 如仍有问题，可联系客服微信：zhituxing_kefu'
  },
  {
    category: 'account',
    question: '会员权益和免费用户有什么区别？',
    answer: '免费用户每月可使用5次AI服务；会员可享受无限次AI服务、可下载PDF格式的职业规划报告、免费下载海量求职资源、优先客服支持等特权。'
  },
  {
    category: 'account',
    question: '会员可以退款吗？',
    answer: '会员开通后7天内如未使用任何会员特权，可申请全额退款；超过7天或已使用会员特权，不予退款，敬请谅解。'
  },
  {
    category: 'account',
    question: '如何查看我的会员状态？',
    answer: '登录后进入「个人中心」，点击「我的会员」即可查看当前会员状态、到期时间和剩余天数。'
  },
  // AI服务与配额
  {
    category: 'ai',
    question: '每月免费次数用完了怎么办？',
    answer: '有三种方式：1. 邀请好友注册并完成首次AI提问，双方各获得3次免费AI次数+7天会员；2. 开通会员享受无限次使用；3. 关注平台活动，获取额外赠送次数。'
  },
  {
    category: 'ai',
    question: '每月免费次数会清零吗？',
    answer: '是的，每月免费次数会在每月最后一天清零，新的一月重新获得5次免费次数。会员的无限次权益不受影响。'
  },
  {
    category: 'ai',
    question: '岗位信息是真实的吗？',
    answer: '所有岗位信息均来自BOSS直聘、智联招聘、拉勾网等各大招聘平台的真实JD，我们每周更新数据，确保信息准确可靠。'
  },
  {
    category: 'ai',
    question: '支持哪些行业和岗位？',
    answer: '目前覆盖互联网、金融、制造、教育、医疗、房地产、零售等15+主流行业，包含技术、产品、运营、市场、职能、设计等8大类岗位，后续会持续扩展更多行业。'
  },
  {
    category: 'ai',
    question: 'AI生成的职业规划报告准确吗？',
    answer: '职途星的AI职业规划基于500万+全行业真实招聘数据分析生成，报告仅供参考。建议结合自身实际情况和市场需求综合考虑，最终的职业选择仍需你自行决策。'
  },
  // 邀请奖励
  {
    category: 'invite',
    question: '如何邀请好友？',
    answer: '登录后进入「个人中心」→「我的邀请」，复制你的专属邀请链接或邀请码发送给好友，好友通过你的链接注册并完成首次AI提问后，双方即可获得奖励。'
  },
  {
    category: 'invite',
    question: '邀请好友的奖励怎么领取？',
    answer: '奖励会自动发放。当好友通过你的邀请链接注册并完成首次AI提问后，系统会自动将3次免费AI次数和7天会员时长添加到你的账户，无需手动领取。'
  },
  {
    category: 'invite',
    question: '累计邀请奖励有哪些？',
    answer: '邀请1位好友：双方各获得3次AI次数+7天会员；累计邀请3人：额外获得30天会员时长；累计邀请10人：额外获得90天会员+1次简历精修服务。'
  },
  {
    category: 'invite',
    question: '好友已经注册过了，还能用邀请码吗？',
    answer: '抱歉，邀请码只能在好友注册时使用，已注册的老用户无法通过邀请码获得奖励。建议将邀请链接分享给还未注册的朋友。'
  },
  // 技术支持
  {
    category: 'support',
    question: '页面打不开怎么办？',
    answer: '1. 刷新页面或清除浏览器缓存后重试；2. 更换浏览器尝试；3. 检查网络连接是否正常；4. 如仍有问题，联系客服处理。'
  },
  {
    category: 'support',
    question: '遇到bug怎么反馈？',
    answer: '可以通过以下方式反馈：1. 点击页面右下角的「意见反馈」提交问题；2. 发送邮件至 business@zhituxing.com；3. 添加客服微信：zhituxing_kefu。我们会尽快处理。'
  },
  {
    category: 'support',
    question: '如何联系人工客服？',
    answer: '你可以：1. 添加客服微信 zhituxing_kefu（推荐）；2. 发送邮件至 business@zhituxing.com；3. 在「联系我们」页面提交表单。工作时间：周一至周五 9:00-18:00'
  },
  {
    category: 'support',
    question: '数据更新频率是怎样的？',
    answer: '岗位JD数据每周更新一次，确保信息时效性。AI推荐算法持续优化，会根据用户反馈和市场需求不断改进。如发现过期信息，欢迎反馈。'
  }
];

export default function FaqPage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copyWechat = () => {
    navigator.clipboard.writeText('zhituxing_kefu');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredFaqs = activeCategory 
    ? faqs.filter(f => f.category === activeCategory)
    : faqs;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <HelpCircle className="w-16 h-16 mx-auto mb-4 opacity-80" />
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            常见问题解答
          </h1>
          <p className="text-lg text-blue-100">
            在这里找到你想要的答案
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-3 mb-8">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              activeCategory === null
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            全部问题
          </button>
          {faqCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                activeCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          {filteredFaqs.map((faq, index) => (
            <Card key={index} className="overflow-hidden hover:shadow-md transition-shadow duration-200">
              <Accordion type="single" collapsible>
                <AccordionItem value={`item-${index}`} className="border-0">
                  <AccordionTrigger className="px-6 py-4 hover:bg-gray-50 transition-colors text-left">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </span>
                      <span className="font-medium text-gray-900">{faq.question}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="px-6 pb-4 pl-14 text-gray-600 leading-relaxed">
                      {faq.answer}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>
          ))}
        </div>

        {/* Quick Contact */}
        <Card className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-8 text-center">
            <MessageSquare className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              没有找到答案？
            </h2>
            <p className="text-gray-600 mb-6">
              我们的客服团队随时为你解答疑问
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button 
                onClick={copyWechat}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    已复制
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4 mr-2" />
                    微信客服
                  </>
                )}
              </Button>
              <Link href="/contact">
                <Button variant="outline" className="border-blue-300 text-blue-600 hover:bg-blue-50">
                  <Mail className="w-4 h-4 mr-2" />
                  联系我们
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Related Links */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 mb-4">相关链接</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/guide" className="text-blue-600 hover:text-blue-700 flex items-center gap-1">
              使用流程 <ChevronRight className="w-4 h-4" />
            </Link>
            <Link href="/membership" className="text-blue-600 hover:text-blue-700 flex items-center gap-1">
              会员中心 <ChevronRight className="w-4 h-4" />
            </Link>
            <Link href="/feedback" className="text-blue-600 hover:text-blue-700 flex items-center gap-1">
              意见反馈 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* FAQPage Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faqs.map(faq => ({
              "@type": "Question",
              "name": faq.question,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer
              }
            }))
          })
        }}
      />
    </div>
  );
}
