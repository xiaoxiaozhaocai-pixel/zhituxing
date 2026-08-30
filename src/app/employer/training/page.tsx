'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2, Plus, GraduationCap, Clock, Target, BookOpen, X, Sparkles,
} from 'lucide-react';

interface TrainingTrack {
  id: number;
  employer_id: string;
  title: string;
  description: string | null;
  target_skills: string[] | null;
  target_grades: string[] | null;
  duration_weeks: number | null;
  stages: unknown[] | null;
  created_at: string;
  updated_at: string;
}

interface TrackStage {
  name: string;
}

interface TrackStudent {
  user_id: string;
  status: string;
  stage_progress: number | null;
  created_at: string;
  nickname: string;
  grade: string | null;
  major: string | null;
  portrait_completeness_score: number | null;
}

interface TrackDetail {
  track: { id: number; title: string; stages: unknown[] | null };
  students: TrackStudent[];
}

export default function TrainingPage() {
  const router = useRouter();
  const [tracks, setTracks] = useState<TrainingTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [detail, setDetail] = useState<TrackDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const fetchTracks = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/employer/training-tracks', { credentials: 'include' });
      if (r.status === 404 || r.status === 401) {
        router.push('/employer/auth/login');
        return;
      }
      const j = await r.json();
      if (j.success) setTracks(j.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  const viewTrack = useCallback(
    async (track: TrainingTrack) => {
      setDetail(null);
      setDetailLoading(true);
      setDetailError('');
      try {
        const r = await fetch(`/api/employer/training-tracks/${track.id}/students`, { credentials: 'include' });
        if (r.status === 404 || r.status === 401) {
          setDetailError('通道不存在或已无权限');
          setDetailLoading(false);
          return;
        }
        const j = await r.json();
        if (j.success) setDetail(j.data);
        else setDetailError(j.error || '加载失败');
      } catch {
        setDetailError('网络错误');
      } finally {
        setDetailLoading(false);
      }
    },
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#165DFF]" />
            定制培养通道
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            创建专属培养计划，定向邀请候选人参与
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] text-white text-sm font-medium rounded-lg shadow-md shadow-[#165DFF]/20 hover:opacity-90 transition flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          创建培养通道
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">
          <Loader2 className="w-8 h-8 mx-auto animate-spin mb-2" />
          加载中...
        </div>
      ) : tracks.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full bg-[#165DFF]/10 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-[#165DFF]/60" />
          </div>
          <div className="text-gray-500 mb-1">暂无培养通道</div>
          <p className="text-sm text-gray-400">点击上方按钮创建你的第一个培养通道</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tracks.map((t) => (
            <div
              key={t.id}
              className="bg-white/90 backdrop-blur-sm border border-gray-100 rounded-xl p-5 hover:border-[#165DFF]/30 hover:shadow-lg hover:shadow-[#165DFF]/5 transition hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900">{t.title}</h3>
                <Sparkles className="w-4 h-4 text-[#165DFF]/60" />
              </div>
              {t.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{t.description}</p>
              )}
              <div className="space-y-2 text-xs text-gray-500">
                {t.target_skills && t.target_skills.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" />
                    <span>{t.target_skills.slice(0, 4).join('、')}</span>
                    {t.target_skills.length > 4 && <span>+{t.target_skills.length - 4}</span>}
                  </div>
                )}
                {t.target_grades && t.target_grades.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>{t.target_grades.join('、')}</span>
                  </div>
                )}
                {t.duration_weeks && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{t.duration_weeks} 周</span>
                  </div>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  创建于 {new Date(t.created_at).toLocaleDateString('zh-CN')}
                </span>
                <button
                  onClick={() => viewTrack(t)}
                  className="text-xs font-medium text-[#165DFF] hover:opacity-80 transition flex items-center gap-1"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  查看进度
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateTrackDialog
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            fetchTracks();
          }}
        />
      )}

      {(detail || detailLoading) && (
        <TrackDetailDialog
          loading={detailLoading}
          error={detailError}
          detail={detail}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}

function CreateTrackDialog({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetSkills, setTargetSkills] = useState('');
  const [targetGrades, setTargetGrades] = useState('');
  const [durationWeeks, setDurationWeeks] = useState('');
  const [stages, setStages] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!title.trim()) {
      setError('请输入培养通道标题');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/employer/training-tracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          target_skills: targetSkills ? targetSkills.split(/[,，、]/).map((s) => s.trim()).filter(Boolean) : undefined,
          target_grades: targetGrades ? targetGrades.split(/[,，、]/).map((s) => s.trim()).filter(Boolean) : undefined,
          duration_weeks: durationWeeks ? parseInt(durationWeeks, 10) : undefined,
          stages: stages ? stages.split('\n').filter(Boolean).map((s) => ({ name: s.trim() })) : undefined,
        }),
      });
      const j = await r.json();
      if (j.success) {
        onSuccess();
      } else {
        setError(j.error || '创建失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#165DFF]" />
            创建培养通道
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {/* 标题 */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              通道标题 <span className="text-red-500">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例：2026秋季Java开发训练营"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#165DFF] outline-none"
            />
          </div>

          {/* 描述 */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="培养通道的简要介绍..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#165DFF] outline-none resize-none"
            />
          </div>

          {/* 目标技能 */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              目标技能（用逗号分隔）
            </label>
            <input
              value={targetSkills}
              onChange={(e) => setTargetSkills(e.target.value)}
              placeholder="Java、Spring Boot、MySQL"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#165DFF] outline-none"
            />
          </div>

          {/* 目标年级 */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              目标年级（用逗号分隔）
            </label>
            <input
              value={targetGrades}
              onChange={(e) => setTargetGrades(e.target.value)}
              placeholder="大三、大四"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#165DFF] outline-none"
            />
          </div>

          {/* 持续周数 */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">持续周数</label>
            <input
              type="number"
              value={durationWeeks}
              onChange={(e) => setDurationWeeks(e.target.value)}
              placeholder="例：12"
              min={1}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#165DFF] outline-none"
            />
          </div>

          {/* 阶段安排 */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              阶段安排（每行一个阶段）
            </label>
            <textarea
              value={stages}
              onChange={(e) => setStages(e.target.value)}
              placeholder="基础技能培训&#10;项目实战&#10;面试辅导&#10;实习推荐"
              rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#165DFF] outline-none resize-none"
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
          )}

          {/* 操作 */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleCreate}
              disabled={loading || !title.trim()}
              className="flex-1 py-2 bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] text-white rounded-lg shadow-md shadow-[#165DFF]/20 hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-1.5"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              创建
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
// 状态徽章映射
function statusBadge(status: string): { label: string; cls: string } {
  switch (status) {
    case 'invited':
      return { label: '已邀请', cls: 'bg-blue-50 text-blue-600' };
    case 'accepted':
      return { label: '已接受', cls: 'bg-emerald-50 text-emerald-600' };
    case 'active':
    case 'learning':
      return { label: '进行中', cls: 'bg-indigo-50 text-indigo-600' };
    case 'completed':
      return { label: '已完成', cls: 'bg-green-50 text-green-600' };
    default:
      return { label: status || '待确认', cls: 'bg-gray-100 text-gray-500' };
  }
}

// 计算阶段进度百分比（stage_progress 为已完成阶段数 / 总阶段数）
function stageProgressPct(detail: TrackDetail, student: TrackStudent): number {
  const stages = (detail.track.stages || []) as TrackStage[];
  const total = stages.length;
  if (total <= 0) return 0;
  const done = student.stage_progress ?? 0;
  return Math.min(100, Math.round((done / total) * 100));
}

function TrackDetailDialog({
  loading,
  error,
  detail,
  onClose,
}: {
  loading: boolean;
  error: string;
  detail: TrackDetail | null;
  onClose: () => void;
}) {
  const stages = (detail?.track.stages || []) as TrackStage[];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-[#165DFF]" />
            {detail?.track.title || '培养通道进度'}
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* 阶段安排 */}
          {stages.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">阶段安排</h4>
              <div className="flex flex-wrap gap-2">
                {stages.map((s, i) => (
                  <span
                    key={i}
                    className="text-xs px-2.5 py-1 rounded-full bg-[#165DFF]/5 text-[#165DFF] border border-[#165DFF]/10"
                  >
                    {i + 1}. {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 学生进度 */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">已加入候选人（{detail?.students.length ?? 0}）</h4>
            {loading ? (
              <div className="text-center py-10 text-gray-400">
                <Loader2 className="w-6 h-6 mx-auto animate-spin mb-2" />
                加载中...
              </div>
            ) : error ? (
              <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
            ) : !detail || detail.students.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <div className="w-12 h-12 rounded-full bg-[#165DFF]/10 flex items-center justify-center mx-auto mb-3">
                  <GraduationCap className="w-6 h-6 text-[#165DFF]/60" />
                </div>
                <div className="text-sm text-gray-500">暂无候选人加入</div>
              </div>
            ) : (
              <ul className="space-y-3">
                {detail.students.map((s) => {
                  const badge = statusBadge(s.status);
                  const pct = stageProgressPct(detail, s);
                  return (
                    <li key={s.user_id} className="border border-gray-100 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{s.nickname}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                        </div>
                        <span className="text-xs text-gray-400">{pct}%</span>
                      </div>
                      {(s.grade || s.major) && (
                        <p className="text-xs text-gray-500 mb-2">
                          {[s.grade, s.major].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}