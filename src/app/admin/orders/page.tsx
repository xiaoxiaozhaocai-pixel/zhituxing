'use client';

/**
 * /admin/orders - 会员订单审核工作台
 *
 * 数据：GET /api/admin/orders ?status=
 * 通过：POST /api/admin/orders/[id]/approve { admin_note? }
 * 拒绝：POST /api/admin/orders/[id]/reject  { admin_note }
 * 截图签 URL：GET /api/admin/orders?sign={path}
 *
 * 自动刷新 30s；操作 toast；点截图弹 lightbox。
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Loader2,
  ArrowLeft,
  CheckCircle,
  XCircle,
  RefreshCw,
  Wallet,
  Clock,
  TrendingUp,
  ImageIcon,
  AlertCircle,
} from 'lucide-react';

interface PendingOrder {
  id: string;
  user_id: string;
  user_email: string | null;
  plan: 'monthly' | 'semester' | 'yearly' | 'lifetime' | string;
  amount: number;
  payment_method: 'wechat' | 'alipay' | string;
  payment_screenshot_url: string;
  user_note: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
}

interface Stats {
  pending_count: number;
  today_approved: number;
  today_rejected: number;
  total_revenue: number;
}

const planLabel: Record<string, { label: string; className: string }> = {
  monthly: { label: '月度会员', className: 'bg-blue-100 text-blue-700' },
  semester: { label: '学期会员', className: 'bg-blue-100 text-blue-700' },
  yearly: { label: '年度会员', className: 'bg-orange-100 text-orange-700' },
  lifetime: { label: '永久会员', className: 'bg-pink-100 text-pink-700' },
};

const methodLabel: Record<string, { label: string; className: string }> = {
  wechat: { label: '微信', className: 'bg-green-50 text-green-700 border-green-200' },
  alipay: { label: '支付宝', className: 'bg-sky-50 text-sky-700 border-sky-200' },
};

const statusLabel: Record<string, { label: string; className: string }> = {
  pending: { label: '待审核', className: 'bg-yellow-100 text-yellow-700' },
  approved: { label: '已通过', className: 'bg-green-100 text-green-700' },
  rejected: { label: '已拒绝', className: 'bg-red-100 text-red-700' },
};

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [stats, setStats] = useState<Stats>({
    pending_count: 0,
    today_approved: 0,
    today_rejected: 0,
    total_revenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [refreshing, setRefreshing] = useState(false);

  // dialogs
  const [approveOrder, setApproveOrder] = useState<PendingOrder | null>(null);
  const [approveNote, setApproveNote] = useState('');
  const [rejectOrder, setRejectOrder] = useState<PendingOrder | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // lightbox
  const [lightboxOrder, setLightboxOrder] = useState<PendingOrder | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string>('');
  const [lightboxLoading, setLightboxLoading] = useState(false);

  // 缩略图 URL 缓存 path → signed url
  const [thumbCache, setThumbCache] = useState<Record<string, string>>({});

  const fetchOrders = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch(`/api/admin/orders?status=${filter}`, { cache: 'no-store' });
      if (res.status === 403 || res.status === 401) {
        toast.error('无 admin 权限');
        return;
      }
      const json = await res.json();
      if (json.code === 200) {
        const list = (json.data?.orders || []) as PendingOrder[];
        setOrders(list);
        setStats(json.data?.stats || stats);

        // 主动为新出现的 path 预签 URL
        const toSign = list
          .map((o) => o.payment_screenshot_url)
          .filter((p) => p && !thumbCache[p]);
        if (toSign.length > 0) {
          const newCache: Record<string, string> = {};
          await Promise.all(
            toSign.map(async (p) => {
              try {
                const r = await fetch(`/api/admin/orders?sign=${encodeURIComponent(p)}`, {
                  cache: 'no-store',
                });
                const j = await r.json();
                if (j.code === 200 && j.data?.signed_url) {
                  newCache[p] = j.data.signed_url;
                }
              } catch {
                // ignore single failure
              }
            }),
          );
          if (Object.keys(newCache).length > 0) {
            setThumbCache((prev) => ({ ...prev, ...newCache }));
          }
        }
      } else {
        toast.error(json.message || '加载失败');
      }
    } catch (e) {
      console.error('[admin orders] fetch err', e);
      toast.error('网络错误');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // 进页面 + filter 变化时拉一次
  useEffect(() => {
    setLoading(true);
    fetchOrders();
  }, [fetchOrders]);

  // 30s 自动刷新
  useEffect(() => {
    const id = setInterval(() => {
      fetchOrders();
    }, 30_000);
    return () => clearInterval(id);
  }, [fetchOrders]);

  async function openLightbox(order: PendingOrder) {
    setLightboxOrder(order);
    setLightboxUrl('');
    if (thumbCache[order.payment_screenshot_url]) {
      setLightboxUrl(thumbCache[order.payment_screenshot_url]!)!;
      return;
    }
    setLightboxLoading(true);
    try {
      const r = await fetch(
        `/api/admin/orders?sign=${encodeURIComponent(order.payment_screenshot_url)}`,
        { cache: 'no-store' },
      );
      const j = await r.json();
      if (j.code === 200 && j.data?.signed_url) {
        setLightboxUrl(j.data.signed_url);
        setThumbCache((prev) => ({ ...prev, [order.payment_screenshot_url]: j.data.signed_url }));
      } else {
        toast.error('截图加载失败');
      }
    } catch {
      toast.error('截图加载失败');
    } finally {
      setLightboxLoading(false);
    }
  }

  async function handleApprove() {
    if (!approveOrder) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${approveOrder.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_note: approveNote || null }),
      });
      const json = await res.json();
      if (json.code === 200) {
        toast.success('已为该用户开通会员 ✓');
        setApproveOrder(null);
        setApproveNote('');
        await fetchOrders(true);
      } else {
        toast.error(json.message || '操作失败');
      }
    } catch {
      toast.error('网络错误');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!rejectOrder) return;
    if (!rejectReason.trim()) {
      toast.error('拒绝原因必填');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${rejectOrder.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_note: rejectReason }),
      });
      const json = await res.json();
      if (json.code === 200) {
        toast.success('已拒绝该订单');
        setRejectOrder(null);
        setRejectReason('');
        await fetchOrders(true);
      } else {
        toast.error(json.message || '操作失败');
      }
    } catch {
      toast.error('网络错误');
    } finally {
      setActionLoading(false);
    }
  }

  function truncateEmail(email: string | null): string {
    if (!email) return '匿名';
    if (email.length <= 22) return email;
    return email.slice(0, 10) + '…' + email.slice(-9);
  }

  const planMeta = (p: string) => planLabel[p] || { label: p, className: 'bg-gray-100 text-gray-700' };
  const methodMeta = (m: string) => methodLabel[m] || { label: m, className: 'bg-gray-50 text-gray-700' };
  const statusMeta = (s: string) => statusLabel[s] || { label: s, className: 'bg-gray-100 text-gray-700' };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="outline" size="icon" aria-label="返回">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">订单审核</h1>
            <Badge variant="outline" className="ml-2">人工审核 · MVP</Badge>
          </div>
          <Button onClick={() => fetchOrders(true)} disabled={refreshing} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-xs text-gray-500">待审核</div>
                <div className="text-2xl font-bold text-gray-900">{stats.pending_count}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-xs text-gray-500">今日通过</div>
                <div className="text-2xl font-bold text-gray-900">{stats.today_approved}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-xs text-gray-500">今日拒绝</div>
                <div className="text-2xl font-bold text-gray-900">{stats.today_rejected}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-xs text-gray-500">累计收入</div>
                <div className="text-2xl font-bold text-gray-900">¥{stats.total_revenue.toFixed(1)}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as StatusFilter)} className="mb-4">
          <TabsList>
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger value="pending" className="gap-2">
              待审核
              {stats.pending_count > 0 && (
                <Badge className="bg-yellow-500 text-white h-5 px-1.5 text-xs">{stats.pending_count}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">已通过</TabsTrigger>
            <TabsTrigger value="rejected">已拒绝</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-gray-500">
              <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              当前筛选下没有订单
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const pm = planMeta(order.plan);
              const mm = methodMeta(order.payment_method);
              const sm = statusMeta(order.status);
              const thumb = thumbCache[order.payment_screenshot_url];
              return (
                <Card key={order.id} className="overflow-hidden">
                  <CardContent className="py-4">
                    <div className="flex flex-wrap items-start gap-4">
                      {/* 缩略图 */}
                      <button
                        type="button"
                        onClick={() => openLightbox(order)}
                        className="w-20 h-20 rounded-lg overflow-hidden border bg-gray-100 flex items-center justify-center shrink-0 hover:ring-2 hover:ring-blue-400 transition"
                        aria-label="查看截图"
                      >
                        {thumb ? (
                          <Image src={thumb} alt="付款截图" fill className="object-cover" unoptimized />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-gray-400" />
                        )}
                      </button>

                      {/* 主体信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span
                            title={order.user_email || ''}
                            className="font-medium text-gray-900 truncate max-w-[260px]"
                          >
                            {truncateEmail(order.user_email)}
                          </span>
                          <Badge className={pm.className}>{pm.label}</Badge>
                          <Badge variant="outline" className={mm.className}>{mm.label}</Badge>
                          <Badge className={sm.className}>{sm.label}</Badge>
                        </div>
                        <div className="text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
                          <span className="font-bold text-blue-600">¥{Number(order.amount).toFixed(1)}</span>
                          <span>提交：{new Date(order.created_at).toLocaleString('zh-CN', { hour12: false })}</span>
                          {order.approved_at && (
                            <span>处理：{new Date(order.approved_at).toLocaleString('zh-CN', { hour12: false })}</span>
                          )}
                        </div>
                        {order.user_note && (
                          <div className="text-xs text-gray-500 mt-1 break-all">用户备注：{order.user_note}</div>
                        )}
                        {order.admin_note && (
                          <div className="text-xs text-orange-600 mt-1 break-all">
                            <AlertCircle className="inline w-3 h-3 mr-1" />
                            管理员备注：{order.admin_note}
                          </div>
                        )}
                      </div>

                      {/* 操作 */}
                      {order.status === 'pending' && (
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            onClick={() => {
                              setApproveOrder(order);
                              setApproveNote('');
                            }}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            通过
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setRejectOrder(order);
                              setRejectReason('');
                            }}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            拒绝
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 通过 Dialog */}
      <Dialog open={!!approveOrder} onOpenChange={(v) => !v && setApproveOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认开通会员</DialogTitle>
            <DialogDescription>
              {approveOrder && (
                <>
                  确定为 <span className="font-medium text-gray-900">{approveOrder.user_email || '匿名用户'}</span> 开通{' '}
                  <span className="font-medium text-blue-600">{planMeta(approveOrder.plan).label}</span>？
                  <br />
                  金额：<span className="font-bold">¥{Number(approveOrder.amount).toFixed(1)}</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">备注（可选）</label>
            <Textarea
              value={approveNote}
              onChange={(e) => setApproveNote(e.target.value)}
              placeholder="例如：手动核对到账"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOrder(null)} disabled={actionLoading}>
              取消
            </Button>
            <Button
              onClick={handleApprove}
              disabled={actionLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {actionLoading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              确认通过
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 拒绝 Dialog */}
      <Dialog open={!!rejectOrder} onOpenChange={(v) => !v && setRejectOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>拒绝订单</DialogTitle>
            <DialogDescription>
              请填写拒绝原因，将展示给用户。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              拒绝原因 <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="例如：截图模糊，无法识别金额"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOrder(null)} disabled={actionLoading}>
              取消
            </Button>
            <Button
              onClick={handleReject}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              确认拒绝
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 截图 Lightbox */}
      <Dialog open={!!lightboxOrder} onOpenChange={(v) => !v && setLightboxOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>付款截图</DialogTitle>
            <DialogDescription>
              {lightboxOrder?.user_email} · ¥{lightboxOrder ? Number(lightboxOrder.amount).toFixed(1) : ''} ·{' '}
              {lightboxOrder && methodMeta(lightboxOrder.payment_method).label}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center min-h-[300px]">
            {lightboxLoading ? (
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            ) : lightboxUrl ? (
              <Image
                src={lightboxUrl}
                alt="付款截图"
                width={800}
                height={1200}
                unoptimized
                className="max-h-[70vh] w-auto object-contain rounded"
              />
            ) : (
              <div className="text-gray-400">截图加载失败</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
