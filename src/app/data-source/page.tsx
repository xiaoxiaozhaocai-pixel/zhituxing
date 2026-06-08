'use client';

import { useState, useEffect } from 'react';
import { Shield, CheckCircle2, Mail, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function DataSourcePage() {
  const [_mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const platforms = [
    { name: '国聘网', url: 'https://www.iguopin.com' },
    { name: '国家24365大学生就业服务平台', url: 'https://www.ncss.cn' },
    { name: '中国公共招聘网', url: 'http://job.mohrss.gov.cn' },
    { name: '广西人才网', url: 'https://www.gxrc.com' },
  ];

  const commitments = [
    '未从任何商业招聘平台爬取数据',
    '未绕过任何技术保护措施获取信息',
    '所有岗位信息均标注来源平台，不冒充任何官方渠道',
    '如招聘方或来源平台要求，我们将及时下架相关信息',
    '岗位信息仅供参考，具体以原始发布平台为准',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* 页面标题 */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-6">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">数据来源声明</h1>
          <p className="text-gray-500">职途星平台关于岗位信息数据来源的公开声明</p>
        </div>

        {/* 主要内容卡片 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-4 border-b border-gray-100">
            岗位信息数据来源
          </h2>
          
          {/* 来源平台 */}
          <div className="mb-8">
            <p className="text-gray-700 leading-relaxed mb-4">
              职途星平台所展示的岗位信息，均来源于以下政府及公益性公开招聘平台：
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {platforms.map((platform) => (
                <a
                  key={platform.name}
                  href={platform.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-3 bg-blue-50 rounded-lg text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium">{platform.name}</span>
                </a>
              ))}
            </div>
            <p className="text-gray-700 leading-relaxed">
              上述平台所发布的招聘信息属于面向社会公开的公共就业服务信息。
            </p>
          </div>

          {/* 数据采集说明 */}
          <div className="mb-8 p-6 bg-gray-50 rounded-xl">
            <p className="text-gray-700 leading-relaxed">
              职途星通过合法方式采集并整理上述公开信息，旨在扩大就业信息传播范围，帮助更多大学生获取岗位资源，与原平台的公共服务目的一致。
            </p>
          </div>

          {/* 承诺列表 */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              我们的承诺
            </h3>
            <ul className="space-y-3">
              {commitments.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-medium mt-0.5">
                    ✓
                  </span>
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 联系方式 */}
          <div className="pt-6 border-t border-gray-100">
            <div className="flex items-center gap-2 text-gray-600">
              <Mail className="w-5 h-5" />
              <span>如对数据使用有任何疑问，请联系：</span>
              <a 
                href="mailto:business@zhituxing.com" 
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                business@zhituxing.com
              </a>
            </div>
          </div>
        </div>

        {/* 相关链接 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">相关页面</h3>
          <div className="flex flex-wrap gap-4">
            <Link href="/about" className="text-blue-600 hover:text-blue-700 text-sm">
              关于我们
            </Link>
            <Link href="/privacy" className="text-blue-600 hover:text-blue-700 text-sm">
              隐私政策
            </Link>
            <Link href="/terms" className="text-blue-600 hover:text-blue-700 text-sm">
              用户协议
            </Link>
            <Link href="/contact" className="text-blue-600 hover:text-blue-700 text-sm">
              联系我们
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
