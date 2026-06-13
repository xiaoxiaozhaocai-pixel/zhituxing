'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {Bell, Check, Loader2} from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  content: string;
  type: string;
  is_read: boolean;
  is_global: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const res = await fetch('/api/notifications', {
        headers: { 'x-user-id': user.id }
      });
      const data = await res.json();

      if (data.success) {
        setNotifications(data.data.notifications);
        setUnread(data.data.unread);
      }
    } catch (error) {
      console.error('获取通知失败:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated, fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PUT',
        headers: { 'x-user-id': user!.id }
      });
      fetchNotifications();
    } catch (error) {
      console.error('标记已读失败:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: { 'x-user-id': user!.id }
      });
      fetchNotifications();
    } catch (error) {
      console.error('标记全部已读失败:', error);
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      quota: '配额通知',
      invite: '邀请奖励',
      membership: '会员权益',
      system: '系统通知',
      tip: '求职技巧'
    };
    return labels[type] || '通知';
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      quota: 'bg-blue-100 text-blue-700',
      invite: 'bg-orange-100 text-orange-700',
      membership: 'bg-blue-100 text-blue-700',
      system: 'bg-gray-100 text-gray-700',
      tip: 'bg-green-100 text-green-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  const formatTime = (time: string) => {
    const date = new Date(time);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Bell className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 mb-4">请先登录查看通知</p>
          <a
            href="/login"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            登录
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">消息通知</h1>
          {unread > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Check className="w-4 h-4" />
              全部已读
            </button>
          )}
        </div>

        {/* 未读数提示 */}
        {unread > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              <span className="text-blue-700">
                您有 <strong>{unread}</strong> 条未读消息
              </span>
            </div>
            <button
              onClick={markAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              全部标记已读
            </button>
          </div>
        )}

        {/* 通知列表 */}
        {notifications.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-2">暂无通知</p>
            <p className="text-sm text-gray-400">有新消息时会在这里通知你，记得常来看看～</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-lg border ${
                  !notification.is_read
                    ? 'border-blue-300 bg-blue-50/30'
                    : 'border-gray-200'
                } p-4 hover:shadow-sm transition-shadow`}
              >
                <div className="flex items-start gap-3">
                  {/* 类型标签 */}
                  <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(notification.type)}`}>
                    {getTypeLabel(notification.type)}
                  </span>

                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`font-medium ${!notification.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                        {notification.title}
                        {!notification.is_read && (
                          <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full inline-block" />
                        )}
                      </h3>
                      <span className="text-sm text-gray-400 whitespace-nowrap">
                        {formatTime(notification.created_at)}
                      </span>
                    </div>
                    <p className="mt-1 text-gray-600 text-sm">
                      {notification.content}
                    </p>

                    {/* 操作按钮 */}
                    {!notification.is_read && (
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                        >
                          <Check className="w-3 h-3" />
                          标记已读
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
