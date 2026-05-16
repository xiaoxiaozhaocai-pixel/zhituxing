/**
 * 职业规划卡片
 * 展示：目标岗位标题、分阶段学习路径（时间线样式）、所需技能标签
 * 样式：绿色系主题
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface CareerStage {
  stage: string;
  duration?: string;
  tasks?: string[];
  [key: string]: unknown;
}

export interface CareerPlanData {
  target_position?: string;
  industry?: string;
  stages?: CareerStage[];
  skills_needed?: string[];
  salary_expectation?: string;
  summary?: string;
  [key: string]: unknown;
}

interface CareerPlanCardProps {
  data: CareerPlanData | null;
}

export default function CareerPlanCard({ data }: CareerPlanCardProps) {
  if (!data) {
    return (
      <Card className="border-green-100">
        <CardHeader>
          <CardTitle className="text-green-700 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            职业规划
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-sm text-center py-6">暂无职业规划数据</p>
        </CardContent>
      </Card>
    );
  }

  const targetPosition = data.target_position || '';
  const industry = data.industry || '';
  const stages = data.stages || [];
  const skillsNeeded = data.skills_needed || [];
  const salaryExpectation = data.salary_expectation || '';

  return (
    <Card className="border-green-100 overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-green-400 to-emerald-600" />
      <CardHeader>
        <CardTitle className="text-green-700 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          职业规划
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* 目标岗位 */}
        {targetPosition && (
          <div className="text-center py-3 bg-green-50 rounded-lg">
            <div className="text-sm text-green-500 mb-1">目标岗位</div>
            <div className="text-xl font-bold text-green-700">{targetPosition}</div>
            {industry && (
              <div className="text-sm text-green-500 mt-1">{industry}</div>
            )}
            {salaryExpectation && (
              <div className="text-sm text-emerald-600 mt-1">预期薪资：{salaryExpectation}</div>
            )}
          </div>
        )}

        {/* 分阶段学习路径 — 时间线样式 */}
        {stages.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">学习路径</h4>
            <div className="relative pl-6">
              {/* 竖线 */}
              <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-green-200" />
              {stages.map((stage, idx) => (
                <div key={idx} className="relative pb-4 last:pb-0">
                  {/* 节点圆点 */}
                  <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow-sm" />
                  <div className="bg-green-50/60 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-green-700">{stage.stage}</span>
                      {stage.duration && (
                        <span className="text-xs text-green-500 bg-green-100 px-2 py-0.5 rounded-full">
                          {stage.duration}
                        </span>
                      )}
                    </div>
                    {stage.tasks && stage.tasks.length > 0 && (
                      <ul className="space-y-1">
                        {stage.tasks.map((task, taskIdx) => (
                          <li key={taskIdx} className="flex items-start gap-1.5 text-sm text-gray-600">
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-green-400 shrink-0" />
                            {task}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 所需技能标签 */}
        {skillsNeeded.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">所需技能</h4>
            <div className="flex flex-wrap gap-2">
              {skillsNeeded.map((skill, idx) => (
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

        {/* 摘要 */}
        {data.summary && (
          <div className="bg-green-50 rounded-lg p-3 text-sm text-gray-600">
            {data.summary}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
