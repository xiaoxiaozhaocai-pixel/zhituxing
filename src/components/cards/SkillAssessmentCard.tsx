/**
 * 技能测评卡片
 * 展示：技能评分列表（进度条）、推荐岗位标签
 * 样式：紫色系主题
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface SkillScore {
  name: string;
  score: number;
  max_score?: number;
  level?: string;
}

export interface SkillAssessmentData {
  skills?: SkillScore[];
  recommended_jobs?: string[];
  overall_level?: string;
  strengths?: string[];
  weaknesses?: string[];
  summary?: string;
  [key: string]: unknown;
}

interface SkillAssessmentCardProps {
  data: SkillAssessmentData | null;
}

function SkillBar({ name, score, max_score, level }: SkillScore) {
  const effectiveMax = max_score || 100;
  const percentage = Math.min((score / effectiveMax) * 100, 100);

  // 根据分数选颜色
  const barColor = percentage >= 80
    ? 'bg-purple-500'
    : percentage >= 60
      ? 'bg-purple-400'
      : percentage >= 40
        ? 'bg-purple-300'
        : 'bg-purple-200';

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-600">{name}</span>
        <div className="flex items-center gap-2">
          {level && (
            <span className="text-xs text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded">
              {level}
            </span>
          )}
          <span className="font-medium text-gray-700">{score}/{effectiveMax}</span>
        </div>
      </div>
      <div className="h-2 bg-purple-50 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default function SkillAssessmentCard({ data }: SkillAssessmentCardProps) {
  if (!data) {
    return (
      <Card className="border-purple-100">
        <CardHeader>
          <CardTitle className="text-purple-700 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            技能测评
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-sm text-center py-6">暂无技能测评数据</p>
        </CardContent>
      </Card>
    );
  }

  const skills = data.skills || [];
  const recommendedJobs = data.recommended_jobs || [];
  const overallLevel = data.overall_level || '';
  const strengths = data.strengths || [];
  const weaknesses = data.weaknesses || [];

  return (
    <Card className="border-purple-100 overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-purple-400 to-violet-600" />
      <CardHeader>
        <CardTitle className="text-purple-700 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          技能测评
          {overallLevel && (
            <span className="ml-auto text-xs font-normal bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
              综合等级：{overallLevel}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* 技能评分列表 */}
        {skills.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">技能评分</h4>
            {skills.map((skill, idx) => (
              <SkillBar key={idx} {...skill} />
            ))}
          </div>
        )}

        {/* 优势 */}
        {strengths.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">核心优势</h4>
            <ul className="space-y-1">
              {strengths.map((s, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 不足 */}
        {weaknesses.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">待提升方向</h4>
            <ul className="space-y-1">
              {weaknesses.map((w, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-purple-300 shrink-0" />
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 推荐岗位标签 */}
        {recommendedJobs.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">推荐岗位</h4>
            <div className="flex flex-wrap gap-2">
              {recommendedJobs.map((job, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200"
                >
                  {job}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 摘要 */}
        {data.summary && (
          <div className="bg-purple-50 rounded-lg p-3 text-sm text-gray-600">
            {data.summary}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
