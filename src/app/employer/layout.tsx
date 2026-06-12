/**
 * 雇主端布局（蓝白·primary #165DFF·禁暗色）
 * 自带 EmployerNavbar：用户头像/退出登录
 */
import Link from 'next/link';
import { Building2 } from 'lucide-react';
import EmployerNavClient from './_components/EmployerNavClient';

export const metadata = {
  title: '雇主端 · 职途星',
  description: '懂桂电学生的AI朋友——小职雇主端，候选人精准匹配',
};

export default function EmployerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8fafd] via-white to-[#f0f5ff]/40">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/80 border-b border-[#165DFF]/10">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/employer/dashboard" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#165DFF] to-[#3D7FFF] flex items-center justify-center shadow-md shadow-[#165DFF]/20">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-gray-900 group-hover:text-[#165DFF] transition">职途星 · 雇主</span>
              <span className="text-[10px] text-gray-500">Candidate Match</span>
            </div>
          </Link>
          <EmployerNavClient />
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
