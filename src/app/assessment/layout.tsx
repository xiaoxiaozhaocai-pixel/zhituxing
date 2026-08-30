import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '能力测评 - 6维胜任力评估与雷达图',
  description: 'AI驱动的6维能力测评，生成专属胜任力雷达图。基于真实岗位JD分析你的能力差距，给出针对性提升建议。',
  openGraph: {
    title: '能力测评 | 职途星',
    description: 'AI驱动的6维能力测评，生成专属胜任力雷达图。基于真实岗位JD分析你的能力差距，给出针对性提升建议。',
    locale: 'zh_CN',
    type: 'website',
    siteName: '职途星',
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: '能力测评 | 职途星',
    description: 'AI驱动的6维能力测评，生成专属胜任力雷达图。基于真实岗位JD分析你的能力差距，给出针对性提升建议。',
  },
};

export default function AssessmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
