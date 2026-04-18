import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Crown,
  FileText,
  Heart,
  Users,
  Settings,
  LogOut,
  ChevronRight
} from 'lucide-react';

const menuItems = [
  {
    id: 'membership',
    title: '我的会员',
    description: '查看会员状态和到期时间',
    icon: <Crown className="w-6 h-6 text-[#FF7D00]" />,
    href: '/profile/membership'
  },
  {
    id: 'reports',
    title: '我的报告',
    description: '查看和下载职业规划报告',
    icon: <FileText className="w-6 h-6 text-[#165DFF]" />,
    href: '/profile/reports'
  },
  {
    id: 'favorites',
    title: '我的收藏',
    description: '查看收藏的岗位和干货',
    icon: <Heart className="w-6 h-6 text-red-500" />,
    href: '/profile/favorites'
  },
  {
    id: 'invite',
    title: '我的邀请',
    description: '邀请好友得免费会员',
    icon: <Users className="w-6 h-6 text-green-500" />,
    href: '/profile/invite'
  },
  {
    id: 'settings',
    title: '账号设置',
    description: '修改个人信息和密码',
    icon: <Settings className="w-6 h-6 text-gray-500" />,
    href: '/profile/settings'
  }
];

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            我的个人中心
          </h1>
          <p className="text-gray-600">
            管理你的账号和使用记录
          </p>
        </div>

        {/* User Info Card */}
        <Card className="mb-8 border-2 border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-[#165DFF] rounded-full flex items-center justify-center">
                <span className="text-white text-2xl font-bold">张</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">张三</h2>
                <p className="text-gray-600">计算机专业 · 大三</p>
                <div className="flex items-center mt-2 space-x-2">
                  <span className="bg-[#165DFF]/10 text-[#165DFF] text-sm font-medium px-3 py-1 rounded-full">
                    普通会员
                  </span>
                  <span className="text-sm text-gray-500">
                    本月剩余免费次数：5/5
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Menu Grid */}
        <div className="space-y-4">
          {menuItems.map((item) => (
            <Link key={item.id} href={item.href}>
              <Card className="border-2 border-gray-100 hover:border-[#165DFF]/20 transition-all duration-300 hover:shadow-md cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center">
                        {item.icon}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {item.title}
                        </h3>
                        <p className="text-gray-600 text-sm">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Logout Button */}
        <div className="mt-8">
          <Button
            variant="ghost"
            className="w-full border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="w-5 h-5 mr-2" />
            退出登录
          </Button>
        </div>
      </div>
    </div>
  );
}
