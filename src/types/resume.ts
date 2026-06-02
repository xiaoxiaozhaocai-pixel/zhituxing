// src/types/resume.ts
export interface ResumeBasicInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
  title: string;
  summary: string;
}
export interface ResumeEducation {
  id: string; school: string; major: string; degree: string;
  startDate: string; endDate: string; gpa?: string; description?: string;
}
export interface ResumeExperience {
  id: string; company: string; position: string;
  startDate: string; endDate: string; current: boolean;
  description: string; achievements: string[];
}
export interface ResumeProject {
  id: string; name: string; role: string;
  startDate: string; endDate: string;
  description: string; link?: string; technologies: string[];
}
export interface ResumeSkill {
  id: string; name: string;
  level: 'beginner'|'intermediate'|'advanced'|'expert';
  category: string;
}
export interface ResumeCertification {
  id: string; name: string; issuer: string; date: string; link?: string;
}
export interface Resume {
  basic: ResumeBasicInfo;
  education: ResumeEducation[];
  experience: ResumeExperience[];
  projects: ResumeProject[];
  skills: ResumeSkill[];
  certifications: ResumeCertification[];
}
export function createEmptyResume(): Resume {
  return { basic: { name:'', email:'', phone:'', location:'', title:'', summary:'' }, education:[], experience:[], projects:[], skills:[], certifications:[] };
}
export function uid(): string { return Math.random().toString(36).substring(2,10); }
export const SKILL_LEVEL_LABELS: Record<string,string> = { beginner:'入门', intermediate:'熟练', advanced:'精通', expert:'专家' };
export const DEGREE_OPTIONS = ['大专','本科','硕士','博士'];
