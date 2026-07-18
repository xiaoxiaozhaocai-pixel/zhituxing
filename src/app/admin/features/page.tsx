'use client';

import { useEffect, useState } from 'react';

interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  category: 'core' | 'experiment' | 'future';
  addedAt: string;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  core: { label: '核心', color: 'bg-green-100 text-green-700 border-green-200' },
  experiment: { label: '实验', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  future: { label: '未来', color: 'bg-gray-100 text-gray-500 border-gray-200' },
};

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
// eslint-disable-next-line react-hooks/immutability
    fetchFlags();
  }, []);

  async function fetchFlags() {
    try {
      setLoading(true);
      const res = await fetch('/api/features');
      const data = await res.json();
      if (data.success) {
        setFlags(data.data.flags);
      } else {
        setError('加载失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  }

  const coreFlags = flags.filter(f => f.category === 'core');
  const experimentFlags = flags.filter(f => f.category === 'experiment');
  const futureFlags = flags.filter(f => f.category === 'future');

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-[#1E293B] mb-1">Feature Flag 管理</h3>
        <p className="text-sm text-[#64748B]">控制新功能上线节奏，修改 src/lib/features/flags.ts 后部署生效</p>
      </div>

      {loading && <div className="text-[#64748B]">加载中...</div>}
      {error && <div className="text-red-500">{error}</div>}

      {/* 统计卡片 */}
      {!loading && !error && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard label="全部功能" value={flags.length} color="blue" />
          <StatCard label="已启用" value={flags.filter(f => f.enabled).length} color="green" />
          <StatCard label="待上线" value={flags.filter(f => !f.enabled).length} color="yellow" />
        </div>
      )}

      {/* 分类展示 */}
      {!loading && !error && (
        <div className="space-y-6">
          <FlagCategory title="✅ 核心功能（已上线）" flags={coreFlags} />
          <FlagCategory title="🧪 实验功能（本次迭代）" flags={experimentFlags} />
          <FlagCategory title="🔮 未来功能" flags={futureFlags} />
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    green: 'border-green-200 bg-green-50 text-green-700',
    yellow: 'border-yellow-200 bg-yellow-50 text-yellow-700',
  };
  return (
    <div className={`border rounded-xl p-4 ${colors[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm opacity-75">{label}</div>
    </div>
  );
}

function FlagCategory({ title, flags }: { title: string; flags: FeatureFlag[] }) {
  if (flags.length === 0) return null;
  return (
    <div>
      <h4 className="text-sm font-semibold text-[#64748B] mb-3 uppercase tracking-wide">{title}</h4>
      <div className="grid gap-3">
        {flags.map(flag => (
          <div
            key={flag.key}
            className={`border rounded-xl p-4 flex items-start justify-between ${
              flag.enabled ? 'bg-white border-[#E2E8F0]' : 'bg-gray-50 border-gray-200 opacity-75'
            }`}
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-[#1E293B]">{flag.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${CATEGORY_LABELS[flag.category]?.color}`}>
                  {CATEGORY_LABELS[flag.category]?.label}
                </span>
              </div>
              <p className="text-sm text-[#64748B]">{flag.description}</p>
              <p className="text-xs text-[#94A3B8] mt-1">Key: {flag.key} · 添加: {flag.addedAt}</p>
            </div>
            <span
              className={`shrink-0 w-3 h-3 rounded-full mt-1.5 ${
                flag.enabled ? 'bg-green-500 ring-2 ring-green-100' : 'bg-gray-300'
              }`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
