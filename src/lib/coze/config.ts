/**
 * Coze 配置模块
 * 根据 botType 返回对应智能体的 API 配置
 */

export function getWorkflowConfig(botType?: string): {
  apiUrl: string;
  projectId: string;
  token: string;
} | null {
  const configMap: Record<string, { urlKey: string; projectKey: string; tokenKey: string }> = {
    career:     { urlKey: 'COZE_CAREER_API_URL',     projectKey: 'COZE_CAREER_PROJECT_ID',     tokenKey: 'COZE_CAREER_API_TOKEN' },
    assessment: { urlKey: 'COZE_ASSESSMENT_API_URL',  projectKey: 'COZE_ASSESSMENT_PROJECT_ID', tokenKey: 'COZE_ASSESSMENT_API_TOKEN' },
    competency: { urlKey: 'COZE_COMPETENCY_API_URL',  projectKey: 'COZE_COMPETENCY_PROJECT_ID', tokenKey: 'COZE_COMPETENCY_API_TOKEN' },
    interview:  { urlKey: 'COZE_INTERVIEW_API_URL',   projectKey: 'COZE_INTERVIEW_PROJECT_ID',  tokenKey: 'COZE_INTERVIEW_API_TOKEN' },
    jobs:       { urlKey: 'COZE_JOBS_API_URL',        projectKey: 'COZE_JOBS_PROJECT_ID',       tokenKey: 'COZE_JOBS_API_TOKEN' },
    decision:   { urlKey: 'COZE_DECISION_API_URL',    projectKey: 'COZE_DECISION_PROJECT_ID',   tokenKey: 'COZE_DECISION_API_TOKEN' },
    skill_portrait: { urlKey: 'COZE_SKILL_PORTRAIT_API_URL', projectKey: 'COZE_SKILL_PORTRAIT_PROJECT_ID', tokenKey: 'COZE_SKILL_PORTRAIT_API_TOKEN' },
    xiaozhi:     { urlKey: 'COZE_XIAOZHI_API_URL',     projectKey: 'COZE_XIAOZHI_PROJECT_ID',     tokenKey: 'COZE_XIAOZHI_API_TOKEN' },
  };

  const config = configMap[botType || ''];
  if (!config) return null;

  const apiUrl = process.env[config.urlKey];
  const projectId = process.env[config.projectKey];
  const token = process.env[config.tokenKey];

  if (!apiUrl || !projectId || !token) return null;

  return { apiUrl, projectId, token };
}
