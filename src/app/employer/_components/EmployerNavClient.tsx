'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Coins, LayoutDashboard, Users, Receipt, LogOut } from 'lucide-react';

interface EmployerMe {
  employer_id: string;
  email: string | null;
  real_name: string;
  credit_balance: number;
  company: { name: string } | null;
}

const NAV = [
  { href: '/employer/dashboard', label: '工作台', icon: LayoutDashboard },
  { href: '/employer/candidates', label: '候选人', icon: Users },
  { href: '/employer/billing', label: '账户', icon: Receipt },
];

export default function EmployerNavClient() {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<EmployerMe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/employer/auth/me', { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) return null;
        const j = await r.json();
        return j.ok ? (j.data as EmployerMe) : null;
      })
      .then((d) => {
        setMe(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [pathname]);

  async function handleLogout() {
    await fetch('/api/employer/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    router.push('/employer/auth/login');
    router.refresh();
  }

  if (loading) {
    return <div className="h-8 w-24 bg-gray-100 rounded animate-pulse" />;
  }

  if (!me) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/employer/auth/login"
          className="text-sm text-gray-700 hover:text-[#165DFF] px-3 py-1.5 rounded-md transition"
        >
          登录
        </Link>
        <Link
          href="/employer/auth/signup"
          className="text-sm text-white bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] hover:opacity-90 px-3 py-1.5 rounded-md transition shadow-md shadow-[#165DFF]/20"
        >
          注册
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <nav className="hidden md:flex items-center gap-1 mr-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition ${
                active
                  ? 'bg-[#165DFF]/10 text-[#165DFF] font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#FF7D00]/10 border border-[#FF7D00]/20">
        <Coins className="w-3.5 h-3.5 text-[#FF7D00]" />
        <span className="text-sm font-semibold text-[#FF7D00]">{me.credit_balance}</span>
      </div>
      <div className="hidden sm:flex flex-col text-right ml-2 leading-tight">
        <span className="text-xs font-medium text-gray-900">{me.real_name}</span>
        <span className="text-[10px] text-gray-500">{me.company?.name ?? '未关联公司'}</span>
      </div>
      <button
        onClick={handleLogout}
        className="ml-2 p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-md transition"
        title="退出登录"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
}
