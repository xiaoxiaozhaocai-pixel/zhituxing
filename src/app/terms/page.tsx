import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, AlertCircle, CheckSquare, Shield, Scale, RefreshCw, MessageCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: '服务条款 - 职途星',
  description: '职途星服务条款，了解使用本平台服务的权利与义务，包括服务说明、使用规范、知识产权等重要条款。',
};

const sections = [
  {
    icon: <FileText className="w-6 h-6 text-blue-600" />,
    title: '一、服务说明',
    content: `职途星是一个基于AI技术的职业规划与模拟面试平台，为大学生和求职者提供以下服务：`,
    list: [
      'AI职业规划：根据个人专业、兴趣生成职业发展路径',
      'AI模拟面试：模拟真实面试场景，提供评分和改进建议',
      '能力测评：6维胜任力评估，生成能力雷达图',
      '岗位匹配：基于技能匹配推荐适合的岗位',
      '职搭子JD助手：智能解读岗位描述，提供求职建议',
      '技能图谱：可视化技能关系，推荐学习路径',
    ],
  },
  {
    icon: <CheckSquare className="w-6 h-6 text-green-600" />,
    title: '二、用户注册',
    content: `使用职途星服务需要先注册账户：`,
    list: [
      '您需要提供真实、准确的注册信息',
      '一个邮箱只能注册一个账户',
      '您有责任保管好账户密码，对账户活动负责',
      '如发现账户被盗用，请立即联系我们',
      '免费用户享有每日限次的AI服务使用额度',
      '会员用户享有无限次AI服务和更多高级功能',
    ],
  },
  {
    icon: <AlertCircle className="w-6 h-6 text-orange-600" />,
    title: '三、使用规范',
    content: `使用本平台服务时，您承诺遵守以下规范：`,
    list: [
      '不得利用本平台从事违法违规活动',
      '不得发布虚假信息、欺诈性内容',
      '不得干扰或破坏平台的正常运营',
      '不得利用技术手段绕过使用限制',
      '不得侵犯他人知识产权或其他合法权益',
      '不得批量抓取、爬取平台数据',
    ],
    note: '违反以上规范，我们有权暂停或终止您的账户，并保留追究法律责任的权利。',
  },
  {
    icon: <Shield className="w-6 h-6 text-purple-600" />,
    title: '四、知识产权',
    content: `关于知识产权的说明：`,
    list: [
      '平台上的AI生成内容（如职业规划建议、面试反馈）供您个人参考使用',
      '平台的软件、设计、文字、图片等内容的知识产权归职途星所有',
      '您上传的个人信息和内容，其知识产权归您所有',
      '您授权我们使用您的个人信息来提供服务',
    ],
  },
  {
    icon: <Scale className="w-6 h-6 text-red-600" />,
    title: '五、免责声明',
    content: `在使用本平台服务时，请您了解：`,
    list: [
      'AI生成的内容仅供参考，不构成职业决策的唯一依据',
      '岗位信息来源于公开渠道，我们不对信息的准确性负责',
      '因网络、设备故障导致的服务中断，我们不承担责任',
      '因用户自身原因导致的损失，我们不承担责任',
      '因不可抗力（如自然灾害、政策变更）导致的服务中断，我们不承担责任',
    ],
    note: '在法律允许的范围内，我们的责任以您支付的服务费用为限。',
  },
  {
    icon: <RefreshCw className="w-6 h-6 text-cyan-600" />,
    title: '六、服务变更',
    content: `我们保留以下权利：`,
    list: [
      '根据运营需要调整服务内容和价格（提前7天公告）',
      '暂停、终止部分或全部服务（提前30天公告）',
      '更新本服务条款（更新后继续使用视为接受）',
    ],
    note: '重大变更我们会通过站内通知、邮件或短信等方式告知您。',
  },
  {
    icon: <MessageCircle className="w-6 h-6 text-indigo-600" />,
    title: '七、争议解决',
    content: `如发生争议，解决方式如下：`,
    list: [
      '首先通过友好协商解决',
      '协商不成的，可向我们提交书面投诉',
      '如仍无法解决，可向平台所在地人民法院提起诉讼',
    ],
    note: '本条款的解释和执行适用中华人民共和国法律。',
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-10 h-10" />
            <h1 className="text-3xl sm:text-4xl font-bold">服务条款</h1>
          </div>
          <p className="text-blue-100 text-lg">
            最后更新日期：2025年1月1日
          </p>
          <p className="text-blue-100 mt-2">
            使用职途星服务即表示您已阅读并同意本服务条款。
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        {sections.map((section, index) => (
          <Card key={index} className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                {section.icon}
                <span>{section.title}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-gray-700 leading-relaxed">
              <p className="mb-4">{section.content}</p>
              <ul className="list-disc pl-6 space-y-2">
                {section.list.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
              {section.note && (
                <p className="mt-4 text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                  {section.note}
                </p>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Agreement Section */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-green-50 to-emerald-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <CheckSquare className="w-6 h-6 text-green-600" />
              <span>同意条款</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-gray-700">
            <p className="mb-4">
              当您注册账户或使用职途星服务时，即表示您已阅读、理解并同意：
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>遵守本服务条款的所有规定</li>
              <li>遵守职途星隐私政策</li>
              <li>接受我们可能对条款进行的合理变更</li>
            </ul>
            <p className="mt-4 text-sm text-gray-500">
              如您不同意本条款的任何内容，请立即停止使用本平台服务。
            </p>
          </CardContent>
        </Card>

        {/* Footer Note */}
        <div className="text-center text-sm text-gray-500 py-8">
          <p>
            如有任何疑问，请通过「联系我们」页面与我们沟通。
          </p>
          <p className="mt-2">
            感谢您选择职途星，祝您求职顺利！
          </p>
        </div>
      </div>
    </div>
  );
}
