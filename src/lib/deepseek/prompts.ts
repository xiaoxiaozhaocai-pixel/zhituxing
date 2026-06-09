/**
 * DeepSeek API — Prompt 模板
 */

/**
 * 增量摘要压缩 Prompt
 * 输入：旧摘要 + 新消息 → 输出：结构化 JSON 摘要 + 画像更新
 */
export function buildCompressionPrompt(
  oldSummary: string,
  messagesText: string,
): string {
  return `你是一个专业对话摘要生成器。请基于旧摘要和新消息，生成一份更新的结构化摘要。

## 旧摘要
${oldSummary || '（无旧摘要，首次压缩）'}

## 新消息
${messagesText}

## 要求
请先分析整个对话上下文，然后输出以下 JSON 格式（只输出 JSON，不要其他内容）：

{
  "summary": {
    "session_summary": "当前会话的整体进度摘要（不超过 200 字）",
    "completed_items": ["已完成事项列表"],
    "pending_items": ["待办事项列表"],
    "user_feedback": "用户对 AI 建议的反馈态度",
    "key_decisions": ["用户做出的关键决策"],
    "extracted_keywords": ["对话中出现的关键实体：公司名、岗位名、学校名等"]
  },
  "profile_updates": {
    "target_position": "更新的目标岗位（无变更填 null）",
    "target_industry": "更新的目标行业（无变更填 null）",
    "job_hunting_stage": "更新的求职阶段（无变更填 null）",
    "key_preferences": ["更新的偏好列表（无变更填 null）"]
  }
}

## 关键原则
1. 保留所有关键事实（公司名、岗位名、薪资数字、时间节点、学校名）
2. 保留用户发出的明确指令和偏好
3. 保留 AI 给出的核心建议内容
4. 不要丢失推理链（为什么给出某建议的因果关系）
5. 新增信息优先于旧摘要中的信息
6. 如果新旧信息冲突，以新消息为准
7. profile_updates 中只有明确变更的字段才填，无变更填 null`;
}

/**
 * 画像锚定 → 注入 system prompt 的文本格式
 */
export function formatProfileAnchor(profile: Record<string, unknown> | null): string {
  if (!profile) return '';
  const parts: string[] = ['【用户画像 — 长期记忆】'];
  const fields: Record<string, string> = {
    user_name: '姓名',
    school: '学校',
    major: '专业',
    grade: '年级',
    target_position: '目标岗位',
    target_industry: '目标行业',
    job_hunting_stage: '求职阶段',
  };
  for (const [key, label] of Object.entries(fields)) {
    if (profile[key]) parts.push(`- ${label}：${profile[key]}`);
  }
  const skills = profile.skills as string[] | undefined;
  if (skills && skills.length > 0) parts.push(`- 技能：${skills.join('、')}`);
  const prefs = profile.key_preferences as string[] | undefined;
  if (prefs && prefs.length > 0) parts.push(`- 偏好：${prefs.join('、')}`);
  if (parts.length === 1) return '';
  return parts.join('\n');
}

/**
 * 摘要 → 注入 system prompt 的文本格式
 */
export function formatSummaryText(summary: Record<string, unknown> | null): string {
  if (!summary) return '';
  const parts: string[] = ['【对话进度摘要】'];
  if (summary.session_summary) parts.push(`- 当前状态：${summary.session_summary}`);
  const completed = summary.completed_items as string[] | undefined;
  if (completed && completed.length > 0) {
    parts.push(`- 已完成：${completed.join('；')}`);
  }
  const pending = summary.pending_items as string[] | undefined;
  if (pending && pending.length > 0) {
    parts.push(`- 待办：${pending.join('；')}`);
  }
  const decisions = summary.key_decisions as string[] | undefined;
  if (decisions && decisions.length > 0) {
    parts.push(`- 关键决策：${decisions.join('；')}`);
  }
  if (parts.length === 1) return '';
  return parts.join('\n');
}
