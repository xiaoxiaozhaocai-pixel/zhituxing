import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || 'https://86548d0668dabc49073ab3f41c01cb3e@o4511518355357696.ingest.us.sentry.io/4511518418665472',
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV || 'development',
});
