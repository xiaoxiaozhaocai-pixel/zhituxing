'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useMembership } from '@/contexts/MembershipContext';

const PLANS = [
  {
    key: 'semester',
    name: '学期会员',
    price: 29.9,
    period: '半年',
    highlight: false,
    features: ['180天全功能体验', '无限AI对话', '完整匹配分析', '技能图谱全览'],
  },
  {
    key: 'annual',
    name: '年度会员',
    price: 99,
    period: '年',
    highlight: true,
    features: ['365天全功能体验', '无限AI对话', '完整匹配分析', '技能图谱全览', '测评报告下载', '学习路径定制'],
  },
  {
    key: 'lifetime',
    name: '永久会员',
    price: 199,
    period: '永久',
    highlight: false,
    features: ['一次付费永久使用', '全功能无限制', '优先体验新功能', '专属客服支持'],
  },
];

const MEMBER_BENEFITS = [
  { icon: '💬', title: '无限AI对话', desc: '免费用户每日3次，会员不限' },
  { icon: '🎯', title: '完整匹配分析', desc: '查看全量岗位匹配+薪资估算' },
  { icon: '🕸️', title: '技能图谱全览', desc: '多层技能关系+深度路径探索' },
  { icon: '📊', title: '测评报告下载', desc: '历史对比+成长曲线+PDF导出' },
  { icon: '🗺️', title: '学习路径定制', desc: '个性化学习计划+进度追踪' },
  { icon: '⚡', title: '优先体验', desc: '新功能抢先使用' },
];

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  feature?: string; // 触发付费墙的功能名称
}

export default function PaywallModal({ open, onClose, feature }: PaywallModalProps) {
  const { upgrade } = useMembership();
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleUpgrade = async (planKey: string) => {
    setUpgrading(planKey);
    const ok = await upgrade(planKey);
    if (ok) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    }
    setUpgrading(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg bg-gradient-to-b from-slate-900 to-slate-950 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            {success ? '🎉 升级成功！' : `解锁${feature || '会员功能'}`}
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-center">
            {success
              ? '已为您开通会员权益，尽情使用吧！'
              : '升级会员，解锁全部职业发展功能'}
          </DialogDescription>
        </DialogHeader>

        {!success ? (
          <>
            {/* 权益列表 */}
            <div className="grid grid-cols-2 gap-3 my-4">
              {MEMBER_BENEFITS.map((b) => (
                <div key={b.title} className="flex items-start gap-2 p-2 rounded-lg bg-slate-800/50">
                  <span className="text-lg">{b.icon}</span>
                  <div>
                    <div className="text-sm font-medium">{b.title}</div>
                    <div className="text-xs text-slate-400">{b.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* 套餐选择 */}
            <div className="space-y-3">
              {PLANS.map((plan) => (
                <div
                  key={plan.key}
                  className={`relative flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                    plan.highlight
                      ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-500'
                  }`}
                  onClick={() => handleUpgrade(plan.key)}
                >
                  {plan.highlight && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-3 py-0.5 rounded-full">
                      推荐
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-semibold">{plan.name}</div>
                      <div className="text-xs text-slate-400">{plan.period}</div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {plan.features.slice(0, 2).map((f) => (
                        <span key={f} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      <span className="text-sm">¥</span>
                      {plan.price}
                    </div>
                    {upgrading === plan.key && (
                      <div className="text-xs text-blue-400 animate-pulse">升级中...</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-center text-xs text-slate-500 mt-3">
              演示模式：点击套餐即可直接升级（实际项目中需接入支付系统）
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center py-8">
            <div className="text-6xl mb-4">👑</div>
            <p className="text-lg font-medium text-blue-400">会员权益已激活</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
