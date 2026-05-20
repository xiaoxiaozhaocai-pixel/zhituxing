'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SkeletonCardProps {
  className?: string;
  showTags?: boolean;
}

/**
 * 卡片骨架屏组件 - 用于加载状态
 */
export function SkeletonCard({ className, showTags = true }: SkeletonCardProps) {
  return (
    <div className={cn(
      'bg-white border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 shadow-sm animate-pulse',
      className
    )}>
      {/* 标题骨架 */}
      <Skeleton className="h-6 w-3/4 mb-3 rounded-lg" />
      
      {/* 公司名称骨架 */}
      <Skeleton className="h-4 w-1/2 mb-4 rounded-lg" />
      
      {/* 信息标签行骨架 */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      
      {/* 技能标签行骨架 */}
      {showTags && (
        <div className="flex flex-wrap gap-2 mb-4">
          <Skeleton className="h-6 w-20 rounded-md" />
          <Skeleton className="h-6 w-24 rounded-md" />
          <Skeleton className="h-6 w-16 rounded-md" />
        </div>
      )}
      
      {/* 底部信息骨架 */}
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-[#E2E8F0]">
        <Skeleton className="h-4 w-20 rounded-lg" />
        <Skeleton className="h-8 w-16 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * 多个卡片骨架屏容器
 */
interface SkeletonCardListProps {
  count?: number;
  className?: string;
  showTags?: boolean;
}

export function SkeletonCardList({ count = 6, className, showTags = true }: SkeletonCardListProps) {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} showTags={showTags} />
      ))}
    </div>
  );
}

/**
 * AI 消息骨架屏 - 用于 AI 回复加载状态
 */
export function SkeletonAIMessage() {
  return (
    <div className="flex items-start gap-3 p-4 animate-pulse">
      <Skeleton className="w-8 h-8 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4 rounded-lg" />
        <Skeleton className="h-4 w-1/2 rounded-lg" />
        <div className="flex items-center gap-1 text-sm text-gray-400">
          <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          <span className="ml-2">AI 正在思考...</span>
        </div>
      </div>
    </div>
  );
}

/**
 * 搜索结果骨架屏
 */
export function SkeletonSearchResult() {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 animate-pulse">
      <div className="flex items-start gap-4">
        <Skeleton className="w-12 h-12 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4 rounded-lg" />
          <Skeleton className="h-4 w-1/2 rounded-lg" />
          <div className="flex gap-2 mt-2">
            <Skeleton className="h-4 w-16 rounded-full" />
            <Skeleton className="h-4 w-20 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default SkeletonCard;
