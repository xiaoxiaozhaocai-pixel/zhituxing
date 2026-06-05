// src/lib/api-error.ts — P1-3 修复：生产环境不暴露错误详情
export function safeErrorMessage(error: unknown, fallback = '服务繁忙，请稍后重试'): string {
  if (process.env.NODE_ENV !== 'production') {
    return error instanceof Error ? error.message : String(error);
  }
  return fallback;
}
