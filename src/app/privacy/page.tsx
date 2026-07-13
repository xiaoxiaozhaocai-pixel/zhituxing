import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Eye, Lock, Cookie, ExternalLink, UserCircle, Mail, Fingerprint, Database } from 'lucide-react';
import BiometricConsentSettings from '@/components/BiometricConsentSettings';
import DataContributionToggle from '@/components/DataContributionToggle';

export const metadata: Metadata = {
  title: '隐私政策 - 职途星',
  description: '职途星隐私政策，了解我们如何收集、使用和保护您的个人信息，保障您的数据安全与隐私权益。',
};

const sections = [
  {
    icon: <Eye className="w-6 h-6 text-blue-600" />,
    title: '一、信息收集',
    content: `我们收集您在使用职途星服务时主动提供的信息，包括但不限于：`,
    list: [
      '注册信息：手机号码、邮箱地址（可选）',
      '个人资料：昵称、头像、学校、专业、年级、求职意向',
      '使用数据：职业规划记录、测评结果、面试记录、岗位匹配历史',
      '设备信息：浏览器类型、操作系统、设备标识（用于安全防护）',
    ],
  },
  {
    icon: <Shield className="w-6 h-6 text-green-600" />,
    title: '二、信息使用',
    content: `我们收集的信息仅用于以下目的：`,
    list: [
      '提供和维护职途星的AI职业规划、模拟面试、能力测评等核心服务功能',
      '个性化和改善您的使用体验，提供精准的岗位推荐和学习建议',
      '发送与服务相关的通知（如测评完成提醒、会员到期提醒）',
      '安全防护、欺诈预防和违规行为检测',
      '模型优化：在您另行授权后，将脱敏、聚合后的使用数据用于训练和优化AI模型，提升小职的回答质量和匹配精准度。此用途独立于个性化推荐，不影响您的基础服务体验。您可随时在下方"数据贡献设置"中开启或关闭此授权',
      '匿名化数据分析，用于产品优化和服务改进',
    ],
  },
  {
    icon: <Lock className="w-6 h-6 text-blue-600" />,
    title: '三、数据处理与模型训练',
    content: `我们采用行业标准的加密技术和安全措施保护您的个人信息。对于您授权用于模型训练的数据，我们遵循以下原则：`,
    list: [
      '数据传输加密：全站HTTPS/TLS加密传输',
      '数据库加密存储：敏感信息采用AES-256加密',
      '访问控制：严格的权限管理和身份验证',
      '安全审计：定期进行安全漏洞扫描和渗透测试',
      '数据备份：多地冗余备份，确保数据不丢失',
      '数据脱敏：所有用于模型训练的数据均经过脱敏处理，移除个人标识信息（如姓名、手机号、邮箱等）',
      '聚合训练：仅使用聚合后的统计特征进行模型训练，不涉及个人原始数据或对话内容',
      '训练隔离：训练数据集与生产运行数据物理隔离，杜绝数据回溯到个人用户',
      '效果透明：模型优化提升的是服务整体质量，不改变对您个人数据的处理方式',
    ],
  },
  {
    icon: <Cookie className="w-6 h-6 text-orange-600" />,
    title: '四、Cookie政策',
    content: `我们使用Cookie和类似技术来：`,
    list: [
      '维持您的登录状态和会话信息（必要Cookie）',
      '记住您的偏好设置（如主题、语言）',
      '分析网站使用情况，优化用户体验（分析Cookie）',
    ],
    note: '您可以在浏览器设置中管理Cookie偏好。禁用必要Cookie可能影响部分功能使用。',
  },
  {
    icon: <ExternalLink className="w-6 h-6 text-cyan-600" />,
    title: '五、第三方服务',
    content: `我们使用以下第三方服务来提供功能：`,
    list: [
      'Coze AI平台：提供AI对话、模拟面试等智能服务',
      'Supabase：提供数据存储和用户认证服务',
      '微信/QQ分享SDK：社交分享功能',
    ],
    note: '这些服务商均有严格的数据保护协议，不会将您的数据用于其他目的。',
  },
  {
    icon: <UserCircle className="w-6 h-6 text-blue-600" />,
    title: '六、用户权利',
    content: `您对个人信息享有以下权利：`,
    list: [
      '访问权：随时查看您的个人资料和使用记录',
      '更正权：修改和更新您的个人信息',
      '删除权：申请删除您的账户和相关数据',
      '导出权：下载您的数据副本（JSON格式）',
      '撤回同意：撤回对信息处理的同意',
    ],
    note: '如需行使以上权利，请通过页面底部的联系方式联系我们。',
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-600 to-blue-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-10 h-10" />
            <h1 className="text-3xl sm:text-4xl font-bold">隐私政策</h1>
          </div>
          <p className="text-blue-100 text-lg">
            最后更新日期：2026年7月13日
          </p>
          <p className="text-blue-100 mt-2">
            我们重视并保护您的隐私。本政策说明我们如何收集、使用和保护您的个人信息。
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

        {/* Contact Section */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <Mail className="w-6 h-6 text-blue-600" />
              <span>七、联系我们</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-gray-700">
            <p className="mb-4">
              如果您对本隐私政策有任何疑问、意见或需要行使您的用户权利，请通过以下方式联系我们：
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <p className="font-medium text-gray-900">邮箱</p>
                <p className="text-blue-600">privacy@zhituxing.com</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <p className="font-medium text-gray-900">微信公众号</p>
                <p className="text-gray-600">职途星</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              我们将在收到您的请求后15个工作日内予以回复。
            </p>
          </CardContent>
        </Card>

        {/* 八、生物识别信息管理 */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <Fingerprint className="w-6 h-6 text-blue-600" />
              <span>八、生物识别信息管理</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">
              AI模拟面试功能涉及对语音、面部表情等生物识别信息的处理。根据《个人信息保护法》第29条，
              您拥有单独的知情权和决定权，可随时查看授权状态或撤回同意。
            </p>
            <BiometricConsentSettings />
          </CardContent>
        </Card>

        {/* 九、数据贡献设置 */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <Database className="w-6 h-6 text-blue-600" />
              <span>九、数据贡献设置</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">
              为持续改进小职的AI能力，我们邀请您贡献脱敏后的匿名使用数据用于模型训练。
              此功能与个性化推荐完全独立，关闭不影响您的基础服务体验。
            </p>
            <DataContributionToggle />
          </CardContent>
        </Card>

        {/* Footer Note */}
        <div className="text-center text-sm text-gray-500 py-8">
          <p>
            本隐私政策适用于职途星（zhituxing.com）提供的所有服务。
            如本政策发生变更，我们将在网站显著位置公告。
          </p>
        </div>
      </div>
    </div>
  );
}
