import * as Sentry from '@sentry/nextjs';

export async function GET() {
  try {
    throw new Error('Sentry 测试 API 错误 - ' + new Date().toISOString());
  } catch (e) {
    Sentry.captureException(e);
    await Sentry.flush(2000);
    throw e;
  }
}
