'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LayoutGrid,
  Database,
  Crown,
  Shield,
  HelpCircle,
  MessageSquare,
  ChevronRight,
  Phone,
  Mail,
  Check } from 'lucide-react';

const faqCategories = [
  { id: 'platform', label: '平台功能', icon: <LayoutGrid className="w-5 h-5" /> },
  { id: 'data', label: '数据相关', icon: <Database className="w-5 h-5" /> },
  { id: 'membership', label: '会员服务', icon: <Crown className="w-5 h-5" /> },
  { id: 'privacy', label: '隐私安全', icon: <Shield className="w-5 h-5" /> }
];

const faqs = [
  // 平台功能
  {
    category: 'platform',
    question: '职途星是什么？',
    answer: '职途星是专注于大学生求职的AI智能平台，提供职业规划、模拟面试、能力测评、岗位匹配等一站式服务，助你科学规划职业方向。'
  },
  {
    category: 'platform',
    question: '岗位匹配的准确率如何？',
    answer: '我们基于4000+真实招聘JD，结合AI语义匹配和技能图谱分析，匹配准确率远超关键词搜索。系统会综合你的专业、技能、意向城市等多维度信息进行智能推荐。'
  },
  {
    category: 'platform',
    question: '能力测评测的是什么？',
    answer: '能力测评涵盖专业硬技能、通用软技能和职业性格三个维度，通过标准化评估帮助你发现优势与短板，为职业规划提供数据支撑。'
  },
  {
    category: 'platform',
    question: '技能图谱有什么用？',
    answer: '技能图谱可视化展示各岗位所需技能体系及技能间关联关系，帮你明确学习路径，补齐技能短板，提升求职竞争力。'
  },
  {
    category: 'platform',
    question: '如何使用AI职业规划功能？',
    answer: '进入AI职业规划页面，填写你的专业、技能、意向等信息，系统会基于真实岗位数据为你生成个性化的职业规划报告，包含方向推荐、能力差距分析和学习建议。'
  },
  {
    category: 'platform',
    question: '手机能用吗？需要下载APP吗？',
    answer: '职途星支持手机浏览器直接访问，无需下载APP。我们针对移动端做了适配优化，体验流畅。'
  },
  // 数据相关
  {
    category: 'data',
    question: '你们的岗位数据从哪来？',
    answer: '岗位数据来源于国聘网、国家24365大学生就业服务平台、中国公共招聘网、广西人才网等合规招聘平台的真实招聘JD，经过标准化解析和去重处理后入库，确保信息真实可靠。'
  },
  {
    category: 'data',
    question: '数据多久更新一次？',
    answer: '我们每周定期从国聘网、国家24365大学生就业服务平台、中国公共招聘网、广西人才网等合规招聘平台同步最新岗位信息，确保数据的时效性和准确性。'
  },
  {
    category: 'data',
    question: '岗位信息是真实的吗？',
    answer: '所有岗位信息均来自国聘网、国家24365大学生就业服务平台、中国公共招聘网、广西人才网等合规招聘平台的真实JD，我们每周更新数据，确保信息准确可靠。'
  },
  {
    category: 'data',
    question: '支持哪些行业和岗位？',
    answer: '目前覆盖互联网、金融、制造、教育、医疗、房地产、零售等27个行业，涵盖技术、产品、运营、市场、职能、设计等主流岗位类型，后续会持续扩展。'
  },
  {
    category: 'data',
    question: '搜索结果按什么排序？',
    answer: '搜索结果默认按与你的匹配度排序，综合考量技能匹配度、行业相关性、城市偏好等因素，你也可以切换为按薪资或更新时间排序。'
  },
  // 会员服务
  {
    category: 'membership',
    question: '月度会员9.9元包含什么？',
    answer: '月度会员可享受无限次AI模拟面试、无限次能力测评、胜任力评估、考研就业决策等专属功能，以及优先客服支持。'
  },
  {
    category: 'membership',
    question: '会员权益和免费用户有什么区别？',
    answer: '免费用户享有：职业规划无限次、模拟面试、能力测评等所有功能完全免费、考研决策3次；会员可享受所有功能无限次使用、可下载PDF格式的职业规划报告、免费下载海量求职资源、优先客服支持等特权。'
  },
  {
    category: 'membership',
    question: '如何取消会员？',
    answer: '你可以在会员中心点击取消续费，当前会员权益将在到期日前继续有效，不会立即失效。'
  },
  {
    category: 'membership',
    question: '会员可以退款吗？',
    answer: '会员开通后7天内如未使用任何会员特权，可申请全额退款；超过7天或已使用会员特权，不予退款，敬请谅解。'
  },
  {
    category: 'membership',
    question: '会员到期后数据会丢失吗？',
    answer: '不会。你的测评报告、面试记录、职业规划等数据永久保留，会员到期后仅限制部分高级功能的使用，数据不会丢失。'
  },
  {
    category: 'membership',
    question: '如何查看我的会员状态？',
    answer: '登录后进入「个人中心」，点击「我的会员」即可查看当前会员状态、到期时间和剩余天数。'
  },
  // 使用指南
  {
category: 'platform',
    question: '如何注册职途星账号？',
    answer: '点击首页的「注册」按钮，输入邮箱并设置密码，完成邮箱验证后即可注册。注册后即可使用各项免费功能（职业规划无限次、模拟面试3次、能力测评1次、考研决策3次）。'
  },
  {
category: 'platform',
    question: '如何修改个人信息？',
    answer: '登录后进入个人中心，点击编辑资料即可修改昵称、专业、年级、意向城市等信息，修改后立即生效。'
  },
  {
category: 'platform',
    question: '忘记密码怎么办？',
    answer: '在登录页面点击「忘记密码」，输入注册时的邮箱，接收验证码后即可重置新密码。'
  },
  {
category: 'platform',
    question: '收不到验证码怎么办？',
    answer: '1. 检查手机信号是否正常；2. 确认短信拦截箱是否有拦截记录；3. 尝试重新获取验证码；4. 如仍有问题，可联系客服微信：zhituxing_kefu'
  },
  {
category: 'platform',
    question: '每月免费次数用完了怎么办？',
    answer: '有三种方式：1. 邀请好友注册并完成首次AI提问，双方各获得3次免费AI次数+7天会员；2. 开通会员享受无限次使用；3. 关注平台活动，获取额外赠送次数。'
  },
  {
category: 'platform',
    question: '如何邀请好友？',
    answer: '登录后进入「个人中心」→「我的邀请」，复制你的专属邀请链接或邀请码发送给好友，好友通过你的链接注册并完成首次AI提问后，双方即可获得奖励。'
  },
  {
category: 'platform',
    question: '邀请好友的奖励怎么领取？',
    answer: '奖励会自动发放。当好友通过你的邀请链接注册并完成首次AI提问后，系统会自动将3次免费AI次数和7天会员时长添加到你的账户，无需手动领取。'
  },
  // 隐私安全
  {
    category: 'privacy',
    question: '我的个人信息安全吗？',
    answer: '我们采用银行级加密存储，所有敏感数据传输均使用HTTPS加密，严格遵守《个人信息保护法》，不会向第三方出售或共享你的个人信息。'
  },
  {
    category: 'privacy',
    question: '你们会泄露我的数据吗？',
    answer: '绝对不会。我们承诺绝不向任何第三方出售、出租或共享用户个人数据。数据仅用于为你提供更好的服务体验。'
  },
  {
    category: 'privacy',
    question: '如何注销账号？',
    answer: '你可以在设置中选择注销账号，注销后所有个人数据将在7个工作日内彻底删除，且不可恢复，请谨慎操作。'
  },
  {
    category: 'privacy',
    question: '遇到bug怎么反馈？',
    answer: '可以通过以下方式反馈：1. 点击页面右下角的「意见反馈」提交问题；2. 发送邮件至 business@zhituxing.com；3. 添加客服微信：zhituxing_kefu。我们会尽快处理。'
  },
  {
    category: 'privacy',
    question: '页面打不开怎么办？',
    answer: '1. 刷新页面或清除浏览器缓存后重试；2. 更换浏览器尝试；3. 检查网络连接是否正常；4. 如仍有问题，联系客服处理。'
  },
  {
    category: 'privacy',
    question: '如何联系人工客服？',
    answer: '你可以：1. 添加客服微信 zhituxing_kefu（推荐）；2. 发送邮件至 business@zhituxing.com；3. 在「联系我们」页面提交表单。工作时间：周一至周五 9:00-18:00'
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

      <div className="max-w-6xl mx-auto px-4 py-12">
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
        <Card className="mt-12 bg-gradient-to-r from-blue-50 to-blue-50 border-blue-200">
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
