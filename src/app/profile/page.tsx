'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { getSupabase } from '@/lib/supabase';
import {
  Bell,
  Crown,
  FileText,
  Heart,
  Users,
  Settings,
  LogOut,
  Loader2,
  User,
  MapPin,
  DollarSign,
  Trash2,
  CheckCircle,
  Share2,
  Copy,
  Gift,
  Calendar,
  Sparkles,
  X,
  AlertCircle,
  Pencil,
  Smartphone,
  Mail,
  Check,
  Bookmark,
  Target,
  Briefcase,
  Brain,
  ArrowRight,
} from 'lucide-react';
import { groupSkillsByCategory, PROFICIENCY_CONFIG, type SkillForSave } from '@/lib/skill-portrait-parser';

// 侧边栏菜单项
const menuItems = [
  { id: 'info', label: '个人信息', icon: User, color: '#165DFF' },
  { id: 'messages', label: '我的消息', icon: Bell, color: '#165DFF' },
  { id: 'membership', label: '我的会员', icon: Crown, color: '#FF7D00' },
  { id: 'reports', label: '我的报告', icon: FileText, color: '#722ED1' },
  { id: 'favorites', label: '我的收藏', icon: Heart, color: '#EF4444' },
  { id: 'invite', label: '我的邀请', icon: Users, color: '#10B981' },
  { id: 'settings', label: '账号设置', icon: Settings, color: '#6B7280' },
  { id: 'logout', label: '退出登录', icon: LogOut, color: '#EF4444', isLogout: true },
];

// 熟练度色条组件
function ProficiencyBar({ level }: { level: string }) {
  const config = PROFICIENCY_CONFIG[level as keyof typeof PROFICIENCY_CONFIG] || PROFICIENCY_CONFIG['了解'];
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: config.width, backgroundColor: config.color }} />
      </div>
      <span className="text-xs font-medium" style={{ color: config.color }}>{level}</span>
    </div>
  );
}

// 技能分类展示组件
function SkillCategorySection({
  title,
  icon: Icon,
  skills,
  accentColor,
  onEdit,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  skills: SkillForSave[];
  accentColor: string;
  onEdit: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span style={{ color: accentColor }}><Icon className="w-4 h-4" /></span>
          <h4 className="text-sm font-semibold text-gray-800">{title}</h4>
          <span className="text-xs text-gray-400">{skills.length} 项</span>
        </div>
        <button
          onClick={onEdit}
          className="text-xs text-[#165DFF] hover:text-[#165DFF]/80 flex items-center gap-0.5"
        >
          <Pencil className="w-3 h-3" />
          编辑
        </button>
      </div>
      {skills.length > 0 ? (
        <div className="space-y-2">
          {skills.map((skill) => (
            <div key={skill.name} className="flex items-center justify-between py-1.5 px-3 bg-gray-50/80 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-800">{skill.name}</span>
                {skill.is_hot && <span className="text-xs">🔥</span>}
              </div>
              <ProficiencyBar level={skill.level} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 py-2">暂无技能，点击编辑添加</p>
      )}
    </div>
  );
}

// 个人信息面板组件
function ProfileInfoPanel({ userId }: { userId: string }) {
  const router = useRouter();
  const [profile, setProfile] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/user/profile', { headers: { 'x-user-id': userId } });
      const data = await res.json();
      if (data.data?.profile) setProfile(data.data.profile);
      else if (data.profile) setProfile(data.profile);
    } catch (e) {
      console.error('获取个人信息失败:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#165DFF]" /></div>;
  }

  // 解析技能数据
  const skillsData = Array.isArray(profile.skills) ? profile.skills : [];
  const grouped = groupSkillsByCategory(skillsData);
  const hasSkills = grouped.professional.length + grouped.office.length + grouped.soft.length > 0;

  const fields = [
    { key: 'major', label: '专业', icon: Bookmark },
    { key: 'grade', label: '年级', icon: Calendar },
    { key: 'target_city', label: '意向城市', icon: MapPin },
    { key: 'job_intention', label: '求职意向', icon: Sparkles },
    { key: 'personality_type', label: '人格类型', icon: User },
  ];

  const hasBasicInfo = fields.some(f => profile[f.key]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">个人信息</h2>
        <Link href="/profile/info">
          <Button variant="outline" size="sm">
            <Pencil className="w-3 h-3 mr-1" />
            编辑
          </Button>
        </Link>
      </div>

      {/* 基本信息卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-[#165DFF]" />
            基本信息
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasBasicInfo ? (
            <div className="space-y-3">
              {fields.map(({ key, label, icon: Icon }) => {
                const value = profile[key];
                if (!value) return null;
                return (
                  <div key={key} className="flex items-center gap-3 py-1.5">
                    <Icon className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-sm text-gray-500 w-20 shrink-0">{label}</span>
                    <span className="text-sm font-medium text-gray-900">{value}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-400 text-sm mb-3">尚未填写基本信息</p>
              <Link href="/profile/info">
                <Button size="sm" className="bg-[#165DFF] hover:bg-[#165DFF]/90">
                  去填写
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 技能画像卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            技能画像
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {hasSkills ? (
            <>
              <SkillCategorySection
                title="专业核心技能"
                icon={Target}
                skills={grouped.professional}
                accentColor="#3B82F6"
                onEdit={() => router.push('/profile/info?from=/profile&step=3')}
              />
              <SkillCategorySection
                title="通用办公技能"
                icon={Briefcase}
                skills={grouped.office}
                accentColor="#10B981"
                onEdit={() => router.push('/profile/info?from=/profile&step=3')}
              />
              <SkillCategorySection
                title="软技能"
                icon={Brain}
                skills={grouped.soft}
                accentColor="#8B5CF6"
                onEdit={() => router.push('/profile/info?from=/profile&step=3')}
              />
            </>
          ) : (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-7 h-7 text-purple-400" />
              </div>
              <p className="text-gray-500 text-sm mb-1">完善你的技能画像</p>
              <p className="text-gray-400 text-xs mb-4">获取精准职业规划和岗位匹配</p>
              <Link href="/profile/info?from=/profile">
                <Button size="sm" className="bg-gradient-to-r from-[#165DFF] to-purple-600 hover:from-[#165DFF]/90 hover:to-purple-600/90 text-white shadow-md shadow-purple-500/20">
                  AI智能推荐技能
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// 消息内容组件
function MessagesPanel({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    fetchNotifications();
  }, [userId]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', {
        headers: { 'x-user-id': userId }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setNotifications(data.data.notifications || []);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('获取通知失败:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'x-user-id': userId }
      });
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, is_read: true } : n
      ));
    } catch (error) {
      console.error('标记已读失败:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': userId }
      });
      setNotifications(notifications.filter(n => n.id !== id));
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#165DFF]" /></div>;
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">我的消息</h2>
        {unreadCount > 0 && (
          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
            {unreadCount}条未读
          </span>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">暂无消息通知</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map(notification => (
            <Card key={notification.id} className={notification.is_read ? 'opacity-70' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {!notification.is_read && (
                        <span className="w-2 h-2 bg-red-500 rounded-full" />
                      )}
                      <h3 className="font-medium text-gray-900">{notification.title}</h3>
                    </div>
                    <p className="text-sm text-gray-600">{notification.content}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(notification.created_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!notification.is_read && (
                      <button
                        onClick={() => handleMarkRead(notification.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="标记已读"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notification.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// 会员面板组件
function MembershipPanel({ user, quota }: { user: any; quota: any }) {
  const memberBenefits = [
    '无限次AI职业规划',
    '无限次AI模拟面试',
    '完整6维能力测评报告',
    '无限次胜任力评估+雷达图',
    '完整考研就业决策报告',
    '求职大礼包下载'
  ];

  const getMemberStatus = () => {
    if (quota?.is_lifetime_member) return { label: '终身会员', color: 'bg-gradient-to-r from-purple-500 to-pink-500' };
    if (quota?.is_member) return { label: '月度会员', color: 'bg-gradient-to-r from-orange-500 to-yellow-500' };
    return { label: '普通用户', color: 'bg-gray-400' };
  };

  const status = getMemberStatus();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">我的会员</h2>
      </div>

      <Card className="bg-gradient-to-r from-[#722ED1] to-[#9B5AE7] text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm mb-2">当前会员</p>
              <h3 className="text-2xl font-bold">{status.label}</h3>
              {quota?.member_expire_time && (
                <p className="text-white/80 text-sm mt-2 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {quota.is_lifetime_member ? '永久有效' : `到期: ${quota.member_expire_time}`}
                </p>
              )}
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <Crown className="w-8 h-8 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {!quota?.is_member && !quota?.is_lifetime_member && (
        <Card className="border-2 border-orange-200 bg-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">开通会员解锁全部功能</h3>
                <p className="text-sm text-gray-600">仅需9.9元/月，享受无限次AI服务</p>
              </div>
              <Link href="/membership">
                <Button className="bg-[#FF7D00] hover:bg-[#e67000]">立即开通</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">会员专属权益</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {memberBenefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-sm text-gray-700">{benefit}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 报告面板组件
function ReportsPanel({ userId }: { userId: string }) {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    fetchReports();
  }, [userId]);

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/career-planning/my-reports', {
        headers: { 'x-user-id': userId }
      });
      const data = await res.json();
      if (data.code === 200 && data.data) {
        // API返回的数据结构是 { list: [...], total, page, pageSize, totalPages }
        setReports(data.data.list || []);
      } else {
        setReports([]);
      }
    } catch (error) {
      console.error('获取报告失败:', error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#165DFF]" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">我的报告</h2>
        <Link href="/career-planning">
          <Button variant="outline" size="sm">生成新报告</Button>
        </Link>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-4">还没有生成过职业规划报告</p>
            <Link href="/career-planning">
              <Button className="bg-[#722ED1] hover:bg-[#6019c4]">去生成报告</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map(report => (
            <Card key={report.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{report.title || `${report.major || '职业规划'}报告`}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {report.core_job && <span className="mr-2">目标岗位: {report.core_job}</span>}
                      {report.city && <span className="mr-2">城市: {report.city}</span>}
                      {report.create_time && (
                        <span>{new Date(report.create_time).toLocaleString('zh-CN')}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/career-planning/report/${report.id}`}>
                      <Button size="sm" variant="outline">查看</Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// 收藏面板组件
function FavoritesPanel({ userId }: { userId: string }) {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    fetchFavorites();
  }, [userId]);

  const fetchFavorites = async () => {
    try {
      const res = await fetch('/api/favorites', {
        headers: { 'x-user-id': userId }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setFavorites(data.data.favorites || []);
      } else {
        setFavorites([]);
      }
    } catch (error) {
      console.error('获取收藏失败:', error);
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/favorites/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': userId }
      });
      setFavorites(favorites.filter(f => f.id !== id));
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#165DFF]" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">我的收藏</h2>
        <span className="text-gray-500">{favorites.length}个岗位</span>
      </div>

      {favorites.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Heart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-4">还没有收藏任何岗位</p>
            <Link href="/jobs">
              <Button className="bg-[#165DFF] hover:bg-[#0d4acc]">去岗位百科看看</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {favorites.map(favorite => (
            <Card key={favorite.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{favorite.jobTitle}</h3>
                    {favorite.company && <p className="text-sm text-gray-600">{favorite.company}</p>}
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                      {favorite.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {favorite.location}
                        </span>
                      )}
                      {favorite.salary && (
                        <span className="flex items-center gap-1 text-orange-600 font-medium">
                          <DollarSign className="w-3 h-3" />
                          {favorite.salary}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(favorite.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// 邀请面板组件
function InvitePanel({ userId }: { userId: string }) {
  const [inviteCode, setInviteCode] = useState('');
  const [stats, setStats] = useState<any>({});
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    fetchInviteData();
  }, [userId]);

  const fetchInviteData = async () => {
    try {
      const res = await fetch('/api/invite/my-code');
      const data = await res.json();
      if (data.success && data.data) {
        setInviteCode(data.data.invite_code || '');
        setStats(data.data.stats || {});
      }
    } catch (error) {
      console.error('获取邀请数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/auth?invite_code=${inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#165DFF]" /></div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">我的邀请</h2>

      <Card className="bg-gradient-to-r from-[#10B981] to-[#34D399] text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm mb-2">已邀请人数</p>
              <h3 className="text-3xl font-bold">{stats.total_invites || 0} 人</h3>
            </div>
            <Gift className="w-12 h-12 text-white/80" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>邀请链接</CardTitle>
          <CardDescription>分享给好友，好友注册后双方都可获得奖励</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1 p-3 bg-gray-50 rounded-lg text-sm text-gray-600 truncate">
              {typeof window !== 'undefined' ? `${window.location.origin}/auth?invite_code=${inviteCode}` : ''}
            </div>
            <Button onClick={handleCopyLink} className="bg-[#165DFF] hover:bg-[#0d4acc]">
              {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>邀请规则</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700">邀请1位好友注册并完成首次AI提问，双方各获得3次AI次数+7天会员</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700">累计邀请3人，额外获得30天会员</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700">累计邀请10人，额外获得90天会员+1次免费简历精修服务</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

// 设置面板组件
function SettingsPanel({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [formData, setFormData] = useState({
    nickname: user?.nickname || '',
    phone: user?.phone || ''
  });
  
  // 账号绑定状态
  const [showBindEmail, setShowBindEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [bindLoading, setBindLoading] = useState(false);
  const [bindMessage, setBindMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async () => {
    // 保存设置逻辑
    alert('设置保存成功！');
  };
  
  // 绑定邮箱
  const handleBindEmail = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!newEmail || !emailRegex.test(newEmail)) {
      setBindMessage({ type: 'error', text: '请输入有效的邮箱地址' });
      return;
    }
    
    setBindLoading(true);
    setBindMessage(null);
    
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      
      if (error) {
        setBindMessage({ type: 'error', text: error.message });
      } else {
        setBindMessage({ type: 'success', text: '确认邮件已发送到您的邮箱，请点击邮件中的链接完成绑定' });
        setShowBindEmail(false);
        setNewEmail('');
      }
    } catch (err: any) {
      setBindMessage({ type: 'error', text: err.message || '绑定失败' });
    } finally {
      setBindLoading(false);
    }
  };
  
  // 脱敏显示
  const maskPhone = (phone: string) => phone?.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') || '';
  const maskEmail = (email: string) => {
    if (!email) return '';
    const [name, domain] = email.split('@');
    return `${name.slice(0, 2)}***@${domain}`;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">账号设置</h2>

      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
            <input
              type="text"
              value={formData.nickname}
              onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#165DFF] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
            <input
              type="text"
              value={maskPhone(formData.phone)}
              disabled
              className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-500"
            />
          </div>
          <Button onClick={handleSave} className="bg-[#165DFF] hover:bg-[#0d4acc]">
            保存修改
          </Button>
        </CardContent>
      </Card>

      {/* 账号绑定区域 */}
      <Card>
        <CardHeader>
          <CardTitle>账号绑定</CardTitle>
          <p className="text-sm text-gray-500">绑定邮箱后可使用验证码登录</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 手机号绑定状态 */}
          <div className="flex items-center justify-between py-2 border-b">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">手机号</p>
                <p className="text-sm text-gray-500">
                  {user?.phone ? maskPhone(user.phone) : '未绑定'}
                </p>
              </div>
            </div>
            {user?.phone ? (
              <Badge className="bg-green-100 text-green-700">已绑定</Badge>
            ) : (
              <span className="text-xs text-gray-400">即将开放</span>
            )}
          </div>
          
          {/* 邮箱绑定状态 */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">邮箱</p>
                <p className="text-sm text-gray-500">
                  {user?.email ? maskEmail(user.email) : '未绑定'}
                </p>
              </div>
            </div>
            {user?.email ? (
              <Badge className="bg-green-100 text-green-700">已绑定</Badge>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setShowBindEmail(true)}>
                绑定邮箱
              </Button>
            )}
          </div>
          
          {/* 绑定邮箱弹窗 */}
          {showBindEmail && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
              <h4 className="font-medium">绑定邮箱</h4>
              <Input
                type="email"
                placeholder="请输入邮箱地址"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
              {bindMessage && (
                <p className={`text-sm ${bindMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {bindMessage.text}
                </p>
              )}
              <div className="flex gap-2">
                <Button onClick={handleBindEmail} disabled={bindLoading}>
                  {bindLoading ? '发送中...' : '发送确认邮件'}
                </Button>
                <Button variant="outline" onClick={() => { setShowBindEmail(false); setNewEmail(''); setBindMessage(null); }}>
                  取消
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>安全设置</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full justify-start">
            <Settings className="w-4 h-4 mr-2" />
            修改登录密码
          </Button>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">危险操作</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50" onClick={onLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            退出登录
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// 退出确认弹窗
function LogoutConfirmModal({ show, onConfirm, onCancel }: { show: boolean; onConfirm: () => void; onCancel: () => void }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <h2 className="text-xl font-bold">确认退出</h2>
          </div>
          <p className="text-gray-600 mb-6">确定要退出登录吗？</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>取消</Button>
            <Button className="bg-red-500 hover:bg-red-600" onClick={onConfirm}>确认退出</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 主页面组件
function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, logout, quota } = useAuth();
  const [activeTab, setActiveTab] = useState('messages');
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && menuItems.some(m => m.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#165DFF]" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'info':
        return <ProfileInfoPanel userId={user.id} />;
      case 'messages':
        return <MessagesPanel userId={user.id} />;
      case 'membership':
        return <MembershipPanel user={user} quota={quota} />;
      case 'reports':
        return <ReportsPanel userId={user.id} />;
      case 'favorites':
        return <FavoritesPanel userId={user.id} />;
      case 'invite':
        return <InvitePanel userId={user.id} />;
      case 'settings':
        return <SettingsPanel user={user} onLogout={() => setShowLogoutModal(true)} />;
      default:
        return <ProfileInfoPanel userId={user.id} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex">
        {/* 左侧侧边栏 */}
        <aside className="w-[240px] bg-white border-r min-h-screen fixed left-0 top-0 pt-20">
          {/* 用户信息头部 */}
          <div className="p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#165DFF] rounded-full flex items-center justify-center">
                <span className="text-white text-lg font-bold">
                  {user.nickname?.charAt(0) || 'U'}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{user.nickname || '用户'}</p>
                <p className="text-xs text-gray-500">
                  {user.phone?.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
                </p>
              </div>
            </div>
          </div>

          {/* 菜单列表 */}
          <nav className="p-3">
            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              if (item.isLogout) {
                return (
                  <button
                    key={item.id}
                    onClick={() => setShowLogoutModal(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                    isActive
                      ? 'bg-[#722ED1] text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* 右侧内容区 */}
        <main className="flex-1 ml-[240px] min-h-screen p-6">
          <div className="max-w-3xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* 退出确认弹窗 */}
      <LogoutConfirmModal
        show={showLogoutModal}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#165DFF]" />
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}
