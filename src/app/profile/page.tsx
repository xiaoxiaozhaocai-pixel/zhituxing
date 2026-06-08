'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useMembership } from '@/contexts/MembershipContext';
import type { AuthUser, QuotaInfo } from '@/hooks/useAuth';
import type {NotificationItem, FavoriteItem, ReportItem} from '@/lib/types';
import { getSupabase } from '@/lib/supabase';
import { Bell,
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
  Copy,
  Gift,
  Calendar,
  Sparkles,
  AlertCircle,
  Pencil,
  Smartphone,
  Mail,
  Bookmark,
  Target,
  Briefcase,
  Brain,
  ArrowRight,
  FolderOpen } from 'lucide-react';
import { groupSkillsByCategory, PROFICIENCY_CONFIG, type SkillForSave } from '@/lib/skill-portrait-parser';
import GrowthCompanionCard from '@/components/GrowthCompanionCard';
import GrowthTimeline from '@/components/GrowthTimeline';

// 侧边栏菜单项
const menuItems = [
  { id: 'info', label: '个人信息', icon: User, color: '#165DFF' },
  { id: 'messages', label: '我的消息', icon: Bell, color: '#165DFF' },
  { id: 'membership', label: '我的会员', icon: Crown, color: '#FF7D00' },
  { id: 'reports', label: '我的报告', icon: FileText, color: '#722ED1' },
  { id: 'growth', label: '成长记录', icon: Sparkles, color: '#165DFF' },
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
  const searchParams = useSearchParams();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [profile, setProfile] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      console.log('[profile] 开始获取用户信息, userId:', userId);
      const res = await fetch('/api/user/profile', { credentials: 'include' });
      console.log('[profile] 响应状态:', res.status);
      const data = await res.json();
      console.log('[profile] 响应数据:', JSON.stringify(data, null, 2).slice(0, 500));
      
      // API返回格式: { success: true, data: {...profile直接} }
      let profileData = null;
      if (data.success && data.data) {
        console.log('[profile] 使用 data.data (success格式)');
        profileData = data.data;
      } else if (data.data) {
        console.log('[profile] 使用 data.data');
        profileData = data.data;
      }
      
      if (profileData) {
        console.log('[profile] 解析到的profile:', JSON.stringify(profileData, null, 2).slice(0, 500));
        setProfile(profileData);
      } else {
        console.log('[profile] 未找到profile数据');
      }
    } catch (e) {
      console.error('获取个人信息失败:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetchProfile();
  }, [userId]);

  // 监听从info页保存回来的刷新信号
  useEffect(() => {
    if (searchParams.get('updated') === '1') {
      fetchProfile();
      // 清除URL参数，避免重复刷新
      window.history.replaceState({}, '', '/profile?tab=info');
    }
  }, [searchParams]);


  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#165DFF]" /></div>;
  }

  // 办公技能关键词
  const OFFICE_SKILLS = ['Excel', 'PPT', 'Word', '项目管理'];

  // 解析技能数据：将 hard_skills 和 soft_skills 字符串数组转换为 SkillForSave[] 对象数组
  const convertToSkillForSave = (names: string[], category: 'professional' | 'office' | 'soft'): SkillForSave[] => {
    if (!Array.isArray(names)) return [];
    return names.map(name => ({
      name,
      category,
      level: '熟悉' as const,
      is_hot: false,
      hotness: 'normal' as const,
      description: '',
    }));
  };

  // 优先使用 skills 字段，否则从 hard_skills + soft_skills 转换
  let skillsData: SkillForSave[] = [];
  console.log('[profile] 技能数据检查:', {
    hasSkillsField: !!profile.skills,
    hasHardSkills: !!profile.hard_skills,
    hasSoftSkills: !!profile.soft_skills,
    hardSkillsType: typeof profile.hard_skills,
    softSkillsType: typeof profile.hard_skills,
    hardSkillsValue: profile.hard_skills,
    softSkillsValue: profile.soft_skills,
  });
  
  if (Array.isArray(profile.skills) && profile.skills.length > 0) {
    console.log('[profile] 使用 profile.skills');
    skillsData = profile.skills;
  } else {
    // hard_skills 根据技能名智能分类：Excel/PPT/Word/项目管理→office，其余→professional
    const hardSkills = (Array.isArray(profile.hard_skills) ? profile.hard_skills : []).map(name => {
      const category: 'professional' | 'office' = OFFICE_SKILLS.some(k => name.includes(k)) ? 'office' : 'professional';
      return {
        name,
        category,
        level: '熟悉' as const,
        is_hot: false,
        hotness: 'normal' as const,
        description: '',
      };
    });
    const softSkills = convertToSkillForSave(profile.soft_skills, 'soft');
    console.log('[profile] 从 hard_skills/soft_skills 转换:', { hardSkills, softSkills });
    skillsData = [...hardSkills, ...softSkills];
  }
  const grouped = groupSkillsByCategory(skillsData);
  const hasSkills = grouped.professional.length + grouped.office.length + grouped.soft.length > 0;
  console.log('[profile] 技能分组结果:', { grouped, hasSkills });

  // 字段名映射（数据库列名 → 显示名）
  // 数据库字段：target_city, job_intention；前端展示名：意向城市、求职意向
  const fields = [
    { key: 'major', label: '专业', icon: Bookmark },
    { key: 'grade', label: '年级', icon: Calendar },
    { key: 'graduation_year', label: '毕业年份', icon: Calendar },
    { key: 'target_city', label: '意向城市', icon: MapPin, format: (v: string | string[]) => Array.isArray(v) ? v.join('、') : v },
    { key: 'job_intention', label: '求职意向', icon: Sparkles },
    { key: 'target_industry', label: '意向行业', icon: Bookmark },
    { key: 'personality_type', label: '人格类型', icon: User },
  ];

  // 数组类字段（奖项、实习、项目）
  const arrayFields = [
    { key: 'awards', label: '奖项荣誉', icon: Bookmark },
    { key: 'internship_experience', label: '实习经历', icon: Briefcase },
    { key: 'project_experience', label: '项目经历', icon: FolderOpen },
  ];

  // 兼容新字段名（API可能返回 target_cities 或 target_job）
  const getFieldValue = (key: string) => {
    // target_city 兼容 target_cities
    if (key === 'target_city') {
      if (profile.target_city) return profile.target_city;
      if (profile.target_cities) return profile.target_cities;
      return null;
    }
    // job_intention 兼容 target_job
    if (key === 'job_intention') {
      if (profile.job_intention) return profile.job_intention;
      if (profile.target_job) return profile.target_job;
      return null;
    }
    return profile[key];
  };

  const hasBasicInfo = fields.some(f => getFieldValue(f.key));

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
              {fields.map(({ key, label, icon: Icon, format }) => {
                const rawValue = getFieldValue(key);
                if (!rawValue) return null;
                const value = format ? format(rawValue) : rawValue;
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

      {/* 补充信息卡片（可选项） */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            补充信息（可选）
          </CardTitle>
          <CardDescription className="text-xs text-gray-400">
            填写后可让所有AI服务获得更精准的上下文，一次填写处处生效
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { key: 'gpa', label: 'GPA', icon: Bookmark, color: 'text-orange-600' },
              { key: 'target_industry', label: '意向行业', icon: Target, color: 'text-blue-600', format: (v: string | string[]) => Array.isArray(v) ? v.join('、') : v },
              { key: 'target_cities', label: '意向城市', icon: MapPin, color: 'text-green-600', format: (v: string | string[]) => Array.isArray(v) ? v.join('、') : v },
              { key: 'economic_pressure', label: '家庭经济', icon: DollarSign, color: 'text-red-500' },
              { key: 'career_tendency', label: '学术vs实践', icon: Brain, color: 'text-purple-600' },
            ].map(field => {
              const rawVal = getFieldValue(field.key === 'target_cities' ? 'target_city' : field.key);
              const displayVal = rawVal ? (field.format ? field.format(rawVal) : rawVal) : null;
              const Icon = field.icon;
              return (
                <div key={field.key} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${field.color}`} />
                    <span className="text-sm text-gray-600">{field.label}</span>
                  </div>
                  <div>
                    {displayVal ? (
                      <span className="text-sm text-gray-900 font-medium">{displayVal}</span>
                    ) : (
                      <span className="text-xs text-gray-400">未填写</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t">
            <Link href="/guide">
              <Button variant="outline" size="sm" className="w-full text-xs">
                补充更多信息
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* 奖项/实习/项目卡片 */}
      {arrayFields.some(f => {
        const val = profile[f.key];
        return Array.isArray(val) && val.length > 0;
      }) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-green-600" />
              经历与成就
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {arrayFields.map(({ key, label, icon: Icon }) => {
                const value = profile[key];
                if (!Array.isArray(value) || value.length === 0) return null;
                return (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">{label}</span>
                    </div>
                    <div className="pl-6 space-y-1">
                      {value.map((item, idx) => {
                        // 实习经历格式化：company | role | duration，然后 description
                        if (key === 'internship_experience' && typeof item === 'object') {
                          return (
                            <div key={idx} className="text-sm text-gray-600 space-y-1">
                              <div className="font-medium">
                                {[item.company, item.role, item.duration].filter(Boolean).join(' | ')}
                              </div>
                              {item.description && (
                                <div className="text-gray-500 pl-2 border-l-2 border-gray-200">
                                  {item.description}
                                </div>
                              )}
                            </div>
                          );
                        }
                        // 项目经历格式化：name/title | role | duration，然后 description
                        if (key === 'project_experience' && typeof item === 'object') {
                          const projectName = item.name || item.title;
                          return (
                            <div key={idx} className="text-sm text-gray-600 space-y-1">
                              <div className="font-medium">
                                {[projectName, item.role, item.duration].filter(Boolean).join(' | ')}
                              </div>
                              {item.description && (
                                <div className="text-gray-500 pl-2 border-l-2 border-gray-200">
                                  {item.description}
                                </div>
                              )}
                            </div>
                          );
                        }
                        // 默认渲染
                        return (
                          <div key={idx} className="text-sm text-gray-600">
                            {typeof item === 'string' ? item : item.name || item.title || JSON.stringify(item)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

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
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
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
      if (data.success && Array.isArray(data.data)) {
        setNotifications(data.data);
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
function MembershipPanel({ user, quota }: { user: AuthUser; quota: QuotaInfo | null }) {
  const { isMember } = useMembership();
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
    if (isMember) return { label: '月度会员', color: 'bg-gradient-to-r from-orange-500 to-yellow-500' };
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

      {!isMember && !quota?.is_lifetime_member && (
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
  const [reports, setReports] = useState<ReportItem[]>([]);
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
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
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
        setFavorites(Array.isArray(data.data) ? data.data : (data.data?.favorites || []));
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
                    {(() => {
                      const fallback = [favorite.industry, favorite.company_type].filter(Boolean).join(' · ');
                      const display = favorite.company || fallback;
                      return display ? <p className="text-sm text-gray-600">{display}</p> : null;
                    })()}
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stats, setStats] = useState<any>({});
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);


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
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    fetchInviteData();
  }, [userId]);


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
function SettingsPanel({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
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
    } catch (err: unknown) {
      const _err_ = err as Error;
      setBindMessage({ type: 'error', text: _err_.message || '绑定失败' });
    } finally {
      setBindLoading(false);
    }
  };
  
  // 脱敏显示
  const maskPhone = (phone: string) => phone?.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') || '';
  const maskEmail = (email: string) => {
    if (!email) return '';
    const [name, domain] = email.split('@');
    return `${name!.slice(0, 2)}***@${domain}`;
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
  const [growthData, setGrowthData] = useState<{
    companionDays: number;
    totalReports: number;
    totalFavorites: number;
    totalAssessments: number;
    milestones: Array<{
      id: string;
      type: 'register' | 'assessment' | 'report' | 'resume' | 'favorite' | 'interview';
      title: string;
      description: string;
      date: string;
    }>;
  } | null>(null);
  const [growthLoading, setGrowthLoading] = useState(false);
  const hasFetchedGrowth = useRef(false);

  useEffect(() => {
    if (activeTab === 'growth' && !hasFetchedGrowth.current) {
      hasFetchedGrowth.current = true;
      setGrowthLoading(true);
      fetch('/api/user/growth', { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (data.success) setGrowthData(data.data);
        })
        .catch((err) => {
          console.error(err);
          hasFetchedGrowth.current = false; // 失败时允许重试
        })
        .finally(() => setGrowthLoading(false));
    }
  }, [activeTab]);

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
    // 使用 window.location.href 硬跳转，避免被 useEffect 中 (!user → /auth) 的重定向竞争
    window.location.href = '/';
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
      case 'growth':
        return (
          <div className="space-y-6">
            <GrowthCompanionCard
              companionDays={growthData?.companionDays ?? 0}
              totalReports={growthData?.totalReports ?? 0}
              totalFavorites={growthData?.totalFavorites ?? 0}
              totalAssessments={growthData?.totalAssessments ?? 0}
              isLoading={growthLoading}
            />
            <GrowthTimeline
              milestones={growthData?.milestones ?? []}
              isLoading={growthLoading}
            />
          </div>
        );
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50/60 via-white to-purple-50/40">
      <div className="flex">
        {/* 左侧侧边栏 */}
        <aside className="w-[240px] bg-white border-r border-blue-100 min-h-screen fixed left-0 top-0 flex flex-col shadow-[2px_0_12px_rgba(30,58,138,0.06)]">
          {/* 顶部 Logo 区，点击返回首页 */}
          <Link
            href="/"
            className="flex items-center gap-2 px-4 h-14 bg-gradient-to-r from-[#1E3A8A] to-[#165DFF] hover:from-[#1e2f6e] hover:to-[#0f4fd4] transition-all group"
            aria-label="返回首页"
          >
            <svg className="w-5 h-5 text-white/70 flex-shrink-0 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
            </svg>
            <span className="text-sm font-semibold text-white">职途星 · 个人中心</span>
          </Link>

          {/* 用户信息头部 */}
          <div className="p-4 border-b border-blue-50 bg-gradient-to-b from-blue-50/50 to-white">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-gradient-to-br from-[#165DFF] to-[#722ED1] rounded-full flex items-center justify-center ring-2 ring-blue-100 flex-shrink-0">
                <span className="text-white text-base font-bold">
                  {user.nickname?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{user.nickname || '用户'}</p>
                <p className="text-xs text-gray-500">
                  {user.phone?.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
                </p>
              </div>
            </div>
          </div>

          {/* 菜单列表 */}
          <nav className="p-3 flex-1 space-y-0.5">
            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              if (item.isLogout) {
                return (
                  <button
                    key={item.id}
                    onClick={() => setShowLogoutModal(true)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-red-500 hover:bg-red-50 transition-all"
                  >
                    <Icon className="w-[18px] h-[18px]" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-[#165DFF] to-[#722ED1] text-white shadow-md shadow-purple-200/40'
                      : 'text-gray-600 hover:bg-blue-50/60 hover:text-[#165DFF]'
                  }`}
                >
                  <Icon className="w-[18px] h-[18px]" />
                  <span className="text-sm font-medium">{item.label}</span>
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* sidebar 底部装饰 */}
          <div className="px-3 pb-4">
            <div className="h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
            <p className="text-[10px] text-gray-400 text-center mt-3">职途星 · 让求职更简单</p>
          </div>
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
