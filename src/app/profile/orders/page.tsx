'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, ArrowLeft, Clock, CheckCircle, XCircle } from 'lucide-react';

interface UnifiedOrder {
  id: string;
  source: 'pending' | 'approved';
  plan: string;
  amount: number;
  payment_method: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_note?: string | null;
  user_note?: string | null;
  created_at: string;
  approved_at?: string | null;
  expires_at?: string | null;
}

const planLabel: Record<string, string> = {
  monthly: '月度会员',
  semester: '学期会员',
  yearly: '年度会员',
  lifetime: '永久会员',
};

const methodLabel: Record<string, string> = {
  wechat: '微信支付',
  alipay: '支付宝',
};

const statusConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  pending: { label: '审核中', icon: <Clock className="w-4 h-4" />, className: 'bg-yellow-100 text-yellow-700' },
  approved: { label: '已通过', icon: <CheckCircle className="w-4 h-4" />, className: 'bg-green-100 text-green-700' },
  rejected: { label: '已拒绝', icon: <XCircle className="w-4 h-4" />, className: 'bg-red-100 text-red-700' },
};

export default function OrdersPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [orders, setOrders] = useState<UnifiedOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
// eslint-disable-next-line react-hooks/immutability
    if (isAuthenticated) fetchOrders();
  }, [isAuthenticated]);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders', { cache: 'no-store' });
      const data = await res.json();
      if (data.code === 200) setOrders(data.data || []);
    } catch (error) {
      console.error('获取订单失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/profile">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">我的订单</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-16">
              <p className="text-gray-500 mb-4">暂无订单</p>
              <Link href="/membership">
                <Button>查看会员套餐</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const sc = statusConfig[order.status] || statusConfig.pending;
              return (
                <Card key={`${order.source}-${order.id}`}>
                  <CardContent className="py-4 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <div className="font-semibold text-gray-900">
                        {planLabel[order.plan] || order.plan}
                        <span className="ml-3 text-sm text-gray-500">{methodLabel[order.payment_method] || order.payment_method}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        提交：{new Date(order.created_at).toLocaleString('zh-CN')}
                        {order.expires_at && ` · 到期：${new Date(order.expires_at).toLocaleDateString('zh-CN')}`}
                      </div>
                      {order.admin_note && (
                        <div className="text-xs text-red-500 mt-1">备注：{order.admin_note}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-blue-600">¥{order.amount}</span>
                      <Badge className={`flex items-center gap-1 ${sc!.className}`}>
                        {sc!.icon}
                        {sc!.label}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
