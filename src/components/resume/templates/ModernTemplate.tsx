'use client';

import { ResumeSections } from '@/types/resume-sections';

interface Props {
  sections: ResumeSections;
  scale?: number;
}

/**
 * 现代风格模板 - 卡片式布局，大面积色块，圆角设计
 */
export function ModernTemplate({ sections, scale = 1 }: Props) {
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
    <div className="bg-white text-[#1E293B]" style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
      {/* 头部 - 蓝色渐变背景 */}
      {(personal.name || personal.email) && (
        <div className="bg-gradient-to-r from-[#165DFF] to-[#1E3A8A] text-white p-6 rounded-t-lg">
          <h1 className="text-2xl font-bold">{personal.name || '未命名'}</h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-white/80">
            {personal.email && <span>📧 {personal.email}</span>}
            {personal.phone && <span>📱 {personal.phone}</span>}
            {personal.city && <span>📍 {personal.city}</span>}
          </div>
          {personal.birth && (
            <p className="text-xs text-white/60 mt-1">{personal.birth}{personal.political ? ` · ${personal.political}` : ''}</p>
          )}
        </div>
      )}

      <div className="p-5 space-y-4">
        {/* 教育背景 */}
        {education.length > 0 && (
          <ModernCard title="🎓 教育背景" accentColor="#165DFF">
            {education.map((edu) => (
              <div key={edu.id} className="flex justify-between items-start py-2 border-b border-[#F1F5F9] last:border-0">
                <div>
                  <p className="font-semibold text-sm">{edu.school}</p>
                  <p className="text-sm text-[#64748B]">{edu.major} · {edu.degree}{edu.gpa ? ` · GPA ${edu.gpa}` : ''}</p>
                </div>
                <span className="text-xs text-[#94A3B8] bg-[#F8FAFC] px-2 py-0.5 rounded whitespace-nowrap">
                  {edu.start} - {edu.end}
                </span>
              </div>
            ))}
          </ModernCard>
        )}

        {/* 实习经历 */}
        {experience.length > 0 && (
          <ModernCard title="💼 实习经历" accentColor="#2563EB">
            {experience.map((exp) => (
              <div key={exp.id} className="py-2 border-b border-[#F1F5F9] last:border-0">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-semibold text-sm">{exp.company}</span>
                    <span className="text-sm text-[#64748B] ml-2">| {exp.position}</span>
                  </div>
                  <span className="text-xs text-[#94A3B8] bg-[#F8FAFC] px-2 py-0.5 rounded whitespace-nowrap">
                    {exp.start} - {exp.end}
                  </span>
                </div>
                {exp.description && (
                  <p className="text-sm text-[#475569] mt-1.5 leading-relaxed whitespace-pre-wrap">{exp.description}</p>
                )}
              </div>
            ))}
          </ModernCard>
        )}

        {/* 项目经历 */}
        {projects.length > 0 && (
          <ModernCard title="🚀 项目经历" accentColor="#3B82F6">
            {projects.map((proj) => (
              <div key={proj.id} className="py-2 border-b border-[#F1F5F9] last:border-0">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-semibold text-sm">{proj.name}</span>
                    {proj.role && <span className="text-sm text-[#64748B] ml-2">| {proj.role}</span>}
                  </div>
                  <span className="text-xs text-[#94A3B8] bg-[#F8FAFC] px-2 py-0.5 rounded whitespace-nowrap">
                    {proj.start} - {proj.end}
                  </span>
                </div>
                {proj.description && (
                  <p className="text-sm text-[#475569] mt-1.5 leading-relaxed whitespace-pre-wrap">{proj.description}</p>
                )}
              </div>
            ))}
          </ModernCard>
        )}

        {/* 技能 & 证书 */}
        {(skills.length > 0 || certificates.length > 0) && (
          <ModernCard title="🛠 技能证书" accentColor="#60A5FA">
            {skills.length > 0 && (
              <div className="mb-3">
                {skills.map((sk) => (
                  <div key={sk.id} className="mb-2">
                    <span className="text-sm font-medium bg-[#EFF6FF] text-[#1E3A8A] px-2 py-0.5 rounded">
                      {sk.category}
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {sk.items.map((item, idx) => (
                        <span key={idx} className="text-xs bg-[#F1F5F9] text-[#475569] px-2 py-0.5 rounded-full">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {certificates.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {certificates.map((cert) => (
                  <span key={cert.id} className="text-xs bg-[#EFF6FF] text-[#1E3A8A] px-2.5 py-1 rounded-full border border-[#BFDBFE]">
                    {cert.name}{cert.date ? ` (${cert.date})` : ''}
                  </span>
                ))}
              </div>
            )}
          </ModernCard>
        )}

        {/* 自我评价 */}
        {selfEval && (
          <ModernCard title="✨ 自我评价" accentColor="#818CF8">
            <p className="text-sm text-[#475569] leading-relaxed whitespace-pre-wrap">{selfEval}</p>
          </ModernCard>
        )}
      </div>
    </div>
  );
}

function ModernCard({ title, accentColor, children }: { title: string; accentColor: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[#E2E8F0] overflow-hidden">
      <div
        className="px-4 py-2 text-sm font-semibold text-white"
        style={{ backgroundColor: accentColor }}
      >
        {title}
      </div>
      <div className="px-4 py-3">
        {children}
      </div>
    </div>
  );
}
