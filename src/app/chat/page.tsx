'use client';

import { useState } from 'react';

export default function ChatPage() {
  const [message, setMessage] = useState('');
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8fafd] to-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">小职</h1>
          <p className="text-gray-500">你的AI求职伙伴</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="有什么想聊的？"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#165DFF]/20 focus:border-[#165DFF]"
            />
            <button className="px-6 py-3 bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] text-white rounded-xl font-medium hover:opacity-90 transition-opacity">
              发送
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
