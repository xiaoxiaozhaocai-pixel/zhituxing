import { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface ShareData {
  botName: string;
  botGradient: string;
  messages: { role: string; content: string }[];
  createdAt: string;
}

async function getShareData(id: string): Promise<ShareData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://zhituxing.tech';
    const res = await fetch(`${baseUrl}/api/share?id=${encodeURIComponent(id)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getShareData(id);
  if (!data) {
    return { title: '分享不存在 - 职途星' };
  }
  return {
    title: `${data.botName} 对话分享 - 职途星`,
    description: `查看职途星AI助手「${data.botName}」的对话记录`,
    openGraph: {
      title: `${data.botName} 对话分享 - 职途星`,
      description: `查看职途星AI助手「${data.botName}」的对话记录`,
      type: 'website',
    },
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getShareData(id);

  if (!data) {
    return notFound();
  }

  const gradientClass = data.botGradient || 'from-blue-500 to-blue-600';
  const date = new Date(data.createdAt).toLocaleString('zh-CN');

  // 简易 Markdown → HTML 渲染
  function renderContent(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // 代码块
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="code-block"><code>$2</code></pre>')
      // 行内代码
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
      // 加粗
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // 链接
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      // 换行
      .replace(/\n/g, '<br>');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      {/* 顶部品牌条 */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white font-bold text-sm`}>
              职
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">职途星 · 对话分享</h1>
              <p className="text-xs text-gray-400">{data.botName} · {date}</p>
            </div>
          </div>
          <a
            href="https://zhituxing.tech"
            className="text-sm text-[#165DFF] hover:underline font-medium"
          >
            打开职途星 →
          </a>
        </div>
      </header>

      {/* 对话内容 */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
          {data.messages.map((msg, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* 头像 */}
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm ${
                  msg.role === 'user'
                    ? `bg-gradient-to-br ${gradientClass} text-white`
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {msg.role === 'user' ? '我' : 'AI'}
              </div>
              {/* 气泡 */}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? `bg-gradient-to-br ${gradientClass} text-white rounded-tr-sm`
                    : 'bg-gray-50 text-gray-900 rounded-tl-sm border border-gray-100'
                }`}
              >
                <div
                  className={`text-sm leading-relaxed whitespace-pre-wrap [&_.code-block]:bg-gray-800 [&_.code-block]:text-green-300 [&_.code-block]:p-3 [&_.code-block]:rounded-lg [&_.code-block]:my-2 [&_.code-block]:overflow-x-auto [&_.code-block]:text-xs [&_.inline-code]:bg-gray-200 [&_.inline-code]:text-pink-600 [&_.inline-code]:px-1.5 [&_.inline-code]:py-0.5 [&_.inline-code]:rounded [&_.inline-code]:text-xs [&_strong]:font-semibold [&_a]:text-blue-500 [&_a]:underline`}
                  dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* 底部引导 */}
        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm mb-4">内容由 AI 生成，仅供参考</p>
          <a
            href="https://zhituxing.tech"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] text-white rounded-xl font-medium hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/25"
          >
            来职途星，体验更多 AI 求职能力
          </a>
        </div>
      </div>
    </div>
  );
}
