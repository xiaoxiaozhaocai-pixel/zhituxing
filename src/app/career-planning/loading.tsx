import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function CareerPlanningLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4">
        {/* 页面标题骨架 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-8 w-40 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="h-4 w-64 bg-gray-200 rounded animate-pulse ml-13" />
        </div>

        {/* 主内容区域骨架 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧表单卡片 */}
          <div className="lg:col-span-1">
            <Card className="border-green-100">
              <CardHeader>
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                    <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
                  </div>
                ))}
                <div className="h-10 w-full bg-green-200 rounded animate-pulse mt-4" />
              </CardContent>
            </Card>
          </div>

          {/* 右侧内容卡片 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 规划结果卡片 */}
            <Card className="border-green-100">
              <CardHeader>
                <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 bg-gray-50 rounded-lg">
                      <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2" />
                      <div className="h-3 w-full bg-gray-200 rounded animate-pulse mb-1" />
                      <div className="h-3 w-3/4 bg-gray-200 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 时间线卡片 */}
            <Card className="border-green-100">
              <CardHeader>
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-3 h-3 bg-gray-200 rounded-full animate-pulse mt-1" />
                      <div className="flex-1">
                        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-1" />
                        <div className="h-3 w-full bg-gray-200 rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
