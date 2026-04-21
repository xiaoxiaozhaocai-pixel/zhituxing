'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, ArrowLeft, CreditCard, CheckCircle, Clock, XCircle } from 'lucide-react';

interface Order {
  id: string;
  orderNo: string;
  planName: string;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  createdAt: string;
  paidAt: string | null;
}

export default function OrdersPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated]);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/payment');
      const data = await res.json();
      if (data.success) {
        setOrders(data.data.orders);
      }
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

  const statusConfig = {
    pending: { label: '待支付', icon: <Clock className="w-4 h-4" />, className: 'bg-yellow-100 text-yellow-700' },
    paid: { label: '已支付', icon: <CheckCircle className="w-4 h-4" />, className: 'bg-green-100 text-green-700' },
    cancelled: { label: '已取消', icon: <XCircle className="w-4 h-4" />, className: 'bg-gray-100 text-gray-700' }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/profile">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">我的订单</h1>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-16">
              <CreditCard className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 mb-4">暂无订单记录</p>
              <Link href="/membership">
                <Button className="bg-[#165DFF]">去开通会员</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{order.planName}</p>
                        <p className="text-sm text-gray-500">订单号: {order.orderNo}</p>
                      </div>
                    </div>
                    <Badge className={statusConfig[order.status].className}>
                      {statusConfig[order.status].icon}
                      <span className="ml-1">{statusConfig[order.status].label}</span>
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="text-sm text-gray-500">
                      <p>下单时间: {new Date(order.createdAt).toLocaleString()}</p>
                      {order.paidAt && (
                        <p>支付时间: {new Date(order.paidAt).toLocaleString()}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-[#165DFF]">¥{order.amount.toFixed(2)}</p>
                      {order.status === 'pending' && (
                        <Link href={`/payment/${order.orderNo}`}>
                          <Button size="sm" className="mt-2 bg-green-600 hover:bg-green-700">
                            去支付
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
