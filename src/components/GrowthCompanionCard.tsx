'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

interface GrowthCompanionCardProps {
  companionDays: number;
  companionHours?: number;
  totalReports: number;
  totalFavorites: number;
  totalAssessments: number;
  isLoading?: boolean;
}

export default function GrowthCompanionCard({
  companionDays,
  companionHours = 0,
  totalReports,
  totalFavorites,
  totalAssessments,
  isLoading = false
}: GrowthCompanionCardProps) {
  const isEmpty = companionDays === 0 && totalReports === 0 && totalFavorites === 0 && totalAssessments === 0;

  if (isEmpty && !isLoading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="text-center py-10">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">今天是我们相识的第一天 🎊</h3>
          <p className="text-gray-500 mb-6">未来的每一步，小职都会陪你一起走</p>
          <Link
            href="/"
            className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            开始探索
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="text-xl">🌟</span>
          我和小职的故事
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            {isLoading ? (
              <Loader2 className="w-10 h-10 mx-auto text-blue-500 animate-spin" />
            ) : (
              <div className="text-3xl font-bold text-blue-600">
                {companionDays > 0 ? companionDays : companionHours}
              </div>
            )}
            <div className="text-sm text-gray-500 mt-1">
              {companionDays > 0 ? '陪伴天' : '陪伴小时'}
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            {isLoading ? (
              <Loader2 className="w-10 h-10 mx-auto text-blue-500 animate-spin" />
            ) : (
              <div className="text-3xl font-bold text-blue-600">{totalReports}</div>
            )}
            <div className="text-sm text-gray-500 mt-1">产出报告</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            {isLoading ? (
              <Loader2 className="w-10 h-10 mx-auto text-blue-500 animate-spin" />
            ) : (
              <div className="text-3xl font-bold text-blue-600">{totalFavorites}</div>
            )}
            <div className="text-sm text-gray-500 mt-1">收藏岗位</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            {isLoading ? (
              <Loader2 className="w-10 h-10 mx-auto text-blue-500 animate-spin" />
            ) : (
              <div className="text-3xl font-bold text-blue-600">{totalAssessments}</div>
            )}
            <div className="text-sm text-gray-500 mt-1">测评次数</div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-xl p-4 text-center">
          {companionDays === 0 ? (
            <p className="text-blue-800">今天是我们相识的第一天 🎊</p>
          ) : (
            <>
              <p className="text-blue-800 font-medium">
                🎉 你已经和小职一起走过 {companionDays} 天啦！
              </p>
              <p className="text-blue-600 text-sm mt-1">每一次成长，小职都在你身边 💙</p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}