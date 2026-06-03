'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, DollarSign, Users, Clock, Verified, Star, Crown, Loader2 } from 'lucide-react';

interface Referral {
  id: string;
  title: string;
  company: string;
  logoUrl: string | null;
  position: string;
  location: string | null;
  salary: string | null;
  isVerified: boolean;
  isFeatured: boolean;
  views: number;
  appliesCount: number;
  expiresAt: string | null;
  createdAt: string;
}

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchReferrals();
  }, [selectedCity]);

  const fetchReferrals = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCity) params.set('location', selectedCity);
      if (searchKeyword) params.set('keyword', searchKeyword);
      params.set('limit', '50');

      const res = await fetch(`/api/referrals?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setReferrals(data.data.referrals);
        setCities(data.data.cities || []);
        setTotal(data.data.total);
      }
    } catch (error) {
      console.error('获取内推列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReferrals();
  };

  const formatTime = (time: string) => {
    const date = new Date(time);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  // 默认示例数据（API无数据时展示）
  const defaultReferrals: Referral[] = [
    {
      id: '1',
      title: '字节跳动2026届校招内推',
      company: '字节跳动',
      logoUrl: null,
      position: '前端开发工程师',
      location: '北京',
      salary: '30k-50k',
      isVerified: true,
      isFeatured: true,
      views: 1256,
      appliesCount: 89,
      expiresAt: null,
      createdAt: '2026-01-15'
    },
    {
      id: '2',
      title: '腾讯微信团队急招',
      company: '腾讯',
      logoUrl: null,
      position: '后台开发工程师',
      location: '深圳',
      salary: '28k-45k',
      isVerified: true,
      isFeatured: true,
      views: 987,
      appliesCount: 56,
      expiresAt: null,
      createdAt: '2026-01-14'
    },
    {
      id: '3',
      title: '阿里巴巴淘宝前端团队内推',
      company: '阿里巴巴',
      logoUrl: null,
      position: '前端开发工程师',
      location: '杭州',
      salary: '25k-40k',
      isVerified: true,
      isFeatured: false,
      views: 654,
      appliesCount: 34,
      expiresAt: null,
      createdAt: '2026-01-13'
    }
  ];

  const displayReferrals = referrals.length > 0 ? referrals : defaultReferrals;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">内推专区</h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            汇聚各大厂真实内推机会，跳过简历筛选，直通面试！
            <span className="text-orange-600 font-medium">会员优先查看完整联系方式</span>
          </p>
        </div>

        {/* VIP Banner */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-6 mb-8 text-white">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Crown className="w-10 h-10" />
              <div>
                <h3 className="text-xl font-bold">会员专享内推权益</h3>
                <p className="text-white/80 text-sm">开通会员可查看完整联系方式，直接对接内推人</p>
              </div>
            </div>
            <Link href="/membership">
              <Button className="bg-white text-orange-600 hover:bg-gray-100">
                <Crown className="w-4 h-4 mr-2" />
                开通会员
              </Button>
            </Link>
          </div>
        </div>

        {/* Search & Filter */}
        <Card className="mb-8">
          <CardContent className="p-4">
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="搜索公司、职位..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant={selectedCity === '' ? 'default' : 'outline'}
                  onClick={() => setSelectedCity('')}
                  className={selectedCity === '' ? 'bg-[#165DFF]' : ''}
                >
                  全国
                </Button>
                {cities.slice(0, 6).map((city) => (
                  <Button
                    key={city}
                    type="button"
                    variant={selectedCity === city ? 'default' : 'outline'}
                    onClick={() => setSelectedCity(city)}
                    className={selectedCity === city ? 'bg-[#165DFF]' : ''}
                  >
                    {city}
                  </Button>
                ))}
              </div>
              <Button type="submit" className="bg-[#165DFF]">
                搜索
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-600">
            共找到 <strong className="text-[#165DFF]">{total || displayReferrals.length}</strong> 个内推机会
          </p>
        </div>

        {/* Referrals List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayReferrals.map((referral) => (
              <Card 
                key={referral.id}
                className={`border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${
                  referral.isFeatured ? 'border-orange-200' : 'border-gray-100'
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
                        {referral.logoUrl ? (
                          <img src={referral.logoUrl} alt={referral.company} className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <span className="text-lg font-bold text-gray-600">{referral.company.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold">{referral.company}</CardTitle>
                        <p className="text-sm text-gray-500">{referral.position}</p>
                      </div>
                    </div>
                    {referral.isFeatured && (
                      <Badge className="bg-orange-500 text-white">
                        <Star className="w-3 h-3 mr-1" />
                        精选
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {referral.location && (
                        <Badge variant="outline" className="text-gray-600">
                          <MapPin className="w-3 h-3 mr-1" />
                          {referral.location}
                        </Badge>
                      )}
                      {referral.salary && (
                        <Badge variant="outline" className="text-orange-600 border-orange-200">
                          <DollarSign className="w-3 h-3 mr-1" />
                          {referral.salary}
                        </Badge>
                      )}
                      {referral.isVerified && (
                        <Badge variant="outline" className="text-green-600 border-green-200">
                          <Verified className="w-3 h-3 mr-1" />
                          已认证
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 line-clamp-2">
                      {referral.title}
                    </p>

                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {referral.appliesCount}人已申请
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(referral.createdAt)}
                      </span>
                    </div>
                  </div>

                  <Link href={`/referrals/${referral.id}`} className="mt-4 block">
                    <Button className="w-full bg-gradient-to-r from-[#165DFF] to-[#4080FF] hover:opacity-90">
                      查看详情
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {displayReferrals.length === 0 && !loading && (
          <div className="text-center py-16">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">暂无内推信息</p>
            <p className="text-sm text-gray-400 mt-2">敬请期待更多内推机会</p>
          </div>
        )}
      </div>
    </div>
  );
}
