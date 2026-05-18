import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '隐私政策',
  description: '职途星隐私政策，了解我们如何收集、使用和保护您的个人信息。',
  alternates: { canonical: 'https://432b6b32-abdf-4fba-9528-738980f50a36.dev.coze.site/privacy' },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">隐私政策</h1>
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-6 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">一、信息收集</h2>
            <p>我们收集您在使用职途星服务时主动提供的信息，包括但不限于：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>注册信息：邮箱地址、手机号码</li>
              <li>个人资料：昵称、头像、学校、专业、年级</li>
              <li>使用数据：职业规划记录、测评结果、面试记录</li>
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">二、信息使用</h2>
            <p>我们收集的信息仅用于以下目的：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>提供和维护职途星的服务功能</li>
              <li>个性化和改善您的使用体验</li>
              <li>发送与服务相关的通知（不包含营销信息）</li>
              <li>安全防护和欺诈预防</li>
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">三、信息保护</h2>
            <p>我们采用行业标准的加密技术和安全措施保护您的个人信息，包括数据传输加密（HTTPS/TLS）、数据库加密存储、严格的访问控制等。</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">四、Cookie使用</h2>
            <p>我们使用必要的Cookie来维持您的登录状态和会话信息，不使用第三方追踪Cookie。您可以在浏览器设置中管理Cookie偏好。</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">五、用户权利</h2>
            <p>您有权访问、更正、删除您的个人信息，也可以随时注销账户。如需行使这些权利，请通过页面底部的联系方式与我们取得联系。</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">六、政策更新</h2>
            <p>我们可能会不时更新本隐私政策。重大变更时，我们会通过应用内通知或邮件告知您。继续使用我们的服务即表示您接受更新后的政策。</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">七、联系我们</h2>
            <p>如有任何关于隐私政策的问题，请通过以下方式联系我们：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>微信公众号：职途星</li>
              <li>客服微信：zhituxing_service</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
