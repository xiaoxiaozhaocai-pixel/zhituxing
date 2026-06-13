'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Brain, FileText, FileSearch, Heart, Mic } from 'lucide-react';

interface Milestone {
  id: string;
  type: 'register' | 'assessment' | 'report' | 'resume' | 'favorite' | 'interview';
  title: string;
  description: string;
  date: string;
}

interface GrowthTimelineProps {
  milestones: Milestone[];
  isLoading?: boolean;
}

const typeConfig = {
  register: { icon: Sparkles, color: '#165DFF', bgColor: 'bg-blue-100' },
  assessment: { icon: Brain, color: '#165DFF', bgColor: 'bg-blue-100' },
  report: { icon: FileText, color: '#165DFF', bgColor: 'bg-green-100' },
  resume: { icon: FileSearch, color: '#F59E0B', bgColor: 'bg-amber-100' },
  favorite: { icon: Heart, color: '#EF4444', bgColor: 'bg-red-100' },
  interview: { icon: Mic, color: '#165DFF', bgColor: 'bg-blue-100' }
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}月${day}日`;
}

export default function GrowthTimeline({ milestones, isLoading = false }: GrowthTimelineProps) {
  const displayMilestones = milestones.slice(0, 10);

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="text-xl">📅</span>
            成长里程碑
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="animate-pulse bg-gray-200 h-12 rounded"></div>
            <div className="animate-pulse bg-gray-200 h-12 rounded"></div>
            <div className="animate-pulse bg-gray-200 h-12 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (displayMilestones.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="text-xl">📅</span>
            成长里程碑
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-4">
            <Sparkles className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-gray-500">更多精彩，等你探索 ✨</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="text-xl">📅</span>
          成长里程碑
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
          
          <div className="space-y-4">
            {displayMilestones.map((milestone) => {
              const config = typeConfig[milestone.type];
              const IconComponent = config.icon;
              
              return (
                <div key={milestone.id} className="relative flex gap-4">
                  <div className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full" style={{ backgroundColor: config.bgColor }}>
                    <IconComponent className="w-4 h-4" style={{ color: config.color }} />
                  </div>
                  
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{formatDate(milestone.date)}</span>
                    </div>
                    <h4 className="font-medium text-gray-800 mt-1">{milestone.title}</h4>
                    <p className="text-sm text-gray-500 mt-0.5">{milestone.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}