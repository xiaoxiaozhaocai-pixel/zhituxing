import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '和小职聊聊',
  description: '懂桂电学生的AI朋友——小职，陪你走好求职每一步',
};

export default function ChatLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
