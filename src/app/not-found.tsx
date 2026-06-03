import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4">
      {/* 404 动画数字 */}
      <div className="relative mb-8">
        <div className="text-[180px] md:text-[240px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 opacity-20 select-none animate-pulse">
          404
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center shadow-2xl animate-bounce">
            <svg className="w-16 h-16 md:w-20 md:h-20 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* 文字提示 */}
      <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4 text-center">
        页面未找到
      </h1>
      <p className="text-lg text-gray-500 mb-8 text-center max-w-md">
        您访问的页面不存在或已被移除，请检查网址是否正确
      </p>

      {/* 操作按钮 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Link href="/">
          <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 4 4M5 10l7 7m4-4l2 2m-2-2l7-7" />
            </svg>
            返回首页
          </Button>
        </Link>
        <Link href="/match">
          <Button variant="outline" className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-6 text-lg rounded-xl transition-all duration-300">
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            搜索职位
          </Button>
        </Link>
      </div>

      {/* 装饰元素 */}
      <div className="absolute top-20 left-10 w-20 h-20 rounded-full bg-blue-200 opacity-30 blur-xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-32 h-32 rounded-full bg-purple-200 opacity-30 blur-xl animate-pulse" style={{ animationDelay: '1s' }} />
    </div>
  );
}
