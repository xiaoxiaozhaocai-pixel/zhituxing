import type { ReactNode } from 'react';

export interface DispatchCardData {
  intent?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  tabId?: string;
  url?: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  /** 后端路由下发的引导卡片（dispatch 事件），渲染为可点击的功能入口 */
  dispatch?: DispatchCardData;
  /** 工具执行结果卡片（tool_result 事件，方向四）：小职对话内直接动手的结果 */
  toolResult?: ToolResultData;
  /** 共情式表情：由用户消息触发的情绪（小职头像渲染对应贴图） */
  emotion?: import('@/lib/emotion').Emotion;
}

/** dispatch 卡片 tabId → 目标路由（无专用 url 时兜底跳转） */
export function dispatchTabRoute(tabId?: string): string {
  if (!tabId) return '/chat';
  const assistantBots = ['jobs', 'interview', 'career', 'decision', 'assessment', 'competency', 'xiaozhi'];
  if (assistantBots.includes(tabId)) return `/assistant?bot=${tabId}`;
  const pageRoutes: Record<string, string> = {
    'career-paths': '/career-paths',
    'career-planning': '/career-planning',
  };
  return pageRoutes[tabId] || `/assistant?bot=${tabId}`;
}

export function trStr(v: unknown, fallback = ''): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return fallback;
}
export function trArr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}
export function trNum(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export interface ToolResultData {
  tool: string;
  title: string;
  view: 'matches' | 'resume_suggestions' | 'plan_report' | 'one_jd' | 'translate';
  data: Record<string, unknown>;
  pageUrl?: string;
  pageLabel?: string;
}

export function stripDataMarkers(text: string): string {
  return text.replace(/<<\s*DATA\s*:\s*type\s*=\s*\w+\s*>>[\s\S]*?<<\s*END\s*>>/gi, '').trim();
}

export interface BotConfig {
  id: string;
  name: string;
  description: string;
  icon: ReactNode;
  color: string;
  gradient: string;
  welcomeMessage: string;
  quickQuestions: string[];
  isDefault?: boolean;
  isVipOnly?: boolean;
}

// 合规免责文案
export const disclaimerText = `
---
📋 免责声明：本报告基于AI技术生成，仅供职业规划参考，不构成任何求职决策建议。所有岗位信息均来自国聘网、国家24365大学生就业服务平台、中国公共招聘网、广西人才网等合规招聘平台，具体要求以企业官方发布为准。`;

export const xiaozhiWelcome = `嗨～我是小职，你的AI朋友！✨

我可以陪你聊天、帮你查岗位、改简历、模拟面试、做职业规划、做能力诊断……

💬 有什么想聊的？或者直接告诉我你需要什么帮助～` + disclaimerText;

export const bots: BotConfig[] = [
  {
    id: 'xiaozhi',
    name: '小职',
    description: '你的AI朋友',
    icon: null,
    color: 'text-[#165DFF]',
    gradient: 'from-blue-500 to-blue-600',
    welcomeMessage: xiaozhiWelcome,
    quickQuestions: [
      '帮我查一下Java开发岗位',
      '帮我做职业规划',
      '模拟面试HR岗位',
      '产品经理需要哪些技能？'
    ],
    isDefault: true
  },
];
