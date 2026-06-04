// 简历分区数据类型定义

export interface PersonalInfo {
  name: string;
  phone: string;
  email: string;
  city: string;
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
  startDate: string;
  endDate: string;
  gpa?: string;
  highlights?: string;
}

export interface ExperienceEntry {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  description: string;
  highlights: string[];
}

export interface ProjectEntry {
  id: string;
  name: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
  highlights: string[];
  techStack?: string[];
}

export interface SkillEntry {
  id: string;
  name: string;
  level: '初级' | '中级' | '高级' | '精通';
  category: string;
}

export interface CertificateEntry {
  id: string;
  name: string;
  issuingAuthority: string;
  date: string;
}

export interface ResumeSections {
  personal: PersonalInfo;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  skills: SkillEntry[];
  certificates: CertificateEntry[];
  selfEval: string;
}

export type SectionKey = keyof ResumeSections;

export type TemplateId = 'simple' | 'classic' | 'modern';

export const DEFAULT_SECTIONS: ResumeSections = {
  personal: {
    name: '',
    phone: '',
    email: '',
    city: '',
    targetPosition: '',
    targetIndustry: '',
    targetSalary: '',
  },
  education: [],
  experience: [],
  projects: [],
  skills: [],
  certificates: [],
  selfEval: '',
};
