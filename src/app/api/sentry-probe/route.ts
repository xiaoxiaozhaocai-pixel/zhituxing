import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';

export async function GET() {
  const dsn = Sentry.getClient()?.getDsn();
  const eventId = Sentry.captureMessage('Sentry probe ' + new Date().toISOString(), 'error');
  await Sentry.flush(3000);
  return NextResponse.json({
    dsn_loaded: !!dsn,
    dsn_host: dsn?.host || null,
    eventId: eventId || null,
    env_dsn_set: !!process.env.SENTRY_DSN,
    env_public_dsn_set: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  });
}
