import { NextRequest } from 'next/server';
import { jsonOk, jsonError, parseRequestBody } from '@/lib/api-contracts/_shared';
import { detectAnomalies } from '@/lib/analytics/anomaly-detection';
import {
  AnomalyDetectRequestSchema,
  AnomalyDetectDataSchema,
} from '@/lib/api-contracts/analytics';
export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

/**
 * POST /api/analytics/anomaly — 异常检测与风险提示（判断力 · 块3）
 *
 * 面向「数据底座」对关键指标做离群/异常识别（z-score / IQR / 基线偏离），
 * 返回「异常项 + 风险等级 + 建议动作」。强调提示风险而非下因果结论。
 */
export async function POST(request: NextRequest) {
  try {
    const parsed = await parseRequestBody(request, AnomalyDetectRequestSchema);
    if (!parsed.ok) return parsed.response;
    const { values, label, baseline, methods, zWarnThreshold, zAlertThreshold } = parsed.data;

    const result = detectAnomalies(values, {
      label,
      baseline,
      methods,
      zWarnThreshold,
      zAlertThreshold,
    });

    return jsonOk(AnomalyDetectDataSchema, result);
  } catch (error) {
    console.error('[analytics/anomaly] 异常检测失败:', error);
    return jsonError('INTERNAL_ERROR', '异常检测服务异常，请稍后重试');
  }
}
