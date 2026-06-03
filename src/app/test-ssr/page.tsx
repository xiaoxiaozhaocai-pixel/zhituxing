import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SSR测试 - 服务端渲染验证 | 职途星',
  description: '验证职途星平台是否支持服务端渲染（SSR）',
};

// 这是一个 Server Component（默认），会在服务端渲染
export default function SSRTestPage() {
  const serverTime = new Date().toISOString();
  const serverTimestamp = Date.now();
  const nodeVersion = process.version;
  const env = process.env.NODE_ENV;
  
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">SSR 测试页面</h1>
        
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">✅ 服务端渲染成功</h2>
            <p className="text-gray-600">
              此页面是 Server Component，在服务端渲染后发送到客户端。
              如果你能在页面源代码中看到下方的时间戳，说明 SSR 正常工作。
            </p>
          </section>
          
          <section className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">服务端信息</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-gray-600">Server Time:</dt>
                <dd className="font-mono text-blue-600" data-ssr="server-time">{serverTime}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Server Timestamp:</dt>
                <dd className="font-mono text-blue-600" data-ssr="timestamp">{serverTimestamp}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Node.js Version:</dt>
                <dd className="font-mono text-green-600">{nodeVersion}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Environment:</dt>
                <dd className="font-mono text-purple-600">{env}</dd>
              </div>
            </dl>
          </section>
          
          <section className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">验证方法</h3>
            <ol className="list-decimal pl-6 space-y-2 text-gray-600">
              <li>右键点击页面 → 查看页面源代码</li>
              <li>搜索 &quot;Server Time&quot; 或时间戳</li>
              <li>如果能找到，说明页面是服务端渲染的</li>
              <li>或者运行: <code className="bg-gray-100 px-2 py-1 rounded">curl -s http://localhost:5000/test-ssr | grep &quot;server-time&quot;</code></li>
            </ol>
          </section>
          
          <section className="border-t pt-6 bg-green-50 -mx-8 -mb-8 p-8 rounded-b-lg">
            <p className="text-green-800">
              <strong>结论：</strong>如果你能看到此页面的完整内容且源代码中包含时间戳，
              说明职途星平台的 Next.js App Router 服务端渲染（SSR）功能正常工作。
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
