import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function AssessmentLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4">
        {/* 页面标题骨架 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="h-4 w-56 bg-gray-200 rounded animate-pulse ml-13" />
        </div>

        {/* 主内容区域骨架 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧测评历史列表 */}
          <div className="lg:col-span-1 space-y-3">
            <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-gray-100">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-1" />
                      <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
                    </div>
                    <div className="h-6 w-12 bg-blue-200 rounded animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 右侧测评详情 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 竞争力百分位卡片 */}
            <Card className="border-blue-100 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-blue-400 to-blue-600" />
              <CardContent className="py-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="h-5 w-28 bg-gray-200 rounded animate-pulse mb-2" />
                    <div className="h-3 w-40 bg-gray-200 rounded animate-pulse" />
                  </div>
                  <div className="h-8 w-24 bg-blue-200 rounded animate-pulse" />
                </div>
                <div className="mt-3 h-3 bg-blue-50 rounded-full overflow-hidden">
                  <div className="h-full w-2/3 bg-blue-200 rounded-full animate-pulse" />
                </div>
              </CardContent>
            </Card>

            {/* 雷达图卡片 */}
            <Card className="border-blue-100">
              <CardHeader>
                <div className="h-6 w-28 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="flex justify-center mb-6">
                  <div className="w-64 h-64 bg-gray-100 rounded-full animate-pulse" />
                </div>
                {/* 维度详情骨架 */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="bg-blue-50 rounded-lg p-3">
                      <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mb-2" />
                      <div className="h-5 w-12 bg-gray-200 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 技能缺口卡片 */}
            <Card className="border-orange-100">
              <CardHeader>
                <div className="h-6 w-28 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-6 w-20 bg-orange-100 rounded-full animate-pulse" />
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
