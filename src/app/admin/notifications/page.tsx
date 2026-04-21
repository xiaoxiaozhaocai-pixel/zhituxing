'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Bell, Send, Users, CheckCircle } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  content: string;
  type: 'system' | 'activity' | 'member';
  sentAt: string;
  recipients: string;
}

type NotificationType = 'system' | 'activity' | 'member';

export default function AdminNotificationsPage() {
  const { isAuthenticated } = useAuth();
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: '新功能上线通知',
      content: '考研决策智能体已上线，欢迎体验！',
      type: 'system',
      sentAt: '2024-01-15 10:00:00',
      recipients: '全部用户'
    },
    {
      id: '2',
      title: '会员专属活动',
      content: '新年特惠，月卡会员买一送一！',
      type: 'member',
      sentAt: '2024-01-10 09:00:00',
      recipients: '会员用户'
    }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'system' as 'system' | 'activity' | 'member',
    recipients: 'all'
  });

  const handleSend = async () => {
    if (!formData.title || !formData.content) {
      alert('请填写完整信息');
      return;
    }

    setIsSubmitting(true);
    try {
      // 实际应该调用API发送通知
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newNotification: Notification = {
        id: Date.now().toString(),
        title: formData.title,
        content: formData.content,
        type: formData.type,
        sentAt: new Date().toLocaleString(),
        recipients: formData.recipients === 'all' ? '全部用户' : 
                   formData.recipients === 'members' ? '会员用户' : '指定用户'
      };
      
      setNotifications([newNotification, ...notifications]);
      setShowSendDialog(false);
      setFormData({ title: '', content: '', type: 'system', recipients: 'all' });
    } catch (error) {
      console.error('发送失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p>请先登录</p>
      </div>
    );
  }

  const typeColors = {
    system: 'bg-blue-100 text-blue-700',
    activity: 'bg-green-100 text-green-700',
    member: 'bg-orange-100 text-orange-700'
  };

  const typeLabels = {
    system: '系统通知',
    activity: '活动通知',
    member: '会员通知'
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">消息通知</h1>
          </div>
          <Button className="bg-[#165DFF]" onClick={() => setShowSendDialog(true)}>
            <Send className="w-4 h-4 mr-2" />
            发送通知
          </Button>
        </div>

        {/* Notification History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              发送记录
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {notifications.map((notification) => (
                <div key={notification.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-gray-900">{notification.title}</h3>
                      <Badge className={typeColors[notification.type]}>
                        {typeLabels[notification.type]}
                      </Badge>
                    </div>
                    <span className="text-sm text-gray-500">{notification.sentAt}</span>
                  </div>
                  <p className="text-gray-600 mb-2">{notification.content}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Users className="w-4 h-4" />
                    {notification.recipients}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {notifications.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            暂无发送记录
          </div>
        )}
      </div>

      {/* Send Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>发送通知</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">通知标题</label>
              <Input 
                placeholder="请输入通知标题"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">通知类型</label>
              <select 
                className="w-full px-3 py-2 border rounded-lg"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as NotificationType })}
              >
                <option value="system">系统通知</option>
                <option value="activity">活动通知</option>
                <option value="member">会员通知</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">发送对象</label>
              <select 
                className="w-full px-3 py-2 border rounded-lg"
                value={formData.recipients}
                onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
              >
                <option value="all">全部用户</option>
                <option value="members">会员用户</option>
                <option value="custom">指定用户</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">通知内容</label>
              <Textarea 
                placeholder="请输入通知内容"
                rows={4}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>取消</Button>
            <Button className="bg-[#165DFF]" onClick={handleSend} disabled={isSubmitting}>
              {isSubmitting ? '发送中...' : '确认发送'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
