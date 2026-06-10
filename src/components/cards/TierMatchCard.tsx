/**
 * 三档岗位推荐卡片
 * 精准匹配岗（≥75%）/ 冲刺岗（60-74%）/ 稳妥保底岗（45-59%）
 * 蓝色主色调，三列横排卡片布局
 */

import { Card, CardContent } from '@/components/ui/card';
import { Target, Zap, Shield, MapPin, Building2, Briefcase } from 'lucide-react';

// ========== 类型定义 ==========

export interface TierJobItem {
  job_name: string;
  company?: string;
  match_score: number;
  industry?: string;
  city?: string;
  match_reason: string;
  required_skills?: string[];
}

export interface TierMatchData {
  /** 精准匹配岗 ≥75% */
  precise_match?: TierJobItem[];
  /** 冲刺岗 60-74% */
  reach_match?: TierJobItem[];
  /** 稳妥保底岗 45-59% */
  safety_match?: TierJobItem[];
}

// ========== 子组件 ==========

function MatchBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? 'text-green-600 bg-green-50 border-green-200' :
    score >= 60 ? 'text-blue-600 bg-blue-50 border-blue-200' :
    'text-orange-500 bg-orange-50 border-orange-200';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${color}`}>
      匹配{score}%
    </span>
  );
}

function TierColumn({
  title,
  icon,
  accentClass,
  borderClass,
  bgClass,
  items,
  emptyText,
}: {
  title: string;
  icon: React.ReactNode;
  accentClass: string;
  borderClass: string;
  bgClass: string;
  items?: TierJobItem[];
  emptyText: string;
}) {
  if (!items || items.length === 0) {
    return (
      <div className={`flex-1 min-w-[220px] rounded-xl border-2 border-dashed ${borderClass} ${bgClass} p-5 flex flex-col items-center justify-center text-center`}>
        <div className="text-gray-400 mb-2">{icon}</div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-xs text-gray-400 mt-1">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-[220px] flex flex-col gap-3">
      {/* 列标题 */}
      <div className={`flex items-center gap-2 px-1`}>
        <span className={accentClass}>{icon}</span>
        <span className={`text-sm font-bold ${accentClass}`}>{title}</span>
        <span className="text-xs text-gray-400 ml-auto">{items.length}个</span>
      </div>
      {/* 卡片列表 */}
      {items.map((job, idx) => (
        <Card key={idx} className={`border-2 ${borderClass} overflow-hidden hover:shadow-md transition-shadow`}>
          {/* 顶部色条 */}
          <div className={`h-1 ${accentClass.replace('text-', 'bg-').replace('text-', 'bg-')}`} />
          <CardContent className="p-4 space-y-3">
            {/* 岗位名 + 匹配度 */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-900 text-sm truncate" title={job.job_name}>
                  {job.job_name}
                </h4>
              </div>
              <MatchBadge score={job.match_score} />
            </div>

            {/* 公司/行业/城市 */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
              {job.company && (
                <span className="inline-flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {job.company}
                </span>
              )}
              {job.industry && (
                <span className="inline-flex items-center gap-1">
                  <Briefcase className="w-3 h-3" />
                  {job.industry}
                </span>
              )}
              {job.city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {job.city}
                </span>
              )}
            </div>

            {/* 匹配理由 */}
            <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-2.5">
              {job.match_reason}
            </p>

            {/* 核心要求技能标签 */}
            {job.required_skills && job.required_skills.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {job.required_skills.slice(0, 4).map((sk, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100"
                  >
                    {sk}
                  </span>
                ))}
                {job.required_skills.length > 4 && (
                  <span className="text-[10px] text-gray-400">+{job.required_skills.length - 4}</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ========== 主组件 ==========

interface TierMatchCardProps {
  data: TierMatchData | null;
}

export default function TierMatchCard({ data }: TierMatchCardProps) {
  if (!data) {
    return (
      <Card className="border-blue-100">
        <CardContent className="p-6 text-center text-gray-400 text-sm">
          暂无岗位匹配数据
        </CardContent>
      </Card>
    );
  }

  const hasAny =
    (data.precise_match && data.precise_match.length > 0) ||
    (data.reach_match && data.reach_match.length > 0) ||
    (data.safety_match && data.safety_match.length > 0);

  if (!hasAny) {
    return (
      <Card className="border-blue-100">
        <CardContent className="p-6 text-center text-gray-400 text-sm">
          暂无匹配岗位，试试提供更多关于你的专业和技能信息~
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-3">
      {/* 三列横排 */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* 精准匹配 ≥75% */}
        <TierColumn
          title="精准匹配岗"
          icon={<Target className="w-4 h-4" />}
          accentClass="text-green-600"
          borderClass="border-green-200"
          bgClass="bg-green-50/30"
          items={data.precise_match}
          emptyText="暂未发现高度匹配的岗位"
        />

        {/* 冲刺岗 60-74% */}
        <TierColumn
          title="冲刺岗"
          icon={<Zap className="w-4 h-4" />}
          accentClass="text-blue-600"
          borderClass="border-blue-200"
          bgClass="bg-blue-50/30"
          items={data.reach_match}
          emptyText="暂未发现可冲刺的岗位"
        />

        {/* 保底岗 45-59% */}
        <TierColumn
          title="稳妥保底岗"
          icon={<Shield className="w-4 h-4" />}
          accentClass="text-orange-500"
          borderClass="border-orange-200"
          bgClass="bg-orange-50/30"
          items={data.safety_match}
          emptyText="暂未发现保底岗位"
        />
      </div>

      {/* 底部说明 */}
      <p className="text-xs text-gray-400 mt-3 text-center">
        以上推荐基于真实JD库的语义匹配，匹配度仅供参考
      </p>
    </div>
  );
}
