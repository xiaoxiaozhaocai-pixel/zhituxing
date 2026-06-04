'use client';

import { ResumeSections } from '@/types/resume-sections';

interface Props {
  sections: ResumeSections;
  scale?: number;
}

/**
 * 经典风格模板 - 左右分栏，左栏深色个人信息区，右栏内容区
 */
export function ClassicTemplate({ sections, scale = 1 }: Props) {
  const { personal, education, experience, projects, skills, certificates, selfEval } = sections;
  const hasContent = personal.name || education.length > 0 || experience.length > 0;

  if (!hasContent) {
    return (
      <div className="flex items-center justify-center h-full text-[#94A3B8] text-sm">
        在左侧填写内容，预览将在此展示
      </div>
    );
  }

  return (
    <div className="flex bg-white text-[#1E293B]" style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
      {/* 左侧个人信息栏 */}
      <div className="w-[35%] bg-[#1E3A8A] text-white p-5 shrink-0">
        {/* 头像区域 */}
        {personal.avatar && (
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-[#3B82F6]/30 flex items-center justify-center text-2xl font-bold">
              {personal.name?.charAt(0) || '?'}
            </div>
          </div>
        )}

        {/* 姓名 */}
        {personal.name && (
          <h1 className="text-xl font-bold text-center mb-4">{personal.name}</h1>
        )}

        {/* 联系方式 */}
        <div className="space-y-2 text-sm">
          <h3 className="font-semibold uppercase tracking-wider border-b border-white/30 pb-1 mb-3 text-xs">联系方式</h3>
          {personal.email && <InfoRow label="邮箱" value={personal.email} dark />}
          {personal.phone && <InfoRow label="电话" value={personal.phone} dark />}
          {personal.city && <InfoRow label="城市" value={personal.city} dark />}
          {personal.birth && <InfoRow label="出生" value={personal.birth} dark />}
          {personal.political && <InfoRow label="政治面貌" value={personal.political} dark />}
        </div>

        {/* 技能 */}
        {skills.length > 0 && (
          <div className="mt-6 space-y-2 text-sm">
            <h3 className="font-semibold uppercase tracking-wider border-b border-white/30 pb-1 mb-3 text-xs">专业技能</h3>
            {skills.map((sk) => (
              <div key={sk.id} className="mb-2">
                <p className="font-medium text-xs">{sk.category}</p>
                <p className="text-xs text-white/70">{sk.items.join('、')}</p>
              </div>
            ))}
          </div>
        )}

        {/* 证书 */}
        {certificates.length > 0 && (
          <div className="mt-6 space-y-1 text-sm">
            <h3 className="font-semibold uppercase tracking-wider border-b border-white/30 pb-1 mb-3 text-xs">证书</h3>
            {certificates.map((cert) => (
              <p key={cert.id} className="text-xs text-white/70">{cert.name}{cert.date ? ` (${cert.date})` : ''}</p>
            ))}
          </div>
        )}
      </div>

      {/* 右侧内容区 */}
      <div className="flex-1 p-5">
        {/* 教育背景 */}
        {education.length > 0 && (
          <ClassicSection title="教育背景">
            {education.map((edu) => (
              <div key={edu.id} className="mb-3 border-l-2 border-[#165DFF] pl-3">
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold text-sm">{edu.school}</span>
                  <span className="text-xs text-[#94A3B8]">{edu.start} - {edu.end}</span>
                </div>
                <p className="text-sm text-[#475569]">{edu.major} · {edu.degree}{edu.gpa ? ` · GPA ${edu.gpa}` : ''}</p>
              </div>
            ))}
          </ClassicSection>
        )}

        {/* 实习经历 */}
        {experience.length > 0 && (
          <ClassicSection title="实习经历">
            {experience.map((exp) => (
              <div key={exp.id} className="mb-3 border-l-2 border-[#165DFF] pl-3">
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold text-sm">{exp.company}</span>
                  <span className="text-xs text-[#94A3B8]">{exp.start} - {exp.end}</span>
                </div>
                <p className="text-sm text-[#1E293B] font-medium">{exp.position}</p>
                {exp.description && <p className="text-sm text-[#475569] mt-1 whitespace-pre-wrap">{exp.description}</p>}
              </div>
            ))}
          </ClassicSection>
        )}

        {/* 项目经历 */}
        {projects.length > 0 && (
          <ClassicSection title="项目经历">
            {projects.map((proj) => (
              <div key={proj.id} className="mb-3 border-l-2 border-[#165DFF] pl-3">
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold text-sm">{proj.name}</span>
                  <span className="text-xs text-[#94A3B8]">{proj.start} - {proj.end}</span>
                </div>
                <p className="text-sm text-[#1E293B]">{proj.role}</p>
                {proj.description && <p className="text-sm text-[#475569] mt-1 whitespace-pre-wrap">{proj.description}</p>}
              </div>
            ))}
          </ClassicSection>
        )}

        {/* 自我评价 */}
        {selfEval && (
          <ClassicSection title="自我评价">
            <p className="text-sm text-[#475569] leading-relaxed whitespace-pre-wrap">{selfEval}</p>
          </ClassicSection>
        )}
      </div>
    </div>
  );
}

function ClassicSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="text-sm font-bold text-[#1E3A8A] border-b-2 border-[#165DFF] pb-1 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function InfoRow({ label, value, dark }: { label: string; value: string; dark?: boolean }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className={`text-xs shrink-0 ${dark ? 'text-white/50' : 'text-[#94A3B8]'}`}>{label}：</span>
      <span className="text-xs">{value}</span>
    </div>
  );
}
