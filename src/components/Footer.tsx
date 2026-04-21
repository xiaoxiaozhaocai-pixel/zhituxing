import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo Section */}
          <div className="md:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-[#165DFF] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">职</span>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">职途星</div>
                <div className="text-xs text-gray-500">你的AI职业规划助手</div>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              基于全行业真实招聘JD，为大学生提供一站式求职服务
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">快速链接</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/career-planning" className="text-sm text-gray-600 hover:text-[#722ED1]">
                  AI职业规划
                </Link>
              </li>
              <li>
                <Link href="/jobs" className="text-sm text-gray-600 hover:text-[#165DFF]">
                  全行业岗位百科
                </Link>
              </li>
              <li>
                <Link href="/assistant" className="text-sm text-gray-600 hover:text-[#165DFF]">
                  AI职业助手
                </Link>
              </li>
              <li>
                <Link href="/membership" className="text-sm text-gray-600 hover:text-[#FF7D00]">
                  会员中心
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">学习资源</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/resources" className="text-sm text-gray-600 hover:text-[#165DFF]">
                  求职干货
                </Link>
              </li>
              <li>
                <Link href="/guide" className="text-sm text-gray-600 hover:text-[#165DFF]">
                  使用流程
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-sm text-gray-600 hover:text-[#165DFF]">
                  常见问题
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-gray-600 hover:text-[#165DFF]">
                  联系我们
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">联系我们</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>客服微信：zhituxing_kefu</li>
              <li>商务合作邮箱：business@zhituxing.com</li>
              <li>项目地址：桂林电子科技大学</li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-gray-600">
              ©2026 职途星——你的AI职业规划助手
            </p>
            <div className="flex items-center space-x-4 text-sm">
              <Link href="/privacy" className="text-gray-600 hover:text-[#165DFF]">
                隐私政策
              </Link>
              <span className="text-gray-400">|</span>
              <Link href="/terms" className="text-gray-600 hover:text-[#165DFF]">
                用户协议
              </Link>
              <span className="text-gray-400">|</span>
              <Link href="/disclaimer" className="text-gray-600 hover:text-[#165DFF]">
                免责声明
              </Link>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600">营业执照</span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600">ICP备案号：桂ICP备XXXXXXXX号</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4 text-center">
            严格遵循《个人信息保护法》《数据安全法》，用户数据全流程加密存储。AI生成内容仅供参考，不构成求职决策建议。
          </p>
        </div>
      </div>
    </footer>
  );
}
