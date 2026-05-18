import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '服务条款',
  description: '职途星服务条款，了解使用职途星平台服务的相关条款和条件。',
  alternates: { canonical: 'https://432b6b32-abdf-4fba-9528-738980f50a36.dev.coze.site/terms' },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">服务条款</h1>
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-6 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">一、服务说明</h2>
            <p>职途星是一个基于AI技术的职业规划与求职辅助平台，为用户提供AI模拟面试、岗位匹配、能力测评、职业规划等服务。使用本平台服务即表示您同意遵守以下条款。</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">二、用户账户</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>您需提供真实、准确的信息完成注册</li>
              <li>您有责任保护账户安全，不向他人透露密码</li>
              <li>账户下发生的所有活动由您本人负责</li>
              <li>我们有权对违规账户进行暂停或封禁处理</li>
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">三、会员服务</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>会员服务为付费虚拟服务，购买后不支持退款</li>
              <li>会员权益在有效期内享受，到期后自动失效</li>
              <li>我们保留调整会员价格和权益的权利，已购会员不受影响</li>
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">四、使用规范</h2>
            <p>您在使用本平台时，不得从事以下行为：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>发布违法、虚假、有害信息</li>
              <li>利用技术手段干扰平台正常运营</li>
              <li>批量爬取、盗用平台数据</li>
              <li>冒充他人或侵犯他人权益</li>
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">五、知识产权</h2>
            <p>职途星平台的所有内容（包括但不限于文字、图片、AI模型、算法、界面设计等）均属于职途星所有或经授权使用。未经许可，不得复制、传播或用于商业用途。</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">六、免责声明</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>AI生成的职业规划和建议仅供参考，不构成职业决策依据</li>
              <li>岗位数据来源于公开招聘信息，我们不对数据准确性负责</li>
              <li>因不可抗力导致的服务中断，我们不承担责任</li>
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">七、条款修改</h2>
            <p>我们保留随时修改本条款的权利。修改后的条款将在平台公布，继续使用服务即视为接受修改后的条款。</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">八、争议解决</h2>
            <p>如因使用本平台发生争议，双方应友好协商解决。协商不成的，可向职途星所在地人民法院提起诉讼。</p>
          </section>
        </div>
      </div>
    </div>
  );
}
