'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Briefcase } from 'lucide-react';

export default function NewJobPostPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 表单状态
  const [jobTitle, setJobTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hardSkillsInput, setHardSkillsInput] = useState('');
  const [softSkillsInput, setSoftSkillsInput] = useState('');
  const [targetGrade, setTargetGrade] = useState('');
  const [targetMajor, setTargetMajor] = useState('');
  const [targetSchool, setTargetSchool] = useState('');
  const [citiesInput, setCitiesInput] = useState('');
  const [targetIndustry, setTargetIndustry] = useState('');
  const [minCompleteness, setMinCompleteness] = useState(0);
  const [minAssessment, setMinAssessment] = useState(0);
  const [hasInternshipRequired, setHasInternshipRequired] = useState('any');
  const [graduationYear, setGraduationYear] = useState('');
  const [autoPush, setAutoPush] = useState(false);
  const [pushFrequency, setPushFrequency] = useState('weekly');

  const parseTags = (input: string): string[] =>
    input
      .split(/[,，\n]/)
      .map((s) => s.trim())
      .filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!jobTitle.trim()) {
      setError('请输入岗位名称');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/employer/job-posts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_title: jobTitle.trim(),
          description: description.trim() || null,
          required_hard_skills: parseTags(hardSkillsInput),
          required_soft_skills: parseTags(softSkillsInput),
          target_grade: targetGrade || null,
          target_major: targetMajor.trim() || null,
          target_school: targetSchool.trim() || null,
          target_cities: parseTags(citiesInput),
          target_industry: targetIndustry.trim() || null,
          min_completeness: minCompleteness,
          min_assessment: minAssessment,
          has_internship_required: hasInternshipRequired,
          graduation_year: graduationYear.trim() || null,
          auto_push: autoPush,
          push_frequency: pushFrequency,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || '创建失败');
        setSubmitting(false);
        return;
      }

      router.push(`/employer/jobs/${data.data.id}`);
    } catch {
      setError('网络错误，请重试');
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#165DFF]/20 focus:border-[#165DFF] transition bg-white';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';
  const sliderClass = 'w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#165DFF]';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 返回 */}
      <button
        onClick={() => router.push('/employer/jobs')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#165DFF] transition"
      >
        <ArrowLeft className="w-4 h-4" />
        返回岗位列表
      </button>

      {/* 标题 */}
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#165DFF] to-[#3D7FFF] flex items-center justify-center shadow-md shadow-[#165DFF]/20">
          <Briefcase className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">创建新岗位</h1>
          <p className="text-sm text-gray-500">填写岗位信息与匹配条件，系统将自动匹配候选人</p>
        </div>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本信息 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-900">基本信息</h2>

          <div>
            <label className={labelClass}>岗位名称 <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="例如：前端开发实习生"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>岗位描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="描述岗位职责、要求等"
              rows={3}
              className={inputClass + ' resize-none'}
            />
          </div>
        </div>

        {/* 技能要求 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-900">技能要求</h2>

          <div>
            <label className={labelClass}>必需硬技能</label>
            <input
              type="text"
              value={hardSkillsInput}
              onChange={(e) => setHardSkillsInput(e.target.value)}
              placeholder="Python, Java, React（逗号分隔）"
              className={inputClass}
            />
            <p className="text-xs text-gray-400 mt-1">输入技能名称，用逗号分隔</p>
          </div>

          <div>
            <label className={labelClass}>必需软技能</label>
            <input
              type="text"
              value={softSkillsInput}
              onChange={(e) => setSoftSkillsInput(e.target.value)}
              placeholder="沟通能力, 团队协作（逗号分隔）"
              className={inputClass}
            />
            <p className="text-xs text-gray-400 mt-1">输入技能名称，用逗号分隔</p>
          </div>
        </div>

        {/* 筛选条件 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-900">筛选条件</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>目标年级</label>
              <select
                value={targetGrade}
                onChange={(e) => setTargetGrade(e.target.value)}
                className={inputClass}
              >
                <option value="">不限</option>
                <option value="大一">大一</option>
                <option value="大二">大二</option>
                <option value="大三">大三</option>
                <option value="大四">大四</option>
                <option value="研一">研一</option>
                <option value="研二">研二</option>
                <option value="研三">研三</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>目标专业</label>
              <input
                type="text"
                value={targetMajor}
                onChange={(e) => setTargetMajor(e.target.value)}
                placeholder="计算机科学与技术"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>目标学校</label>
              <input
                type="text"
                value={targetSchool}
                onChange={(e) => setTargetSchool(e.target.value)}
                placeholder="桂林电子科技大学"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>目标行业</label>
              <input
                type="text"
                value={targetIndustry}
                onChange={(e) => setTargetIndustry(e.target.value)}
                placeholder="互联网/科技"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>目标城市</label>
              <input
                type="text"
                value={citiesInput}
                onChange={(e) => setCitiesInput(e.target.value)}
                placeholder="深圳, 广州（逗号分隔）"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>毕业年份</label>
              <input
                type="text"
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                placeholder="2027"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>实习经历要求</label>
              <select
                value={hasInternshipRequired}
                onChange={(e) => setHasInternshipRequired(e.target.value)}
                className={inputClass}
              >
                <option value="any">不限</option>
                <option value="yes">必须有实习</option>
                <option value="no">无要求</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>
              最低画像完整度：{minCompleteness}%
            </label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={minCompleteness}
              onChange={(e) => setMinCompleteness(Number(e.target.value))}
              className={sliderClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              最低测评分：{minAssessment}%
            </label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={minAssessment}
              onChange={(e) => setMinAssessment(Number(e.target.value))}
              className={sliderClass}
            />
          </div>
        </div>

        {/* 自动推送 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-900">自动推送设置</h2>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">启用自动推送</p>
              <p className="text-xs text-gray-400">定期将新匹配的候选人推送给您</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoPush}
                onChange={(e) => setAutoPush(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-[#165DFF] transition"></div>
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                autoPush ? 'translate-x-4' : ''
              }`}></div>
            </label>
          </div>

          {autoPush && (
            <div>
              <label className={labelClass}>推送频率</label>
              <select
                value={pushFrequency}
                onChange={(e) => setPushFrequency(e.target.value)}
                className={inputClass}
              >
                <option value="daily">每天</option>
                <option value="weekly">每周</option>
              </select>
            </div>
          )}
        </div>

        {/* 提交 */}
        <div className="flex justify-end gap-3 pb-8">
          <button
            type="button"
            onClick={() => router.push('/employer/jobs')}
            className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-1.5 px-5 py-2 text-sm text-white bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] rounded-lg hover:opacity-90 transition disabled:opacity-50 shadow-md shadow-[#165DFF]/20"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                创建中...
              </>
            ) : (
              '创建岗位'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
