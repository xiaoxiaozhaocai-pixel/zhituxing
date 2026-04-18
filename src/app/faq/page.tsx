import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const faqs = [
  {
    question: '每月有几次免费AI服务？',
    answer: '每个注册用户每月可免费使用5次AI服务，包括岗位查询、职业规划、模拟面试、成功率测算。'
  },
  {
    question: '免费次数用完了怎么办？',
    answer: '可以邀请好友注册获得免费次数和会员，也可以开通会员享受无限次使用。邀请1位好友注册并完成首次AI提问，你和好友各获得3次免费AI次数+7天会员。'
  },
  {
    question: '会员有什么特权？',
    answer: '会员可享受无限次AI服务、可下载PDF格式的职业规划报告、免费下载海量求职资源、优先客服支持等特权。'
  },
  {
    question: '岗位信息是真实的吗？',
    answer: '所有岗位信息均来自BOSS直聘、智联招聘等各大招聘平台的真实JD，我们每周更新数据，确保信息准确。'
  },
  {
    question: '支持哪些行业和岗位？',
    answer: '目前覆盖互联网、金融、制造、教育、医疗等15+主流行业，包含技术、产品、运营、市场、职能等8大类岗位，后续会持续扩展更多行业。'
  },
  {
    question: '可以退款吗？',
    answer: '会员开通后7天内如未使用任何会员特权，可申请全额退款；超过7天或已使用会员特权，不予退款，敬请谅解。'
  },
  {
    question: '如何反馈问题或建议？',
    answer: '你可以通过「联系我们」页面提交反馈，我们会在24小时内回复。也可以添加客服微信：zhituxing_kefu 进行咨询。'
  }
];

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            常见问题
          </h1>
          <p className="text-lg text-gray-600">
            在这里找到你想要的答案
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border border-gray-200 rounded-lg px-4"
              >
                <AccordionTrigger className="text-left font-medium text-gray-900 hover:text-[#165DFF] py-4">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Contact CTA */}
        <div className="mt-12 text-center">
          <div className="bg-gradient-to-br from-[#165DFF]/5 to-[#165DFF]/10 rounded-xl p-8 border border-[#165DFF]/20">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              还有其他问题？
            </h3>
            <p className="text-gray-600 mb-6">
              如果以上问题没有解决你的疑问，欢迎联系我们
            </p>
            <a href="/contact">
              <button className="bg-[#165DFF] hover:bg-[#165DFF]/90 text-white px-8 py-3 rounded-lg font-medium transition-colors">
                联系我们
              </button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
