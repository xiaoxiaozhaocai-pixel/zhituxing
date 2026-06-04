// 简历分区数据类型定义

export interface PersonalInfo {
  name: string;
  phone: string;
  email: string;
  city: string;
  birth: string;
  political: string;
  targetPosition: string;
  targetIndustry: string;
  targetSalary: string;
  avatar?: string;
}

export interface EducationEntry {
  id: string;
  school: string;
  major: string;
  degree: string;
  start: string;
  end: string;
  gpa?: string;
  highlights?: string;
}

export interface ExperienceEntry {
  id: string;
  company: string;
  position: string;
  start: string;
  end: string;
  description: string;
  highlights: string[];
}

export interface ProjectEntry {
  id: string;
  name: string;
  role: string;
  start: string;
  end: string;
  description: string;
  highlights: string[];
  techStack?: string[];
}

export interface SkillEntry {
  id: string;
  category: string;
  items: string[];
}

export interface CertificateEntry {
  id: string;
  name: string;
  issuingAuthority?: string;
  date: string;
}

export interface ResumeSections {
  personal: PersonalInfo;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  skills: SkillEntry[];
  certificates: CertificateEntry[];
  skillsCertificates: { skills: SkillEntry[]; certificates: CertificateEntry[] };
  selfEval: string;
}

export type SectionKey = keyof ResumeSections;

export type TemplateId = 'simple' | 'classic' | 'modern';

export const uid = () => Math.random().toString(36).slice(2, 11);

export const DEGREE_OPTIONS = ['本科', '硕士', '博士', '专科', '高中'] as const;

export const SECTION_META: { key: SectionKey; label: string }[] = [
  { key: 'personal', label: '个人信息' },
  { key: 'education', label: '教育背景' },
  { key: 'experience', label: '实习经历' },
  { key: 'projects', label: '项目经历' },
  { key: 'skills', label: '专业技能' },
  { key: 'certificates', label: '证书荣誉' },
  { key: 'skillsCertificates', label: '技能证书' },
  { key: 'selfEval', label: '自我评价' },
];

export const TEMPLATE_OPTIONS: { value: TemplateId; label: string }[] = [
  { value: 'simple', label: '简洁模板' },
  { value: 'classic', label: '经典模板' },
  { value: 'modern', label: '现代模板' },
];

export function createEmptySections(): ResumeSections {
  return {
    personal: {
      name: '',
      phone: '',
      email: '',
      city: '',
      birth: '',
      political: '',
      targetPosition: '',
      targetIndustry: '',
      targetSalary: '',
    },
    education: [],
    experience: [],
    projects: [],
    skills: [],
    certificates: [],
    skillsCertificates: { skills: [], certificates: [] },
    selfEval: '',
  };
}

export const DEFAULT_SECTIONS = createEmptySections();
