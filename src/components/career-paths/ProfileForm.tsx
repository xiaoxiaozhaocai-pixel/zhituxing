// 职途星组态引擎 · 画像输入表单
'use client';

import React, { useState, useEffect } from 'react';
import { RawProfile } from '@/lib/career-paths/types';

interface ProfileFormProps {
  onSubmit: (profile: RawProfile) => void;
  loading: boolean;
  initialMajor?: string;
}

export default function ProfileForm({ onSubmit, loading, initialMajor }: ProfileFormProps) {
  const [form, setForm] = useState<RawProfile>({
    school: '',
    major: initialMajor || '',
    degree: '本科',
    internshipCount: 0,
    internshipQuality: '无',
    skills: [],
  });
  const [skillInput, setSkillInput] = useState('');

  // 支持从认知校正跳转带入专业（?major=xxx）
  useEffect(() => {
    if (initialMajor) {
      setForm((f) => ({ ...f, major: initialMajor }));
    }
  }, [initialMajor]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !form.skills.includes(trimmed)) {
      setForm({ ...form, skills: [...form.skills, trimmed] });
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setForm({ ...form, skills: form.skills.filter(s => s !== skill) });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 学校 */}
      <div className="rounded-xl bg-white/80 backdrop-blur-sm border border-blue-100 p-4 shadow-sm">
        <label className="block text-sm font-medium text-slate-700 mb-1.5">学校</label>
        <input
          type="text"
          value={form.school}
          onChange={(e) => setForm({ ...form, school: e.target.value })}
          placeholder="例：桂林电子科技大学"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
          required
        />
      </div>

      {/* 专业 */}
      <div className="rounded-xl bg-white/80 backdrop-blur-sm border border-blue-100 p-4 shadow-sm">
        <label className="block text-sm font-medium text-slate-700 mb-1.5">专业</label>
        <input
          type="text"
          value={form.major}
          onChange={(e) => setForm({ ...form, major: e.target.value })}
          placeholder="例：人力资源管理"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
          required
        />
      </div>

      {/* 学历 */}
      <div className="rounded-xl bg-white/80 backdrop-blur-sm border border-blue-100 p-4 shadow-sm">
        <label className="block text-sm font-medium text-slate-700 mb-1.5">学历</label>
        <select
          value={form.degree}
          onChange={(e) => setForm({ ...form, degree: e.target.value })}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
        >
          <option value="本科">本科</option>
          <option value="硕士">硕士</option>
          <option value="大专">大专</option>
        </select>
      </div>

      {/* 实习数量 */}
      <div className="rounded-xl bg-white/80 backdrop-blur-sm border border-blue-100 p-4 shadow-sm">
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          实习经历：{form.internshipCount} 段
        </label>
        <input
          type="range"
          min={0}
          max={5}
          value={form.internshipCount}
          onChange={(e) => setForm({ ...form, internshipCount: parseInt(e.target.value) })}
          className="w-full accent-blue-500"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>0段</span><span>1段</span><span>2段</span><span>3段</span><span>4段+</span>
        </div>
      </div>

      {/* 实习质量 */}
      <div className="rounded-xl bg-white/80 backdrop-blur-sm border border-blue-100 p-4 shadow-sm">
        <label className="block text-sm font-medium text-slate-700 mb-1.5">最高质量实习</label>
        <select
          value={form.internshipQuality}
          onChange={(e) => setForm({ ...form, internshipQuality: e.target.value })}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
        >
          <option value="无">无实习经历</option>
          <option value="小厂">小厂/普通公司</option>
          <option value="中厂">中厂/知名企业</option>
          <option value="大厂">大厂/行业头部</option>
          <option value="头部">头部企业/世界500强</option>
        </select>
      </div>

      {/* 技能 */}
      <div className="rounded-xl bg-white/80 backdrop-blur-sm border border-blue-100 p-4 shadow-sm">
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          已掌握技能（{form.skills.length} 项）
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
            placeholder="输入技能后按回车添加"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
          />
          <button
            type="button"
            onClick={addSkill}
            className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100 transition"
          >
            + 添加
          </button>
        </div>
        {form.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {form.skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className="text-blue-400 hover:text-blue-600"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 提交 */}
      <button
        type="submit"
        disabled={loading}
        className={`w-full py-3 rounded-xl text-white font-medium text-sm transition-all
          ${loading
            ? 'bg-blue-300 cursor-not-allowed'
            : 'bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] hover:shadow-md hover:-translate-y-0.5'
          }`}
      >
        {loading ? '匹配计算中...' : '开始匹配求职方向'}
      </button>
    </form>
  );
}
