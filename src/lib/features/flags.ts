// src/lib/features/flags.ts
// Feature Flag 枚举与配置定义

export enum FeatureFlag {
  CONTEXT_COMPRESSION = 'context_compression',
  XIAOZHI_V2 = 'xiaozhi_v2',
  INTERVIEW_MULTI_STYLE = 'interview_multi_style',
  RESUME_EDITOR = 'resume_editor',
  COST_DASHBOARD = 'cost_dashboard',
  VOICE_FEEDBACK = 'voice_feedback',
}

export interface FlagConfig {
  defaultValue: boolean;
  envKey: string;
  description: string;
}

export const FLAG_CONFIGS: Record<FeatureFlag, FlagConfig> = {
  [FeatureFlag.CONTEXT_COMPRESSION]: {
    defaultValue: true,
    envKey: 'NEXT_PUBLIC_FF_CONTEXT_COMPRESSION',
    description: '三层混合上下文压缩（已上线）',
  },
  [FeatureFlag.XIAOZHI_V2]: {
    defaultValue: true,
    envKey: 'NEXT_PUBLIC_FF_XIAOZHI_V2',
    description: '小职调度链 v0.1（已上线）',
  },
  [FeatureFlag.INTERVIEW_MULTI_STYLE]: {
    defaultValue: false,
    envKey: 'NEXT_PUBLIC_FF_INTERVIEW_MULTI_STYLE',
    description: '多风格面试官（开发中）',
  },
  [FeatureFlag.RESUME_EDITOR]: {
    defaultValue: false,
    envKey: 'NEXT_PUBLIC_FF_RESUME_EDITOR',
    description: '可交互简历编辑器（开发中）',
  },
  [FeatureFlag.COST_DASHBOARD]: {
    defaultValue: false,
    envKey: 'NEXT_PUBLIC_FF_COST_DASHBOARD',
    description: '成本监控看板（开发中）',
  },
  [FeatureFlag.VOICE_FEEDBACK]: {
    defaultValue: false,
    envKey: 'NEXT_PUBLIC_FF_VOICE_FEEDBACK',
    description: 'TTS语音反馈（远期）',
  },
};
