'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, ArrowLeft, Search, Eye, CheckCircle, XCircle, RefreshCw, CreditCard } from 'lucide-react';

interface Order {
  id: string;
  orderNo: string;
  userPhone: string;
  userName: string;
  planName: string;
  amount: number;
  paymentMethod: string;
  status: 'pending' | 'paid' | 'cancelled' | 'refunded';
  createdAt: string;
  paidAt: string | null;
}

const statusConfig = {
  pending: { label: '待支付', className: 'bg-yellow-100 text-yellow-700' },
  paid: { label: '已支付', className: 'bg-green-100 text-green-700' },
  cancelled: { label: '已取消', className: 'bg-gray-100 text-gray-700' },
  refunded: { label: '已退款', className: 'bg-red-100 text-red-700' }
};

export default function AdminOrdersPage() {
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated, statusFilter, page]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const res = await fetch(`/api/admin/orders?${params}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.data.orders);
        setTotalPages(data.data.totalPages);
      }
    } catch (error) {
      console.error('获取订单失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, status: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        fetchOrders();
        setShowDetailDialog(false);
      }
    } catch (error) {
      console.error('更新订单失败:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredOrders = orders.filter(o =>
    o.orderNo.includes(searchKeyword) ||
    o.userPhone.includes(searchKeyword) ||
    o.userName.includes(searchKeyword)
  );

  const totalAmount = orders
    .filter(o => o.status === 'paid')
    .reduce((sum, o) => sum + o.amount, 0);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p>请先登录</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">订单管理</h1>
          </div>
          <Button variant="outline" onClick={fetchOrders}>
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="text-center py-4">
              <p className="text-2xl font-bold text-blue-600">{orders.length}</p>
              <p className="text-sm text-blue-600">本页订单</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="text-center py-4">
              <p className="text-2xl font-bold text-green-600">
                ¥{totalAmount.toFixed(2)}
              </p>
              <p className="text-sm text-green-600">本页收入</p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="text-center py-4">
              <p className="text-2xl font-bold text-yellow-600">
                {orders.filter(o => o.status === 'pending').length}
              </p>
              <p className="text-sm text-yellow-600">待支付</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="text-center py-4">
              <p className="text-2xl font-bold text-orange-600">
                {orders.filter(o => o.status === 'paid').length}
              </p>
              <p className="text-sm text-orange-600">已支付</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="text-center py-4">
              <p className="text-2xl font-bold text-gray-600">{totalPages}</p>
              <p className="text-sm text-gray-600">总页数</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="搜索订单号/手机号/用户名..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <select
                className="px-4 py-2 border rounded-lg"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">全部状态</option>
                <option value="pending">待支付</option>
                <option value="paid">已支付</option>
                <option value="cancelled">已取消</option>
                <option value="refunded">已退款</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">订单信息</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">用户</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">套餐</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">金额</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">状态</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">时间</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-mono">{order.orderNo}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div>{order.userName}</div>
                          <div className="text-gray-500">{order.userPhone}</div>
                        </td>
                        <td className="px-4 py-3 text-sm">{order.planName}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-[#165DFF]">
                          ¥{order.amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={statusConfig[order.status].className}>
                            {statusConfig[order.status].label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          <div>{new Date(order.createdAt).toLocaleDateString()}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowDetailDialog(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              上一页
            </Button>
            <span className="px-4 py-2 text-gray-600">
              第 {page} / {totalPages} 页
            </span>
            <Button
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              下一页
            </Button>
          </div>
        )}
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>订单详情</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">订单号</p>
                  <p className="font-mono">{selectedOrder.orderNo}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">订单状态</p>
                  <Badge className={statusConfig[selectedOrder.status].className}>
                    {statusConfig[selectedOrder.status].label}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">用户</p>
                  <p>{selectedOrder.userName}</p>
                  <p className="text-sm text-gray-500">{selectedOrder.userPhone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">套餐</p>
                  <p>{selectedOrder.planName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">金额</p>
                  <p className="text-xl font-bold text-[#165DFF]">¥{selectedOrder.amount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">支付方式</p>
                  <p>{selectedOrder.paymentMethod === 'wechat' ? '微信支付' : '支付宝'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">下单时间</p>
                  <p>{new Date(selectedOrder.createdAt).toLocaleString()}</p>
                </div>
                {selectedOrder.paidAt && (
                  <div>
                    <p className="text-sm text-gray-500">支付时间</p>
                    <p>{new Date(selectedOrder.paidAt).toLocaleString()}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              {selectedOrder.status === 'pending' && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'paid')}
                    disabled={actionLoading}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    标记已支付
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 text-red-600"
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'cancelled')}
                    disabled={actionLoading}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    取消订单
                  </Button>
                </div>
              )}
              {selectedOrder.status === 'paid' && (
                <Button
                  variant="outline"
                  className="w-full text-red-600"
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'refunded')}
                  disabled={actionLoading}
                >
                  退款
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
