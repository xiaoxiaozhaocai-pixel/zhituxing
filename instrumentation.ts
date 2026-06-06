import * as Sentry from '@sentry/nextjs';

const DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || 'https://86548d0668dabc49073ab3f41c01cb3e@o4511518355357696.ingest.us.sentry.io/4511518418665472';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn: DSN,
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV || 'development',
      debug: true,
    });
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn: DSN,
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV || 'development',
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
