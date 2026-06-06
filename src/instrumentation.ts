export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

export const onRequestError = async (...args: unknown[]) => {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const mod = await import('../sentry.server.config');
    // @ts-expect-error - captureRequestError may not be typed
    return mod?.captureRequestError?.(...args);
  }
};
