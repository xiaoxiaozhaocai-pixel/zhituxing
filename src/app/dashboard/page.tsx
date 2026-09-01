'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import type { MatchGetItem } from '@/lib/api-contracts/match';
import { fetchJson } from './_components/shared';
import { OverviewSidebar } from './_components/overview-sidebar';
import { JobRecommendations } from './_components/job-recommendations';
import { AssessmentHistory, type AssessmentRecord } from './_components/assessment-history';
import { MyReports, type DashboardReport } from './_components/my-reports';
import { ResumeScoreCard, type ResumeScoreRecord } from './_components/resume-score-card';

interface MatchGetData {
  matches: MatchGetItem[];
  user_skills: string[];
  total: number;
}

function getDisplayName(user: unknown): string {
  if (!user || typeof user !== 'object') return '同学';
  const u = user as Record<string, unknown>;
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
  const name = meta.nickname ?? meta.name ?? meta.full_name ?? meta.user_name;
  if (typeof name === 'string' && name) return name;
  const email = u.email;
  if (typeof email === 'string' && email) return email.split('@')[0];
  return '同学';
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [favCount, setFavCount] = useState(0);
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [matches, setMatches] = useState<MatchGetItem[]>([]);
  const [reports, setReports] = useState<DashboardReport[]>([]);
  const [resumeScore, setResumeScore] = useState<ResumeScoreRecord | null>(null);

  const [favLoading, setFavLoading] = useState(true);
  const [assessLoading, setAssessLoading] = useState(true);
  const [matchLoading, setMatchLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(true);
  const [resumeScoreLoading, setResumeScoreLoading] = useState(true);

  const [assessError, setAssessError] = useState<string | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [resumeScoreError, setResumeScoreError] = useState<string | null>(null);

  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/dashboard');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const redirectToLogin = () => {
      if (!cancelled && !redirectedRef.current) {
        redirectedRef.current = true;
        router.push('/login?redirect=/dashboard');
      }
    };

    fetchJson<unknown[]>('/api/favorites').then(({ data, error }) => {
      if (cancelled) return;
      if (error === '未登录') return redirectToLogin();
      setFavCount(data?.length ?? 0);
      setFavLoading(false);
    });

    fetchJson<AssessmentRecord[]>('/api/assessment/history?limit=20').then(({ data, error }) => {
      if (cancelled) return;
      if (error === '未登录') return redirectToLogin();
      setAssessments(data ?? []);
      setAssessError(error);
      setAssessLoading(false);
    });

    fetchJson<MatchGetData>('/api/match?limit=10').then(({ data, error }) => {
      if (cancelled) return;
      if (error === '未登录') return redirectToLogin();
      setMatches(data?.matches ?? []);
      setMatchError(error);
      setMatchLoading(false);
    });

    fetchJson<{ list: DashboardReport[] }>('/api/career-planning/my-reports').then(({ data, error }) => {
      if (cancelled) return;
      if (error === '未登录') return redirectToLogin();
      setReports(data?.list ?? []);
      setReportError(error);
      setReportLoading(false);
    });

    fetchJson<{ records: ResumeScoreRecord[] }>('/api/resume/score/history?limit=1').then(({ data, error }) => {
      if (cancelled) return;
      if (error === '未登录') return redirectToLogin();
      setResumeScore(data?.records?.[0] ?? null);
      setResumeScoreError(error);
      setResumeScoreLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user, router]);

  if (authLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background:
            'linear-gradient(135deg, #f8fafd 0%, #ffffff 50%, rgba(240, 245, 255, 0.4) 100%)',
        }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-[#165DFF]/20 border-t-[#165DFF] rounded-full animate-spin" />
          <p className="text-sm text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const displayName = getDisplayName(user);

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background:
          'linear-gradient(135deg, #f8fafd 0%, #ffffff 50%, rgba(240, 245, 255, 0.4) 100%)',
      }}
    >
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#165DFF]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#3D7FFF]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] bg-clip-text text-transparent">
            我的求职仪表盘
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            你好，{displayName}！这里是你的求职全貌
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          <div className="lg:col-span-3">
            <OverviewSidebar
              stats={{
                fav: favCount,
                assess: assessments.length,
                report: reports.length,
              }}
              loading={{
                fav: favLoading,
                assess: assessLoading,
                report: reportLoading,
              }}
            />
          </div>

          <div className="lg:col-span-6">
            <JobRecommendations
              matches={matches}
              loading={matchLoading}
              error={matchError}
            />
          </div>

          <div className="lg:col-span-3 space-y-4">
            <ResumeScoreCard
              record={resumeScore}
              loading={resumeScoreLoading}
              error={resumeScoreError}
            />
            <AssessmentHistory
              assessments={assessments}
              loading={assessLoading}
              error={assessError}
            />
            <MyReports reports={reports} loading={reportLoading} error={reportError} />
          </div>
        </div>
      </div>
    </div>
  );
}
