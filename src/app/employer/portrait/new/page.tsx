"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function NewPortraitPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [candidatesText, setCandidatesText] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!title.trim()) { setError('请输入岗位名称'); return; }
    if (!candidatesText.trim()) { setError('请至少输入1位候选人'); return; }

    setCreating(true);
    setError('');

    // 解析候选人文本：每行一个 "姓名, 学历, 经验摘要"
    const lines = candidatesText.trim().split('\n').filter(Boolean);
    const candidates = lines.map(line => {
      const parts = line.split(',').map(s => s.trim());
      return {
        name: parts[0],
        education: parts[1] || null,
        experience_summary: parts[2] || null,
      };
    });

    try {
      // 先创建画像项目
      const createRes = await fetch('/api/employer/portrait', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: title.trim() }),
      });
      const createData = await createRes.json();
      if (!createData.ok) { setError(createData.data?.message || '创建失败'); setCreating(false); return; }

      const portraitId = createData.data.item.id;

      // 导入候选人
      const importRes = await fetch(`/api/employer/portrait/${portraitId}/candidates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ candidates }),
      });
      const importData = await importRes.json();
      if (!importData.ok) { setError(importData.data?.message || '导入失败'); setCreating(false); return; }

      router.push(`/employer/portrait/${portraitId}`);
    } catch {
      setError('网络错误，请重试');
      setCreating(false);
    }
  };

  return (
    <div>
      <Link href="/employer/portrait" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#165DFF] mb-4 transition">
        <ArrowLeft className="w-4 h-4" />
        返回列表
      </Link>

      <h1 className="text-xl font-bold text-gray-900 mb-6">新建画像项目</h1>

      <div className="max-w-2xl space-y-6">
        {/* 岗位名称 */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">岗位名称</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="如：电池工艺工程师"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#165DFF]/20 focus:border-[#165DFF]"
          />
          <p className="text-xs text-gray-400 mt-1.5">名称会作为画像报告的标题</p>
        </div>

        {/* 候选人导入 */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            候选人列表
            <span className="text-gray-400 font-normal ml-1">（每行一人，格式：姓名, 学历, 经验摘要）</span>
          </label>
          <textarea
            value={candidatesText}
            onChange={e => setCandidatesText(e.target.value)}
            placeholder={`张三, 本科, 涂布工艺3年\n李四, 硕士, CATL设备维护5年\n王五, 大专, 装配工序1年`}
            rows={10}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#165DFF]/20 focus:border-[#165DFF] font-mono"
          />
          <p className="text-xs text-gray-400 mt-1.5">
            学历可选填，系统自动编码为5级（博士/硕士/211本科/普通本科/大专/高中及以下）。
            经验摘要可选填，显示在盲评卡片上供参考。
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={creating}
          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] text-white text-sm font-medium rounded-lg shadow-md shadow-[#165DFF]/20 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all inline-flex items-center justify-center gap-2"
        >
          {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> 创建中...</> : <><Upload className="w-4 h-4" /> 创建项目并导入</>}
        </button>
      </div>
    </div>
  );
}
