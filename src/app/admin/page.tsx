import { redirect } from 'next/navigation';

export default function AdminRootPage() {
  // 重定向到数据看板页面
  redirect('/admin/dashboard');
}
