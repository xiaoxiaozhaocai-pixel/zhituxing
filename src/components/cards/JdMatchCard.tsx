/**
 * 岗位匹配卡片
 * 展示：匹配度百分比、岗位名称、技能缺口标签、薪资范围
 * 样式：橙色系主题
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface JdMatchData {
  match_score?: number;
  job_name?: string;
  company_name?: string;
  company_type?: string;
  city?: string;
  salary_range?: string;
  skill_gaps?: string[];
  matched_skills?: string[];
  industry?: string;
  summary?: string;
  [key: string]: unknown;
}

interface JdMatchCardProps {
  data: JdMatchData | null;
}

function MatchRing({ score }: { score: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  // 根据匹配度选颜色
  const color = score >= 80 ? 'text-green-500' : score >= 60 ? 'text-orange-500' : 'text-red-400';
  const strokeColor = score >= 80 ? 'stroke-green-500' : score >= 60 ? 'stroke-orange-500' : 'stroke-red-400';

  return (
    <div className="relative w-24 h-24 mx-auto">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="#FFF7ED" strokeWidth="6" />
        <circle
          cx="40" cy="40" r={radius} fill="none"
          className={strokeColor}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.7s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-xl font-bold ${color}`}>{score}%</span>
      </div>
    </div>
  );
}

export default function JdMatchCard({ data }: JdMatchCardProps) {
  if (!data) {
    return (
      <Card className="border-orange-100">
        <CardHeader>
          <CardTitle className="text-orange-700 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            岗位匹配
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-sm text-center py-6">暂无岗位匹配数据</p>
        </CardContent>
      </Card>
    );
  }

  const matchScore = data.match_score ?? 0;
  const jobName = data.job_name || '';
  const companyName = data.company_name || '';
  const city = data.city || '';
  const salaryRange = data.salary_range || '';
  const skillGaps = data.skill_gaps || [];
  const matchedSkills = data.matched_skills || [];
  const industry = data.industry || '';

  return (
    <Card className="border-orange-100 overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-orange-400 to-amber-500" />
      <CardHeader>
        <CardTitle className="text-orange-700 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          岗位匹配
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* 匹配度 + 岗位信息 */}
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-orange-50 rounded-lg p-4">
          <MatchRing score={matchScore} />
          <div className="text-center sm:text-left flex-1">
            {jobName && <div className="text-lg font-bold text-orange-700">{jobName}</div>}
            {(() => {
              const fallback = [data.industry, data.company_type].filter(Boolean).join(' · ');
              const display = companyName || fallback;
              return display ? <div className="text-sm text-gray-600 mt-0.5">{display}</div> : null;
            })()}
            <div className="flex items-center justify-center sm:justify-start gap-2 mt-1 text-sm text-gray-500">
              {city && <span>{city}</span>}
              {industry && <span>· {industry}</span>}
            </div>
            {salaryRange && (
              <div className="text-sm font-medium text-amber-600 mt-1">薪资：{salaryRange}</div>
            )}
          </div>
        </div>

        {/* 已匹配技能 */}
        {matchedSkills.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">已匹配技能</h4>
            <div className="flex flex-wrap gap-2">
              {matchedSkills.map((skill, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 技能缺口 */}
        {skillGaps.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">技能缺口</h4>
            <div className="flex flex-wrap gap-2">
              {skillGaps.map((skill, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 摘要 */}
        {data.summary && (
          <div className="bg-orange-50 rounded-lg p-3 text-sm text-gray-600">
            {data.summary}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
