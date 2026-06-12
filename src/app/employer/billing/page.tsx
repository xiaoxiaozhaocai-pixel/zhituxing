'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Coins, TrendingUp, TrendingDown, Loader2, Wallet,
  CreditCard, Sparkles, ArrowDownToLine, ArrowUpFromLine, RefreshCw,
} from 'lucide-react';

interface Balance {
  credit_balance: number;
  total_recharged: number;
  total_consumed: number;
}

type TxType = 'recharge' | 'consume' | 'refund' | 'adjust';

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

const TYPE_TABS: { value: TxType | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'recharge', label: '充值' },
  { value: 'consume', label: '消费' },
  { value: 'refund', label: '退款' },
];

const TYPE_META: Record<TxType, { label: string; cls: string; icon: typeof ArrowDownToLine }> = {
  recharge: { label: '充值', cls: 'text-emerald-600 bg-emerald-50', icon: ArrowDownToLine },
  consume: { label: '消费', cls: 'text-rose-600 bg-rose-50', icon: ArrowUpFromLine },
  refund: { label: '退款', cls: 'text-blue-600 bg-blue-50', icon: RefreshCw },
  adjust: { label: '调整', cls: 'text-slate-600 bg-slate-50', icon: RefreshCw },
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
    const sign = tx.type === 'recharge' || tx.type === 'refund' || (tx.type === 'adjust' && tx.amount > 0) ? '+' : '-';
    const abs = Math.abs(tx.amount);
    return { sign, abs };
  };

  const fmtTime = (s: string) => {
    const d = new Date(s);
    return d.toLocaleString('zh-CN', { hour12: false });
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

      {/* 充值套餐（占位） */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-[#165DFF]/10 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#165DFF]" />
              充值套餐
            </h2>
            <p className="text-sm text-slate-500 mt-1">一条额度 = 解锁一名候选人完整画像（90天有效）</p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
            充值通道开通中
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
              <button
                disabled
                className="mt-4 w-full py-2.5 rounded-lg bg-slate-100 text-slate-400 text-sm font-medium cursor-not-allowed"
                title="充值通道开通中"
              >
                即将开放
              </button>
            </div>
          ))}
        </div>
        <div className="mt-5 px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-600">
          <strong className="text-slate-800">支付通道开通中：</strong>
          目前充值需联系商务，邮件 <a href="mailto:bd@zhituxing.tech" className="text-[#165DFF] underline">bd@zhituxing.tech</a>
          {' '}或联系您的对接顾问开通临时额度。线上支付预计 2 周内上线。
        </div>
      </div>

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
