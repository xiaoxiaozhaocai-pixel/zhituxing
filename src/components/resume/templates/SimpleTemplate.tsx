'use client';

import { ResumeSections } from '@/types/resume-sections';

interface Props {
  sections: ResumeSections;
  scale?: number;
}

/**
 * 简约风格模板 - 简洁干净，黑白为主，蓝色点缀
 */
export function SimpleTemplate({ sections, scale = 1 }: Props) {
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
      {/* 头部 */}
      {personal.name && (
        <div className="text-center border-b border-[#E2E8F0] pb-4 mb-4">
          <h1 className="text-2xl font-bold tracking-wide">{personal.name}</h1>
          <p className="text-sm text-[#64748B] mt-1 space-x-2">
            {[personal.email, personal.phone, personal.city].filter(Boolean).map((v, i) => (
              <span key={i}>{v}{i < [personal.email, personal.phone, personal.city].filter(Boolean).length - 1 ? ' | ' : ''}</span>
            ))}
          </p>
          {personal.birth && <p className="text-xs text-[#94A3B8] mt-1">{personal.birth}{personal.political ? ` · ${personal.political}` : ''}</p>}
        </div>
      )}

      {/* 教育背景 */}
      {education.length > 0 && (
        <Section title="教育背景">
          {education.map((edu) => (
            <div key={edu.id} className="mb-2">
              <div className="flex justify-between items-baseline">
                <span className="font-semibold text-sm">{edu.school}</span>
                <span className="text-xs text-[#94A3B8]">{edu.start} - {edu.end}</span>
              </div>
              <p className="text-sm text-[#475569]">{edu.major} · {edu.degree}{edu.gpa ? ` · GPA ${edu.gpa}` : ''}</p>
            </div>
          ))}
        </Section>
      )}

      {/* 实习/工作经历 */}
      {experience.length > 0 && (
        <Section title="实习经历">
          {experience.map((exp) => (
            <div key={exp.id} className="mb-3">
              <div className="flex justify-between items-baseline">
                <span className="font-semibold text-sm">{exp.company}</span>
                <span className="text-xs text-[#94A3B8]">{exp.start} - {exp.end}</span>
              </div>
              <p className="text-sm text-[#1E293B]">{exp.position}</p>
              {exp.description && <p className="text-sm text-[#475569] mt-1 whitespace-pre-wrap">{exp.description}</p>}
            </div>
          ))}
        </Section>
      )}

      {/* 项目经历 */}
      {projects.length > 0 && (
        <Section title="项目经历">
          {projects.map((proj) => (
            <div key={proj.id} className="mb-3">
              <div className="flex justify-between items-baseline">
                <span className="font-semibold text-sm">{proj.name}</span>
                <span className="text-xs text-[#94A3B8]">{proj.start} - {proj.end}</span>
              </div>
              <p className="text-sm text-[#1E293B]">{proj.role}</p>
              {proj.description && <p className="text-sm text-[#475569] mt-1 whitespace-pre-wrap">{proj.description}</p>}
            </div>
          ))}
        </Section>
      )}

      {/* 技能证书 */}
      {(skills.length > 0 || certificates.length > 0) && (
        <Section title="技能证书">
          {skills.map((sk) => (
            <div key={sk.id} className="mb-1 text-sm">
              <span className="font-medium">{sk.category}</span>
              {sk.items.length > 0 && <span className="text-[#475569]">：{sk.items.join('、')}</span>}
            </div>
          ))}
          {certificates.length > 0 && (
            <div className="mt-2">
              {certificates.map((cert) => (
                <div key={cert.id} className="text-sm text-[#475569] flex justify-between">
                  <span>{cert.name}</span>
                  <span className="text-xs text-[#94A3B8]">{cert.date}</span>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* 自我评价 */}
      {selfEval && (
        <Section title="自我评价">
          <p className="text-sm text-[#475569] leading-relaxed whitespace-pre-wrap">{selfEval}</p>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-bold uppercase tracking-wider border-b-2 border-[#165DFF] pb-1 mb-2 text-[#165DFF]">
        {title}
      </h3>
      {children}
    </div>
  );
}
