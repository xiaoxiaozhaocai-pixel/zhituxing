'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Coins, TrendingUp, TrendingDown, Loader2, Wallet,
  CreditCard, Sparkles, ArrowDownToLine, ArrowUpFromLine, RefreshCw, X, CheckCircle2, AlertCircle,
} from 'lucide-react';

interface Balance {
  credit_balance: number;
  total_recharged: number;
  total_consumed: number;
}

type TxType = 'recharge' | 'consume' | 'refund' | 'bonus';

interface Tx {
  id: string;
  type: TxType;
  amount: number;
  balance_after: number;
  related_candidate_id: string | null;
  related_payment_id: string | null;
  note: string | null;
  created_at: string;
}

interface TxResp {
  items: Tx[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

const PACKAGES = [
  { credits: 100, price: 99, label: '体验包', desc: '适合小型企业试用' },
  { credits: 500, price: 449, label: '标准包', desc: '中型企业月度需求', popular: true },
  { credits: 1000, price: 849, label: '专业包', desc: '高频招聘场景' },
];

interface PayOrder {
  order_id: string;
  aoid: string;
  qr: string;
  pay_type: 'alipay' | 'wechat';
  credits: number;
  price: number;
  expire_seconds: number;
}

const TYPE_TABS: { value: TxType | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'recharge', label: '充值' },
  { value: 'consume', label: '消费' },
  { value: 'refund', label: '退款' },
];

const TYPE_META: Record<TxType, { label: string; cls: string; icon: typeof ArrowDownToLine }> = {
  recharge: { label: '充值', cls: 'text-emerald-600 bg-emerald-50', icon: ArrowDownToLine },
  consume: { label: '消费', cls: 'text-rose-600 bg-rose-50', icon: ArrowUpFromLine },
  refund: { label: '退款', cls: 'text-[#165DFF] bg-[#165DFF]/10', icon: RefreshCw },
  bonus: { label: '奖励', cls: 'text-amber-600 bg-amber-50', icon: ArrowDownToLine },
};

export default function BillingPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<Balance | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filter, setFilter] = useState<TxType | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 支付弹窗状态
  const [payOrder, setPayOrder] = useState<PayOrder | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [payMethod, setPayMethod] = useState<'alipay' | 'wechat'>('alipay');
  const [payStatus, setPayStatus] = useState<'idle' | 'creating' | 'waiting' | 'paid' | 'expired' | 'error'>('idle');
  const [payError, setPayError] = useState<string | null>(null);

  const loadBalance = useCallback(async () => {
    const r = await fetch('/api/employer/credits/balance', { credentials: 'include' });
    if (!r.ok) {
      router.push('/employer/auth/login');
      return;
    }
    const json = await r.json();
    if (!json.ok) {
      router.push('/employer/auth/login');
      return;
    }
    setBalance(json.data);
  }, [router]);

  const loadTxs = useCallback(async (p: number, f: TxType | 'all') => {
    setTxLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(p),
        page_size: String(pageSize),
      });
      if (f !== 'all') params.set('type', f);
      const r = await fetch(`/api/employer/credits/transactions?${params}`, {
        credentials: 'include',
      });
      const json: { ok: boolean; data?: TxResp; message?: string } = await r.json();
      if (!json.ok || !json.data) {
        setError(json.message || '流水加载失败');
        setTxs([]);
        setTotal(0);
        return;
      }
      setTxs(json.data.items);
      setTotal(json.data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
    } finally {
      setTxLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    (async () => {
      await loadBalance();
      await loadTxs(1, 'all');
      setLoading(false);
    })();
  }, [loadBalance, loadTxs]);

  const onChangeFilter = (f: TxType | 'all') => {
    setFilter(f);
    setPage(1);
    loadTxs(1, f);
  };

  const onChangePage = (p: number) => {
    setPage(p);
    loadTxs(p, filter);
  };

  const fmtAmount = (tx: Tx) => {
    const sign = tx.type === 'recharge' || tx.type === 'refund' || tx.type === 'bonus' ? '+' : '-';
    const abs = Math.abs(tx.amount);
    return { sign, abs };
  };

  const fmtTime = (s: string) => {
    const d = new Date(s);
    return d.toLocaleString('zh-CN', { hour12: false });
  };

  // 发起充值订单
  const startPay = async (credits: number) => {
    setPayLoading(true);
    setPayStatus('creating');
    setPayError(null);
    try {
      const r = await fetch('/api/employer/credits/create-order', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credits, pay_type: payMethod }),
      });
      const json = await r.json();
      if (!json.ok) {
        setPayStatus('error');
        setPayError(json.message || '下单失败，请刷新重试');
        return;
      }
      setPayOrder(json.data);
      setPayStatus('waiting');
      // 轮询支付结果
      pollOrder(json.data.order_id);
    } catch (e) {
      setPayStatus('error');
      setPayError(e instanceof Error ? e.message : '网络异常，请重试');
    } finally {
      setPayLoading(false);
    }
  };

  // 轮询订单支付状态（最多 ~3 分钟）
  const pollOrder = async (orderId: string) => {
    for (let i = 0; i < 36; i++) {
      await new Promise((res) => setTimeout(res, 5000));
      try {
        const r = await fetch(`/api/employer/credits/order-status?order_id=${orderId}`, {
          credentials: 'include',
        });
        const json = await r.json();
        if (json.ok && json.data?.status === 'paid') {
          setPayStatus('paid');
          // flat 更新余额与流水
          await loadBalance();
          await loadTxs(1, 'all');
          return;
        }
      } catch {
        /* 轮询失败静默重试 */
      }
    }
    setPayStatus('expired');
  };

  const closePayModal = () => {
    setPayOrder(null);
    setPayStatus('idle');
    setPayError(null);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#165DFF] animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* 账户概览 */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#165DFF] via-[#3D7FFF] to-[#5A9FFF] text-white p-8 shadow-lg shadow-[#165DFF]/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-20 translate-x-20" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#FF7D00]/20 rounded-full blur-3xl translate-y-16 -translate-x-16" />
        <div className="relative">
          <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
            <Wallet className="w-4 h-4" />
            <span>当前可用余额</span>
          </div>
          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-5xl font-bold tabular-nums">{balance?.credit_balance ?? 0}</span>
            <span className="text-xl text-white/80">条</span>
            <span className="ml-2 px-3 py-1 rounded-full bg-[#FF7D00] text-xs font-medium">解锁条数</span>
          </div>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-1.5 text-white/70 text-xs mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>累计充值</span>
              </div>
              <div className="text-2xl font-semibold tabular-nums">{balance?.total_recharged ?? 0}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-1.5 text-white/70 text-xs mb-1">
                <TrendingDown className="w-3.5 h-3.5" />
                <span>累计消耗</span>
              </div>
              <div className="text-2xl font-semibold tabular-nums">{balance?.total_consumed ?? 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 充值套餐 */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-[#165DFF]/10 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#165DFF]" />
              充值套餐
            </h2>
            <p className="text-sm text-slate-500 mt-1">一条额度 = 解锁一名候选人完整画像（90天有效）</p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-blue-50 text-[#165DFF] text-xs font-medium border border-[#165DFF]/20">
            扫码支付
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PACKAGES.map((p) => (
            <div
              key={p.credits}
              className={`relative rounded-xl p-5 border transition hover:-translate-y-0.5 ${
                p.popular
                  ? 'border-[#FF7D00] bg-gradient-to-br from-[#FFF8F0] to-white shadow-md shadow-[#FF7D00]/10'
                  : 'border-slate-200 bg-white hover:border-[#165DFF]/30 hover:shadow-md'
              }`}
            >
              {p.popular && (
                <span className="absolute -top-2.5 left-5 px-2 py-0.5 rounded-full bg-[#FF7D00] text-white text-xs font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  推荐
                </span>
              )}
              <div className="text-sm font-medium text-slate-600">{p.label}</div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-slate-900 tabular-nums">{p.credits}</span>
                <span className="text-sm text-slate-500">条</span>
              </div>
              <div className="mt-1 text-sm text-slate-400">
                ¥{p.price}{' '}
                <span className="text-xs">（约 ¥{(p.price / p.credits).toFixed(2)}/条）</span>
              </div>
              <p className="mt-3 text-xs text-slate-500 leading-relaxed">{p.desc}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setPayMethod('alipay'); startPay(p.credits); }}
                  disabled={payLoading}
                  className="py-2.5 rounded-lg bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] text-white text-sm font-medium hover:from-[#3D7FFF] hover:to-[#5A9BFF] disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  支付宝
                </button>
                <button
                  onClick={() => { setPayMethod('wechat'); startPay(p.credits); }}
                  disabled={payLoading}
                  className="py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-medium hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  微信
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-600">
          <strong className="text-slate-800">支付说明：</strong>
          订单提交后请使用对应 App 扫码完成支付，支付成功后额度自动到账（约数秒）。
          若长时间未到账请联系 <a href="mailto:bd@zhituxing.tech" className="text-[#165DFF] underline">bd@zhituxing.tech</a>
          {' '}提供订单号核对。
        </div>
      </div>

      {/* 支付弹窗 */}
      {payStatus !== 'idle' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm relative">
            <button
              onClick={closePayModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>

            {payStatus === 'creating' && (
              <div className="py-10 flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 text-[#165DFF] animate-spin" />
                <p className="text-slate-600 text-sm">正在发起支付…</p>
              </div>
            )}

            {payStatus === 'waiting' && payOrder && (
              <div className="text-center">
                <h3 className="text-lg font-semibold text-slate-900 mb-1">
                  {payMethod === 'alipay' ? '支付宝' : '微信'}扫码支付
                </h3>
                <p className="text-sm text-slate-500 mb-4">
                  充值 {payOrder.credits} 条 · 应付 <span className="font-semibold text-slate-800">¥{payOrder.price}</span>
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={payOrder.qr} alt="支付二维码" className="w-56 h-56 mx-auto rounded-xl border border-slate-200" />
                <p className="mt-4 text-xs text-slate-500">
                  请使用{payMethod === 'alipay' ? '支付宝' : '微信'}扫码支付，完成后自动到账
                </p>
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-[#165DFF]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  等待支付结果…
                </div>
              </div>
            )}

            {payStatus === 'paid' && (
              <div className="py-10 text-center">
                <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-slate-900 mb-1">支付成功</h3>
                <p className="text-sm text-slate-500 mb-6">额度已到账，可在上方余额查看</p>
                <button
                  onClick={() => { closePayModal(); }}
                  className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] text-white text-sm font-medium"
                >
                  完成
                </button>
              </div>
            )}

            {payStatus === 'expired' && (
              <div className="py-10 text-center">
                <AlertCircle className="w-14 h-14 text-amber-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-slate-900 mb-1">订单处理中</h3>
                <p className="text-sm text-slate-500 mb-3">
                  支付结果可能延迟，请查看余额是否到账；如已支付但未到账，请截图订单信息联系商务核对。
                </p>
                <button
                  onClick={() => { closePayModal(); }}
                  className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] text-white text-sm font-medium"
                >
                  知道了
                </button>
              </div>
            )}

            {payStatus === 'error' && (
              <div className="py-10 text-center">
                <AlertCircle className="w-14 h-14 text-rose-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-slate-900 mb-1">下单失败</h3>
                <p className="text-sm text-slate-500 mb-6">{payError || '请稍后重试'}</p>
                <button
                  onClick={() => { closePayModal(); }}
                  className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] text-white text-sm font-medium"
                >
                  关闭
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 流水 */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-[#165DFF]/10 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Coins className="w-5 h-5 text-[#165DFF]" />
            积分流水
          </h2>
          <div className="flex gap-1.5 bg-slate-100/80 rounded-lg p-1">
            {TYPE_TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => onChangeFilter(t.value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  filter === t.value
                    ? 'bg-white text-[#165DFF] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700">
            {error}
          </div>
        )}

        {txLoading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-[#165DFF] animate-spin" />
          </div>
        ) : txs.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Coins className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">暂无流水记录</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                    <th className="px-3 py-2.5 font-medium">类型</th>
                    <th className="px-3 py-2.5 font-medium">变动</th>
                    <th className="px-3 py-2.5 font-medium">余额</th>
                    <th className="px-3 py-2.5 font-medium">备注</th>
                    <th className="px-3 py-2.5 font-medium text-right">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {txs.map((tx) => {
                    const meta = TYPE_META[tx.type];
                    const Icon = meta.icon;
                    const { sign, abs } = fmtAmount(tx);
                    const positive = sign === '+';
                    return (
                      <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${meta.cls}`}>
                            <Icon className="w-3 h-3" />
                            {meta.label}
                          </span>
                        </td>
                        <td className={`px-3 py-3 tabular-nums font-semibold ${positive ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {sign}{abs}
                        </td>
                        <td className="px-3 py-3 tabular-nums text-slate-700">{tx.balance_after}</td>
                        <td className="px-3 py-3 text-slate-500 max-w-[280px] truncate" title={tx.note || ''}>
                          {tx.note || (tx.related_candidate_id ? `解锁候选人 ${tx.related_candidate_id.slice(0, 8)}…` : tx.related_payment_id ? `订单 ${tx.related_payment_id}` : '—')}
                        </td>
                        <td className="px-3 py-3 text-right text-xs text-slate-400 whitespace-nowrap">{fmtTime(tx.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            <div className="mt-5 flex items-center justify-between text-sm">
              <div className="text-slate-500">
                共 <span className="font-medium text-slate-700">{total}</span> 条 · 第 {page}/{totalPages} 页
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onChangePage(Math.max(1, page - 1))}
                  disabled={page <= 1 || txLoading}
                  className="px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  上一页
                </button>
                <button
                  onClick={() => onChangePage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages || txLoading}
                  className="px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  下一页
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
