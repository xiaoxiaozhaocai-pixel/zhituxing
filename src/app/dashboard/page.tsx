'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Award, TrendingUp, Briefcase, Clock, FileText, Star } from 'lucide-react';

interface DashboardUser {
  name: string; school: string; major: string;
  graduation_year: string; phone: string; email: string; avatar_url: string;
}

interface ResumeScoreLatest {
  overall_score: number; dimensions: any[]; improvements: any[];
  radar_data: any; summary: string; target_job: string; created_at: string;
}

interface ResumeScoreHistoryItem {
  id: string; overall_score: number; created_at: string; target_job: string;
}

interface InterviewItem {
  id: string; created_at: string; target_job: string;
  overall_score: number | null; result_data: any;
}

interface RecommendedJob {
  id: string; title: string; company: string; city: string;
  industry: string; salary_range: string; education: string; experience: string;
}

interface ActivityItem {
  type: string; title: string; time: string;
}

interface DashboardData {
  user: DashboardUser;
  resume_score: { latest: ResumeScoreLatest | null; history: ResumeScoreHistoryItem[] };
  interviews: InterviewItem[];
  recommended_jobs: RecommendedJob[];
  recent_activity: ActivityItem[];
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const month = d.toLocaleDateString('zh-CN', { month: 'short' });
  const day = d.getDate();
  const hour = d.getHours().toString().padStart(2, '0');
  const min = d.getMinutes().toString().padStart(2, '0');
  return `${month}${day}日 ${hour}:${min}`;
}

function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const month = d.toLocaleDateString('zh-CN', { month: 'short' });
  return `${month}${d.getDate()}日`;
}

/* ─── Loading Skeleton ─── */
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-[#E2E8F0] rounded-lg ${className || ''}`} />;
}

/* ─── User Profile Card ─── */
function UserCard({ user }: { user: DashboardUser }) {
  return (
    <Card className="bg-white border-[#E2E8F0] shadow-sm overflow-hidden">
      <div className="h-24 bg-gradient-to-r from-[#165DFF] to-[#3D7FFF]/70" />
      <CardContent className="relative px-5 pb-5">
        <div className="flex items-end -mt-12 mb-4">
          <div className="w-20 h-20 rounded-2xl bg-white shadow-md flex items-center justify-center border-2 border-white">
            <User className="w-8 h-8 text-[#165DFF]" />
          </div>
          <div className="ml-3 pb-1">
            <h2 className="text-lg font-bold text-[#1E293B]">{user.name || '未命名'}</h2>
            <p className="text-sm text-[#64748B]">{user.school}{user.major ? ` · ${user.major}` : ''}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm text-[#64748B]">
          {user.graduation_year && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{user.graduation_year}届</span>
            </div>
          )}
          {user.email && (
            <div className="flex items-center gap-1.5 truncate">
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{user.email}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Score Radar Chart ─── */
function ScoreRadarCard({ latest }: { latest: ResumeScoreLatest }) {
  const radarSource = latest.radar_data || latest.dimensions || [];
  const radarData = Array.isArray(radarSource)
    ? radarSource.map((d: any) => ({
        name: d.name || d.dimension || '',
        value: typeof d.score === 'number' ? d.score : typeof d.value === 'number' ? d.value : 0,
      }))
    : Object.entries(radarSource).map(([k, v]) => ({
        name: k,
        value: typeof v === 'number' ? v : 0,
      }));

  if (radarData.length === 0) {
    return (
      <Card className="bg-white border-[#E2E8F0] shadow-sm">
        <CardHeader><CardTitle className="text-base text-[#1E293B]">综合评分</CardTitle></CardHeader>
        <CardContent className="text-center py-8 text-[#94A3B8]">暂无评分数据</CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-[#E2E8F0] shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-[#1E293B]">综合评分</CardTitle>
          <span className="text-2xl font-bold text-[#165DFF]">{latest.overall_score}<span className="text-sm text-[#94A3B8]">分</span></span>
        </div>
        {latest.target_job && (
          <p className="text-xs text-[#64748B] -mt-1">目标岗位：{latest.target_job}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="#E2E8F0" />
              <PolarAngleAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar name="评分" dataKey="value" stroke="#165DFF" fill="#165DFF" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        {latest.summary && (
          <p className="text-sm text-[#64748B] mt-3 leading-relaxed">{latest.summary}</p>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Score Trend ─── */
function ScoreTrendCard({ history }: { history: ResumeScoreHistoryItem[] }) {
  if (history.length < 2) {
    return (
      <Card className="bg-white border-[#E2E8F0] shadow-sm">
        <CardHeader><CardTitle className="text-base text-[#1E293B]">评分趋势</CardTitle></CardHeader>
        <CardContent className="text-center py-8 text-[#94A3B8]">
          {history.length === 1 ? '只有一次评分，多做几次才能看到趋势' : '暂无评分历史'}
        </CardContent>
      </Card>
    );
  }

  const chartData = [...history].reverse().map((h) => ({
    label: formatShortDate(h.created_at),
    score: h.overall_score,
  }));

  return (
    <Card className="bg-white border-[#E2E8F0] shadow-sm">
      <CardHeader><CardTitle className="text-base text-[#1E293B]">评分趋势</CardTitle></CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94A3B8' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94A3B8' }} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="score" name="评分" stroke="#165DFF" strokeWidth={2} dot={{ r: 4, fill: '#165DFF' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Interview Card ─── */
function InterviewCard({ interview }: { interview: InterviewItem }) {
  const score = interview.overall_score;
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#F1F5F9] last:border-0">
      <div>
        <p className="text-sm font-medium text-[#1E293B]">{interview.target_job || '模拟面试'}</p>
        <p className="text-xs text-[#94A3B8] mt-0.5">{formatDate(interview.created_at)}</p>
      </div>
      {score != null && (
        <span className={`text-sm font-semibold ${score >= 70 ? 'text-green-600' : score >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
          {score}分
        </span>
      )}
    </div>
  );
}

/* ─── main page ─── */
export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/dashboard');
      const json = await res.json();
      if (json.success) setData(json.data);
      else setError(json.error || '加载失败');
    } catch (err) {
      setError('网络请求失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-[#64748B]">{error}</p>
        <Button onClick={loadData} className="mt-4 btn-gradient rounded-xl">重新加载</Button>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-20 text-[#64748B]">暂无数据</div>;
  }

  const { user, resume_score, interviews, recommended_jobs, recent_activity } = data;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-[#1E293B]">我的求职档案</h1>
        <p className="text-[#64748B] text-sm mt-1">一站式查看你的求职进度与推荐</p>
      </div>

      {/* 用户信息 */}
      <UserCard user={user} />

      {/* 简历评分 + 趋势 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {resume_score.latest ? (
          <>
            <ScoreRadarCard latest={resume_score.latest} />
            <ScoreTrendCard history={resume_score.history} />
          </>
        ) : (
          <Card className="bg-white border-[#E2E8F0] shadow-sm lg:col-span-2">
            <CardContent className="py-10 text-center">
              <Award className="w-12 h-12 mx-auto text-[#CBD5E1] mb-3" />
              <p className="text-[#64748B] mb-1">还没有简历评分</p>
              <p className="text-sm text-[#94A3B8] mb-4">完善简历后可获得AI评分与优化建议</p>
              <Link href="/resume-optimize">
                <Button className="btn-gradient rounded-xl">去完善简历</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 推荐岗位 + 模拟面试 + 活动 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 推荐岗位 */}
        <Card className="bg-white border-[#E2E8F0] shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-[#1E293B] flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[#165DFF]" />
              推荐岗位
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recommended_jobs.length === 0 ? (
              <p className="text-sm text-[#94A3B8] text-center py-6">暂无推荐</p>
            ) : (
              <div className="space-y-3">
                {recommended_jobs.slice(0, 5).map((job) => (
                  <Link key={job.id} href={`/jobs/${job.id}`} className="block p-3 rounded-xl hover:bg-[#F8FAFC] transition-colors border border-transparent hover:border-[#E2E8F0]">
                    <p className="text-sm font-medium text-[#1E293B]">{job.title}</p>
                    <p className="text-xs text-[#64748B] mt-0.5">{job.company}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[#94A3B8]">
                      {job.city && <span>{job.city}</span>}
                      {job.salary_range && <span>{job.salary_range}</span>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 模拟面试 */}
        <Card className="bg-white border-[#E2E8F0] shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-[#1E293B] flex items-center gap-2">
              <Star className="w-4 h-4 text-[#165DFF]" />
              模拟面试
            </CardTitle>
          </CardHeader>
          <CardContent>
            {interviews.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-[#94A3B8] mb-3">还没有模拟面试记录</p>
                <Link href="/assistant?bot=interview">
                  <Button variant="outline" className="rounded-xl text-xs">开始模拟面试</Button>
                </Link>
              </div>
            ) : (
              <div>
                {interviews.slice(0, 3).map((iv) => (
                  <InterviewCard key={iv.id} interview={iv} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 活动时间线 */}
        <Card className="bg-white border-[#E2E8F0] shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-[#1E293B] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#165DFF]" />
              最近动态
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recent_activity.length === 0 ? (
              <p className="text-sm text-[#94A3B8] text-center py-6">暂无动态</p>
            ) : (
              <div className="relative">
                <div className="absolute left-2 top-1 bottom-1 w-px bg-[#E2E8F0]" />
                <div className="space-y-4">
                  {recent_activity.map((act, i) => (
                    <div key={i} className="flex items-start gap-3 pl-7 relative">
                      <div className={`absolute left-1.5 top-1.5 w-2 h-2 rounded-full border-2 border-white ${
                        act.type === 'resume_score' ? 'bg-[#165DFF]' : 'bg-[#3D7FFF]'
                      }`} />
                      <div>
                        <p className="text-sm text-[#1E293B]">{act.title}</p>
                        <p className="text-[10px] text-[#94A3B8] mt-0.5">{formatDate(act.time)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
