'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Mail, MessageSquare, Building, CheckCircle } from 'lucide-react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    type: '',
    message: ''
  });
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 模拟提交
    setSubmitSuccess(true);
    setTimeout(() => {
      setSubmitSuccess(false);
      setFormData({ name: '', email: '', type: '', message: '' });
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            联系我们
          </h1>
          <p className="text-lg text-gray-600">
            有任何问题或建议？我们随时为你服务
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className="border-2 border-gray-100">
              <CardHeader>
                <CardTitle>发送消息</CardTitle>
                <CardDescription>
                  填写以下表单，我们会在24小时内回复你
                </CardDescription>
              </CardHeader>
              <CardContent>
                {submitSuccess ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      提交成功！
                    </h3>
                    <p className="text-gray-600">
                      我们会在24小时内回复你
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        姓名
                      </label>
                      <Input
                        placeholder="请输入你的姓名"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        邮箱
                      </label>
                      <Input
                        type="email"
                        placeholder="请输入你的邮箱"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        问题类型
                      </label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => setFormData({ ...formData, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="请选择问题类型" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="suggestion">功能建议</SelectItem>
                          <SelectItem value="bug">问题反馈</SelectItem>
                          <SelectItem value="business">商务合作</SelectItem>
                          <SelectItem value="support">售后咨询</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        详细描述
                      </label>
                      <Textarea
                        placeholder="请详细描述你的问题或建议..."
                        rows={5}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-[#165DFF] hover:bg-[#165DFF]/90 text-white py-6 h-auto text-lg"
                    >
                      提交
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <Card className="border-2 border-gray-100">
              <CardHeader>
                <CardTitle>联系方式</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-[#165DFF]/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-5 h-5 text-[#165DFF]" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">客服微信</h4>
                    <p className="text-gray-600">zhituxing_kefu</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-[#165DFF]/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-[#165DFF]" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">商务合作邮箱</h4>
                    <p className="text-gray-600">business@zhituxing.com</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-[#165DFF]/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Building className="w-5 h-5 text-[#165DFF]" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">项目地址</h4>
                    <p className="text-gray-600">桂林电子科技大学</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-[#165DFF]/5 to-[#165DFF]/10 border-[#165DFF]/20">
              <CardContent className="p-6">
                <h4 className="font-semibold text-gray-900 mb-2">
                  💡 快速解决问题
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  查看常见问题页面，可能已经有你想要的答案
                </p>
                <a href="/faq">
                  <Button variant="ghost" className="w-full border border-[#165DFF] text-[#165DFF] hover:bg-[#165DFF]/5">
                    查看常见问题
                  </Button>
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
