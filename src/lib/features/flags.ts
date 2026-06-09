/**
 * 职途星 Feature Flag 系统
 * 
 * 所有新功能默认关，用开关控制上线。
 * 代码随时合、功能随时切、不用分支管理控制上线节奏。
 * 
 * 使用方式：
 *   import { isEnabled } from '@/lib/features/flags';
 *   if (isEnabled('multiStyleInterview')) { ... }
 */

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  category: 'core' | 'experiment' | 'future';
  addedAt: string;
}

const FEATURE_FLAGS: Record<string, FeatureFlag> = {
  // ============================================================
  // ✅ 已上线核心功能
  // ============================================================
  xiaozhiV2: {
    key: 'xiaozhiV2',
    name: '小职 V2 对话',
    description: '小职主对话智能体（DeepSeek直连）',
    enabled: true,
    category: 'core',
    addedAt: '2026-05-29',
  },
  multiStyleInterview: {
    key: 'multiStyleInterview',
    name: '多风格面试官',
    description: '三风格面试（温和/严格/压力）+ 本尊点评',
    enabled: true,
    category: 'core',
    addedAt: '2026-06-04',
  },
  xiaozhiRecommend: {
    key: 'xiaozhiRecommend',
    name: '小职个性化推荐',
    description: '岗位推荐附带小职个性化推荐语',
    enabled: true,
    category: 'core',
    addedAt: '2026-06-04',
  },
  assessmentRecommendLoop: {
    key: 'assessmentRecommendLoop',
    name: '测评推荐闭环',
    description: '测评结果接入岗位推荐系统',
    enabled: true,
    category: 'core',
    addedAt: '2026-06-04',
  },
  costDashboard: {
    key: 'costDashboard',
    name: '成本监控看板',
    description: 'DS消耗估算 + SVG趋势图 + 逐日明细',
    enabled: true,
    category: 'core',
    addedAt: '2026-06-04',
  },
  resumeEditor: {
    key: 'resumeEditor',
    name: '简历编辑器',
    description: '对话式简历创作 + 实时预览 + 导出PDF',
    enabled: true,
    category: 'core',
    addedAt: '2026-06-02',
  },

  // ============================================================
  // 🧪 本次迭代新增（默认关，逐步开启）
  // ============================================================
  careerAssessment: {
    key: 'careerAssessment',
    name: '简版职业测评',
    description: '10-15题动态测评，结果关联简历/推荐',
    enabled: false,
    category: 'experiment',
    addedAt: '2026-06-04',
  },
  moduleDecoupling: {
    key: 'moduleDecoupling',
    name: '模块解耦',
    description: '/api/chat 拆分为独立 bot 路由',
    enabled: false,
    category: 'experiment',
    addedAt: '2026-06-04',
  },
  courseFrontend: {
    key: 'courseFrontend',
    name: '课程前端对接',
    description: '对话中推荐课程 + 课程页SSE流式展示',
    enabled: false,
    category: 'experiment',
    addedAt: '2026-06-04',
  },
  jobRecommendUI: {
    key: 'jobRecommendUI',
    name: '岗位推荐UI增强',
    description: '岗位列表展示小职推荐语',
    enabled: false,
    category: 'experiment',
    addedAt: '2026-06-04',
  },
  dataLoopDashboard: {
    key: 'dataLoopDashboard',
    name: '数据闭环看板',
    description: '模块使用率统计 + 决策规则',
    enabled: false,
    category: 'experiment',
    addedAt: '2026-06-04',
  },

  // ============================================================
  // 🔮 未来功能
  // ============================================================
  voiceTTS: {
    key: 'voiceTTS',
    name: '语音TTS',
    description: '火山引擎TTS接入 + 小职语音点评',
    enabled: true,
    category: 'core',
    addedAt: '2026-06-04',
  },
  universityIntegration: {
    key: 'universityIntegration',
    name: '高校集成',
    description: '高校门户+多租户架构+合作申请',
    enabled: true,
    category: 'core',
    addedAt: '2026-06-04',
  },
};

// ============================================================
// 公共 API
// ============================================================

/** 检查功能是否启用 */
export function isEnabled(key: string): boolean {
  return FEATURE_FLAGS[key]?.enabled ?? false;
}

/** 获取所有功能标志 */
export function getAllFlags(): FeatureFlag[] {
  return Object.values(FEATURE_FLAGS);
}

/** 按分类获取功能标志 */
export function getFlagsByCategory(category: FeatureFlag['category']): FeatureFlag[] {
  return Object.values(FEATURE_FLAGS).filter(f => f.category === category);
}

/** 获取已启用的功能列表 */
export function getEnabledFlags(): FeatureFlag[] {
  return Object.values(FEATURE_FLAGS).filter(f => f.enabled);
}

export default FEATURE_FLAGS;

// FLAG_CONFIGS: 兼容 providers.ts 的环境变量覆盖配置
export const FLAG_CONFIGS: Record<string, { envKey: string; defaultValue: boolean }> = 
  Object.fromEntries(
    Object.entries(FEATURE_FLAGS).map(([key, flag]) => [
      key,
      { envKey: `NEXT_PUBLIC_FLAG_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`, defaultValue: flag.enabled }
    ])
  );
