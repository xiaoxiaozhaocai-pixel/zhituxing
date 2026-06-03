'use client';

import dynamic from 'next/dynamic';

// DEV-only inspector - lazy loaded to reduce production bundle
const Inspector = dynamic(
  () => import('react-dev-inspector').then((mod) => ({ default: mod.Inspector })),
  { ssr: false, loading: () => null }
);

export default Inspector;
