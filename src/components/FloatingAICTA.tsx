'use client';

import Link from 'next/link';
import { MessageSquare, Briefcase, Compass, Mic } from 'lucide-react';
import { useState } from 'react';

const quickActions = [
  { label: '找小职聊聊', icon: MessageSquare, href: '/assistant?bot=xiaozhi' },
  { label: '职业规划', icon: Compass, href: '/assistant?bot=career' },
  { label: '模拟面试', icon: Mic, href: '/assistant?bot=interview' },
];

export default function FloatingAICTA() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="fixed bottom-6 right-6 z-40"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 展开面板 */}
      <div
        className={`
          absolute right-full mr-3 bottom-0 flex items-center gap-2
          transition-all duration-300
          ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'}
        `}
      >
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} href={action.href}>
              <div className="flex items-center gap-1.5 bg-white border border-blue-100 text-blue-600 text-sm px-3 py-2 rounded-lg shadow-lg hover:bg-blue-50 hover:border-blue-200 transition-all whitespace-nowrap cursor-pointer">
                <Icon className="w-4 h-4" />
                <span className="font-medium">{action.label}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* 主按钮 */}
      <button
        className={`
          flex items-center justify-center w-14 h-14 rounded-full shadow-lg
          bg-gradient-to-r from-blue-500 to-indigo-600
          transition-all duration-300 hover:scale-110 hover:shadow-xl
          hover:shadow-blue-500/40
        `}
      >
        <MessageSquare className="w-6 h-6 text-white" />
      </button>
    </div>
  );
}
