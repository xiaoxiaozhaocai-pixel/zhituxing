/**
 * 面试结果卡片
 * 展示：综合得分、各维度评分（进度条）、改进建议列表
 * 样式：蓝色系主题
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface InterviewDimensionScore {
  name: string;
  score: number;
  max_score?: number;
}

export interface InterviewResultData {
  overall_score?: number;
  max_score?: number;
  dimensions?: InterviewDimensionScore[];
  suggestions?: string[];
  summary?: string;
  [key: string]: unknown;
}

interface InterviewResultCardProps {
  data: InterviewResultData | null;
}

function ScoreBar({ score, maxScore, color }: { score: number; maxScore: number; color: string }) {
  const percentage = maxScore > 0 ? Math.min((score / maxScore) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex-1 h-2.5 bg-blue-50 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-medium text-gray-600 min-w-[48px] text-right">
        {score}/{maxScore}
      </span>
    </div>
  );
}

export default function InterviewResultCard({ data }: InterviewResultCardProps) {
  if (!data) {
    return (
      <Card className="border-blue-100">
        <CardHeader>
          <CardTitle className="text-blue-700 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            面试结果
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-sm text-center py-6">暂无面试结果数据</p>
        </CardContent>
      </Card>
    );
  }

  const overallScore = data.overall_score ?? 0;
  const maxScore = data.max_score ?? 100;
  const dimensions = data.dimensions || [];
  const suggestions = data.suggestions || [];
  const scorePercentage = maxScore > 0 ? Math.min((overallScore / maxScore) * 100, 100) : 0;

  return (
    <Card className="border-blue-100 overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-blue-400 to-blue-600" />
      <CardHeader>
        <CardTitle className="text-blue-700 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          面试结果
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* 综合得分 */}
        <div className="text-center py-3 bg-blue-50 rounded-lg">
          <div className="text-4xl font-bold text-blue-600">{overallScore}</div>
          <div className="text-sm text-blue-400 mt-1">综合得分（满分{maxScore}）</div>
          <div className="mt-2 mx-auto w-3/4 h-2 bg-blue-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-700"
              style={{ width: `${scorePercentage}%` }}
            />
          </div>
        </div>

        {/* 各维度评分 */}
        {dimensions.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">各维度评分</h4>
            {dimensions.map((dim, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{dim.name}</span>
                </div>
                <ScoreBar score={dim.score} maxScore={dim.max_score || maxScore} color="bg-blue-500" />
              </div>
            ))}
          </div>
        )}

        {/* 改进建议 */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">改进建议</h4>
            <ul className="space-y-1.5">
              {suggestions.map((suggestion, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 摘要 */}
        {data.summary && (
          <div className="bg-blue-50 rounded-lg p-3 text-sm text-gray-600">
            {data.summary}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
