import { z } from 'zod';

/**
 * Analytics 异常检测契约（判断力 · 块3）
 * 接口返回「异常项 + 风险等级 + 建议动作」，强调「提示风险而非下因果结论」。
 */

export const AnomalyMethodSchema = z.enum(['zscore', 'iqr', 'baseline']);
export type AnomalyMethod = z.infer<typeof AnomalyMethodSchema>;

export const RiskLevelSchema = z.enum(['notice', 'warning', 'alert']);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const AnomalyOverallSchema = z.enum(['ok', 'attention', 'alert']);
export type AnomalyOverall = z.infer<typeof AnomalyOverallSchema>;

export const AnomalyDetectRequestSchema = z.object({
  /** 关键指标数值样本（按时间/序列排布），1-500 个 */
  values: z.array(z.number()).min(1).max(500),
  /** 指标名，用于描述文案 */
  label: z.string().trim().min(1).max(60).optional(),
  /** 基线值，存在时启用 baseline 偏离检测 */
  baseline: z.number().optional(),
  /** 启用的检测方法，默认 ['zscore', 'iqr'] */
  methods: z.array(AnomalyMethodSchema).min(1).max(3).optional(),
  /** z-score 预警阈值，默认 2 */
  zWarnThreshold: z.number().positive().optional(),
  /** z-score 高风险阈值，默认 3 */
  zAlertThreshold: z.number().positive().optional(),
});
export type AnomalyDetectRequest = z.infer<typeof AnomalyDetectRequestSchema>;

export const AnomalyItemSchema = z.object({
  index: z.number().int(),
  value: z.number(),
  method: AnomalyMethodSchema,
  direction: z.enum(['high', 'low']),
  riskLevel: RiskLevelSchema,
  zScore: z.number().nullable(),
  q1: z.number().nullable(),
  q3: z.number().nullable(),
  iqr: z.number().nullable(),
  description: z.string(),
  suggestion: z.string(),
});
export type AnomalyItem = z.infer<typeof AnomalyItemSchema>;

export const AnomalyDetectDataSchema = z.object({
  count: z.number().int(),
  overall: AnomalyOverallSchema,
  mean: z.number().nullable(),
  stdDev: z.number().nullable(),
  q1: z.number().nullable(),
  q3: z.number().nullable(),
  iqr: z.number().nullable(),
  items: z.array(AnomalyItemSchema),
});
export type AnomalyDetectData = z.infer<typeof AnomalyDetectDataSchema>;
