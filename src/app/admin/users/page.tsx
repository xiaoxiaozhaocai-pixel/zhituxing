'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Users, Crown, TrendingUp, UserPlus, Search, ChevronLeft, ChevronRight, X, Activity, Target, Briefcase, MessageSquare } from 'lucide-react';

// ============ 类型定义 ============
interface UserStats {
  total: number;
  members: number;
  conversionRate: number;
  weeklyNew: number;
}

interface GrowthPoint {
  date: string;
  count: number;
}

interface UserRow {
  user_id: number;
  user_type: string;
  membership_type: string;
  membership_plan: string | null;
  major: string | null;
  grade: string | null;
  job_intention: string | null;
  city: string | null;
  personality_type: string | null;
  is_admin: boolean;
  created_at: string;
  skill_count: number;
  assessment_count: number;
}

interface UserDetail {
  profile: Record<string, unknown>;
  skills: Record<string, unknown>[];
  assessments: Record<string, unknown>[];
  matches: Record<string, unknown>[];
  interviews: Record<string, unknown>[];
  careerPlans: Record<string, unknown>[];
  behaviorStats: Record<string, unknown>[];
}

// ============ 主组件 ============
export default function AdminUsersPage() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [growthData, setGrowthData] = useState<GrowthPoint[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });

  // 筛选
  const [keyword, setKeyword] = useState('');
  const [membershipFilter, setMembershipFilter] = useState('');
  const [majorFilter, setMajorFilter] = useState('');

  // 详情抽屉
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // 加载统计
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users?action=stats');
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (e) { console.error('fetchStats error', e); }
  }, []);

  // 加载增长趋势
  const fetchGrowth = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users?action=growth&days=30');
      const data = await res.json();
      if (data.success) setGrowthData(data.data || []);
    } catch (e) { console.error('fetchGrowth error', e); }
  }, []);

  // 加载用户列表
  const fetchUsers = useCallback(async (page = 1) => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: '20',
      });
      if (keyword) params.set('keyword', keyword);
      if (membershipFilter) params.set('membership_type', membershipFilter);
      if (majorFilter) params.set('major', majorFilter);

      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.data || []);
        setPagination(data.pagination || {});
      }
    } catch (e) { console.error('fetchUsers error', e); }
  }, [keyword, membershipFilter, majorFilter]);

  // 加载用户详情
  const fetchUserDetail = async (userId: number) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/users?action=detail&user_id=${userId}`);
      const data = await res.json();
      if (data.success) setUserDetail(data.data);
    } catch (e) { console.error('fetchUserDetail error', e); }
    setDetailLoading(false);
  };

  useEffect(() => { fetchStats(); fetchGrowth(); }, [fetchStats, fetchGrowth]);
  useEffect(() => { fetchUsers(1); }, [fetchUsers]);

  // 点击用户行
  const handleUserClick = (userId: number) => {
    setSelectedUserId(userId);
    fetchUserDetail(userId);
  };

  // 增长趋势图 SVG
  const renderGrowthChart = () => {
    if (growthData.length === 0) {
      return <div className="text-center text-[#64748B] py-8 text-sm">暂无增长数据</div>;
    }

    const maxCount = Math.max(...growthData.map(d => d.count), 1);
    const chartW = 700;
    const chartH = 160;
    const padX = 40;
    const padY = 20;
    const innerW = chartW - padX * 2;
    const innerH = chartH - padY * 2;

    const points = growthData.map((d, i) => ({
      x: padX + (i / Math.max(growthData.length - 1, 1)) * innerW,
      y: padY + innerH - (d.count / maxCount) * innerH,
    }));

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1]!.x} ${padY + innerH} L ${padX} ${padY + innerH} Z`;

    // Y轴刻度
    const yTicks = [0, Math.round(maxCount * 0.5), maxCount];

    return (
      <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto">
        {/* 网格线 */}
        {yTicks.map((tick, i) => {
          const y = padY + innerH - (tick / maxCount) * innerH;
          return (
            <g key={i}>
              <line x1={padX} y1={y} x2={chartW - padX} y2={y} stroke="#E2E8F0" strokeWidth="0.5" strokeDasharray="4,4" />
              <text x={padX - 6} y={y + 4} textAnchor="end" fill="#94A3B8" fontSize="10">{tick}</text>
            </g>
          );
        })}

        {/* 渐变填充区域 */}
        <defs>
          <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.01" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#growthGrad)" />

        {/* 折线 */}
        <path d={linePath} fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinejoin="round" />

        {/* 数据点 */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="#3B82F6" stroke="white" strokeWidth="1.5" />
        ))}

        {/* X轴日期标签（每隔5个显示） */}
        {growthData.map((d, i) => {
          if (i % 5 !== 0 && i !== growthData.length - 1) return null;
          const x = padX + (i / Math.max(growthData.length - 1, 1)) * innerW;
          return (
            <text key={i} x={x} y={chartH - 2} textAnchor="middle" fill="#94A3B8" fontSize="9">
              {String(d.date).slice(5)}
            </text>
          );
        })}
      </svg>
    );
  };

  // ============ 渲染 ============
  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users className="h-5 w-5" />} label="总用户数" value={stats?.total ?? '-'} color="text-blue-600" />
        <StatCard icon={<Crown className="h-5 w-5" />} label="会员数" value={stats?.members ?? '-'} color="text-amber-500" />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="会员转化率" value={stats ? `${stats.conversionRate}%` : '-'} color="text-emerald-600" />
        <StatCard icon={<UserPlus className="h-5 w-5" />} label="本周新增" value={stats?.weeklyNew ?? '-'} color="text-purple-600" />
      </div>

      {/* 增长趋势 */}
      <Card className="bg-white border-[#E2E8F0] shadow-sm">
        <CardHeader>
          <CardTitle className="text-[#1E293B] text-base">用户增长趋势（近30天）</CardTitle>
        </CardHeader>
        <CardContent>
          {renderGrowthChart()}
        </CardContent>
      </Card>

      {/* 筛选 */}
      <Card className="bg-white border-[#E2E8F0] shadow-sm">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="搜索用户ID/专业/求职意向"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                className="pl-9"
                onKeyDown={e => { if (e.key === 'Enter') fetchUsers(1); }}
              />
            </div>
            <Select value={membershipFilter} onValueChange={v => setMembershipFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="会员状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="free">免费用户</SelectItem>
                <SelectItem value="member">会员</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="专业筛选"
              value={majorFilter}
              onChange={e => setMajorFilter(e.target.value)}
              className="w-[140px]"
            />
            <Button onClick={() => fetchUsers(1)} className="bg-blue-600 hover:bg-blue-700 text-white">
              搜索
            </Button>
            {(keyword || membershipFilter || majorFilter) && (
              <Button
                variant="ghost"
                onClick={() => { setKeyword(''); setMembershipFilter(''); setMajorFilter(''); }}
                className="text-[#64748B] hover:text-[#1E293B]"
              >
                <X className="h-4 w-4 mr-1" />清除
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 用户列表 */}
      <Card className="bg-white border-[#E2E8F0] shadow-sm">
        <CardHeader>
          <CardTitle className="text-[#1E293B] text-base">
            用户列表
            <span className="text-[#64748B] text-sm font-normal ml-2">
              共 {pagination.total} 人
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[#64748B]">ID</TableHead>
                  <TableHead className="text-[#64748B]">专业</TableHead>
                  <TableHead className="text-[#64748B]">年级</TableHead>
                  <TableHead className="text-[#64748B]">求职意向</TableHead>
                  <TableHead className="text-[#64748B]">会员</TableHead>
                  <TableHead className="text-[#64748B]">技能数</TableHead>
                  <TableHead className="text-[#64748B]">测评次数</TableHead>
                  <TableHead className="text-[#64748B]">注册时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-[#64748B] py-8">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : users.map(user => (
                  <TableRow
                    key={user.user_id}
                    className="hover:bg-blue-50/50 cursor-pointer"
                    onClick={() => handleUserClick(user.user_id)}
                  >
                    <TableCell className="text-[#1E293B] font-mono">
                      {user.is_admin && <Badge className="bg-red-600 text-white text-[10px] mr-1 px-1 py-0">Admin</Badge>}
                      {user.user_id}
                    </TableCell>
                    <TableCell className="text-[#1E293B]">{user.major || '-'}</TableCell>
                    <TableCell className="text-[#1E293B]">{user.grade || '-'}</TableCell>
                    <TableCell className="text-[#1E293B] max-w-[150px] truncate">{user.job_intention || '-'}</TableCell>
                    <TableCell>
                      {user.membership_type === 'member' ? (
                        <Badge className="bg-amber-50 text-amber-700 border-amber-200">
                          <Crown className="h-3 w-3 mr-1" />{user.membership_plan || '会员'}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[#64748B] border-[#E2E8F0]">免费</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-[#1E293B]">{user.skill_count}</TableCell>
                    <TableCell className="text-[#1E293B]">{user.assessment_count}</TableCell>
                    <TableCell className="text-[#64748B] text-sm">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString('zh-CN') : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* 分页 */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-[#64748B]">
                第 {pagination.page} / {pagination.totalPages} 页
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline" size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchUsers(pagination.page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline" size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchUsers(pagination.page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 用户详情抽屉 */}
      <Sheet open={!!selectedUserId} onOpenChange={open => { if (!open) { setSelectedUserId(null); setUserDetail(null); } }}>
        <SheetContent className="bg-white border-[#E2E8F0] text-[#1E293B] w-[560px] sm:max-w-[560px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-[#1E293B]">用户详情 — #{selectedUserId}</SheetTitle>
            <SheetDescription className="text-[#64748B]">查看用户完整画像和行为数据</SheetDescription>
          </SheetHeader>

          {detailLoading ? (
            <div className="text-center text-[#64748B] py-12">加载中...</div>
          ) : userDetail ? (
            <div className="mt-6 space-y-6">
              {/* 基本信息 */}
              <DetailSection title="基本信息" icon={<Users className="h-4 w-4" />}>
                <div className="grid grid-cols-2 gap-3">
                  <DetailItem label="专业" value={userDetail.profile.major as string} />
                  <DetailItem label="年级" value={userDetail.profile.grade as string} />
                  <DetailItem label="求职意向" value={userDetail.profile.job_intention as string} />
                  <DetailItem label="城市" value={userDetail.profile.city as string} />
                  <DetailItem label="人格类型" value={userDetail.profile.personality_type as string} />
                  <DetailItem label="会员" value={userDetail.profile.membership_type as string} />
                  <DetailItem label="会员套餐" value={userDetail.profile.membership_plan as string} />
                  <DetailItem label="注册时间" value={userDetail.profile.created_at ? new Date(userDetail.profile.created_at as string).toLocaleDateString('zh-CN') : undefined} />
                </div>
              </DetailSection>

              {/* 技能 */}
              <DetailSection title={`技能 (${userDetail.skills.length})`} icon={<Target className="h-4 w-4" />}>
                {userDetail.skills.length === 0 ? (
                  <div className="text-[#64748B] text-sm">暂无技能数据</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {userDetail.skills.map((s, i) => (
                      <Badge key={i} className="bg-blue-50 text-blue-700 border-blue-200">
                        {s.skill_name as string} Lv.{s.level as number}
                      </Badge>
                    ))}
                  </div>
                )}
              </DetailSection>

              {/* 测评历史 */}
              <DetailSection title={`测评记录 (${userDetail.assessments.length})`} icon={<Activity className="h-4 w-4" />}>
                {userDetail.assessments.length === 0 ? (
                  <div className="text-[#64748B] text-sm">暂无测评记录</div>
                ) : (
                  <div className="space-y-2">
                    {userDetail.assessments.map((a, i) => {
                      let data: Record<string, unknown> = {};
                      try { data = JSON.parse(a.result_data as string); } catch { /* ignore */ }
                      return (
                        <div key={i} className="bg-[#F8FAFC] rounded-lg p-3 text-sm border border-[#E2E8F0]">
                          <div className="flex justify-between text-[#1E293B]">
                            <span>目标: {data.target_position as string || '-'}</span>
                            <span className="text-[#64748B]">{a.created_at ? new Date(a.created_at as string).toLocaleDateString('zh-CN') : ''}</span>
                          </div>
                          <div className="text-[#64748B] mt-1">
                            匹配度: {data.match_score as number ?? '-' as unknown as string}% | 综合得分: {data.overall_score as number ?? '-' as unknown as string}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </DetailSection>

              {/* 匹配记录 */}
              <DetailSection title={`匹配记录 (${userDetail.matches.length})`} icon={<Briefcase className="h-4 w-4" />}>
                {userDetail.matches.length === 0 ? (
                  <div className="text-[#64748B] text-sm">暂无匹配记录</div>
                ) : (
                  <div className="space-y-2">
                    {userDetail.matches.map((m, i) => {
                      let data: Record<string, unknown> = {};
                      try { data = JSON.parse(m.match_data as string); } catch { /* ignore */ }
                      return (
                        <div key={i} className="bg-[#F8FAFC] rounded-lg p-3 text-sm border border-[#E2E8F0]">
                          <div className="text-[#1E293B]">
                            {data.target_position as string || '-'} — 匹配度 {data.match_score as number ?? '-' as unknown as string}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </DetailSection>

              {/* 行为统计 */}
              <DetailSection title="行为统计" icon={<MessageSquare className="h-4 w-4" />}>
                {userDetail.behaviorStats.length === 0 ? (
                  <div className="text-[#64748B] text-sm">暂无行为数据</div>
                ) : (
                  <div className="space-y-2">
                    {userDetail.behaviorStats.map((b, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-[#1E293B]">{b.event_type as string}</span>
                        <span className="text-blue-600 font-mono">{b.count as number}次</span>
                      </div>
                    ))}
                  </div>
                )}
              </DetailSection>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ============ 子组件 ============

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <Card className="bg-white border-[#E2E8F0] shadow-sm">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-3">
          <div className={`${color}`}>{icon}</div>
          <div>
            <div className="text-2xl font-bold text-[#1E293B]">{value}</div>
            <div className="text-sm text-[#64748B]">{label}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-sm font-medium text-blue-600 mb-3">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs text-[#64748B]">{label}</div>
      <div className="text-sm text-[#1E293B]">{value || '-'}</div>
    </div>
  );
}
