'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';

const quickQuestions = [
  '我是计算机专业，适合什么岗位？',
  '生成我的职业规划报告',
  '互联网行业薪资水平怎么样？',
  '没有实习经验怎么办？',
  '如何写一份优秀的简历？',
  '国企和私企怎么选？',
  '考研还是找工作？',
  'AI模拟面试（HR岗位）',
  '测算我应聘Java开发的成功率'
];

export default function AssistantPage() {
  const [freeQuota, setFreeQuota] = useState(5);
  const [inputValue, setInputValue] = useState('');
  const [showQuotaModal, setShowQuotaModal] = useState(false);

  const handleQuickQuestion = (question: string) => {
    if (freeQuota <= 0) {
      setShowQuotaModal(true);
      return;
    }
    setInputValue(question);
    // 模拟消耗免费额度
    setFreeQuota(prev => Math.max(0, prev - 1));
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;
    if (freeQuota <= 0) {
      setShowQuotaModal(true);
      return;
    }
    // 模拟消耗免费额度
    setFreeQuota(prev => Math.max(0, prev - 1));
    setInputValue('');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              职途星全行业AI职业规划助手
            </h1>
            <p className="text-gray-600">
              我是你的专属求职搭子，所有信息均来自<span className="font-semibold text-[#165DFF]">全行业真实招聘JD</span>，拒绝空泛鸡汤！
            </p>
          </div>
          <Link
            href="/membership"
            className="flex items-center space-x-2 px-4 py-2 bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow"
          >
            <span className="text-gray-600">本月剩余免费次数：</span>
            <span className="text-lg font-bold text-[#165DFF]">{freeQuota}/5</span>
          </Link>
        </div>

        {/* Quick Questions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            📌 试试这些热门问题
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {quickQuestions.map((question, index) => (
              <Button
                key={index}
                variant="ghost"
                className="justify-start h-auto py-3 px-4 text-left bg-white border border-gray-200 hover:border-[#165DFF] hover:bg-[#165DFF]/5 hover:text-[#165DFF] transition-all duration-300"
                onClick={() => handleQuickQuestion(question)}
              >
                <span className="line-clamp-2 text-sm">{question}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <Card className="border-2 border-gray-200 overflow-hidden">
          <CardContent className="p-0">
            {/* Chat Messages */}
            <div className="h-[600px] bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 bg-[#165DFF] rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-white text-4xl font-bold">AI</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  职途星全行业岗位百科智能体
                </h3>
                <p className="text-gray-600 mb-6">
                  输入你想了解的岗位、专业或求职问题，我会基于真实招聘JD为你解答
                </p>
              </div>
            </div>

            {/* Input Area */}
            <div className="p-4 border-t bg-white">
              <div className="flex gap-3">
                <Input
                  placeholder="请输入你想了解的岗位、专业或求职问题..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  className="flex-1"
                />
                <Button
                  onClick={handleSend}
                  className="bg-[#165DFF] hover:bg-[#165DFF]/90 text-white px-6"
                >
                  <Send className="w-4 h-4 mr-2" />
                  发送
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-4">
          每月免费5次AI服务，开通会员享无限次使用+专属特权
        </p>
      </div>

      {/* Quota Exhausted Modal */}
      {showQuotaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                本月免费次数已用完
              </h3>
              <p className="text-gray-600 mb-6">
                开通会员即可享受无限次AI服务+专属特权，仅需9.9元/月
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/membership" className="flex-1">
                  <Button className="w-full bg-[#FF7D00] hover:bg-[#e67000] text-white">
                    立即开通会员
                  </Button>
                </Link>
                <Link href="/profile/invite" className="flex-1">
                  <Button
                    variant="ghost"
                    className="w-full border border-[#165DFF] text-[#165DFF] hover:bg-[#165DFF]/5"
                    onClick={() => setShowQuotaModal(false)}
                  >
                    邀请好友得免费次数
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
