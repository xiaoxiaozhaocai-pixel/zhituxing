'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  Mail,
  MessageSquare,
  Phone,
  MapPin,
  Copy,
  Check,
  Clock,
  Send,
  Heart,
  Users,
  FileText,
  ArrowRight
} from 'lucide-react';

const contactMethods = [
  {
    icon: <Phone className="w-6 h-6" />,
    title: '客服微信',
    value: 'zhituxing_kefu',
    description: '添加好友，即时沟通',
    color: 'bg-green-100 text-green-600',
    bgColor: 'hover:bg-green-50'
  },
  {
    icon: <Mail className="w-6 h-6" />,
    title: '商务合作邮箱',
    value: 'business@zhituxing.com',
    description: '24小时内回复',
    color: 'bg-purple-100 text-purple-600',
    bgColor: 'hover:bg-purple-50'
  },
  {
    icon: <MapPin className="w-6 h-6" />,
    title: '项目地址',
    value: '桂林电子科技大学',
    description: '广西桂林市七星区金鸡路1号',
    color: 'bg-blue-100 text-blue-600',
    bgColor: 'hover:bg-blue-50'
  },
  {
    icon: <Clock className="w-6 h-6" />,
    title: '工作时间',
    value: '周一至周五 9:00-18:00',
    description: '节假日除外',
    color: 'bg-orange-100 text-orange-600',
    bgColor: 'hover:bg-orange-50'
  }
];

const feedbackTypes = [
  { value: 'bug', label: '功能问题' },
  { value: 'suggestion', label: '功能建议' },
  { value: 'correction', label: '内容纠错' },
  { value: 'other', label: '其他' }
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    type: '',
    message: ''
  });
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.message.trim()) {
      alert('请填写反馈内容');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        setSubmitSuccess(true);
        setFormData({ name: '', phone: '', type: '', message: '' });
        setTimeout(() => setSubmitSuccess(false), 3000);
      }
    } catch (error) {
      console.error('提交失败:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-16">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-90" />
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            联系我们
          </h1>
          <p className="text-lg text-blue-100">
            有任何问题或建议？我们随时为你服务
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Contact Methods */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {contactMethods.map((method, index) => (
            <Card 
              key={index}
              className={`${method.bgColor} border-2 transition-all duration-200 hover:shadow-md cursor-pointer group`}
              onClick={() => copyToClipboard(method.value, method.title)}
            >
              <CardContent className="p-6 text-center">
                <div className={`w-14 h-14 rounded-2xl ${method.color} flex items-center justify-center mx-auto mb-4 transition-transform group-hover:scale-110`}>
                  {method.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{method.title}</h3>
                <p className="text-sm text-gray-600 mb-2">{method.value}</p>
                <p className="text-xs text-gray-400">{method.description}</p>
                <div className="mt-3 flex items-center justify-center gap-1 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  {copied === method.title ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span className="text-sm">已复制</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span className="text-sm">点击复制</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Feedback Form */}
          <Card className="border-2 border-blue-100">
            <CardContent className="p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                意见反馈
              </h2>
              
              {submitSuccess ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">提交成功！</h3>
                  <p className="text-gray-600">感谢你的反馈，我们会尽快处理</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700 mb-1">
                        姓名（选填）
                      </label>
                      <Input
                        id="contact-name"
                        autoComplete="name"
                        placeholder="你的姓名"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label htmlFor="contact-phone" className="block text-sm font-medium text-gray-700 mb-1">
                        手机号（选填）
                      </label>
                      <Input
                        id="contact-phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="方便我们联系你"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="contact-type" className="block text-sm font-medium text-gray-700 mb-1">
                      反馈类型
                    </label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger id="contact-type" aria-label="反馈类型">
                        <SelectValue placeholder="请选择反馈类型" />
                      </SelectTrigger>
                      <SelectContent>
                        {feedbackTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label htmlFor="contact-message" className="block text-sm font-medium text-gray-700 mb-1">
                      反馈内容 <span className="text-red-500" aria-hidden="true">*</span>
                      <span className="sr-only">必填</span>
                    </label>
                    <Textarea
                      id="contact-message"
                      aria-required="true"
                      placeholder="请详细描述你遇到的问题或建议..."
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="resize-none"
                    />
                  </div>
                  
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 h-12"
                  >
                    {submitting ? (
                      <>提交中...</>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        提交反馈
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Quick Links & Info */}
          <div className="space-y-6">
            {/* WeChat QR Code Placeholder */}
            <Card className="border-2 border-green-100 bg-gradient-to-br from-green-50 to-white">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">扫码添加客服微信</h3>
                <p className="text-sm text-gray-600 mb-4">
                  微信搜索：zhituxing_kefu<br />
                  工作日 9:00-18:00 即时回复
                </p>
                <Button 
                  variant="outline" 
                  className="border-green-300 text-green-600 hover:bg-green-50"
                  onClick={() => copyToClipboard('zhituxing_kefu', 'wechat')}
                >
                  {copied === 'wechat' ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      已复制
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      复制微信号
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card className="bg-white">
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-900 mb-4">你可能想了解</h3>
                <div className="space-y-3">
                  <Link 
                    href="/faq"
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors group"
                  >
                    <span className="text-gray-700 group-hover:text-blue-600">常见问题</span>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                  </Link>
                  <Link 
                    href="/guide"
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors group"
                  >
                    <span className="text-gray-700 group-hover:text-blue-600">使用流程</span>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                  </Link>
                  <Link 
                    href="/membership"
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors group"
                  >
                    <span className="text-gray-700 group-hover:text-blue-600">会员权益</span>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                  </Link>
                  <Link 
                    href="/feedback"
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors group"
                  >
                    <span className="text-gray-700 group-hover:text-blue-600">意见反馈</span>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Thank You */}
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <CardContent className="p-6 text-center">
                <Heart className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  感谢你使用职途星！<br />
                  你的反馈是我们进步的动力
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
