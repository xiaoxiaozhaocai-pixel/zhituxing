'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import Image from 'next/image';
import { 
  ArrowLeft, MapPin, DollarSign, Users, Clock, Verified, Star, 
  Crown, Lock, Send, Check, Loader2, Copy, CheckCircle
} from 'lucide-react';

interface Referral {
  id: string;
  title: string;
  company: string;
  logoUrl: string | null;
  position: string;
  location: string | null;
  salary: string | null;
  requirements: string | null;
  benefits: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactWechat: string | null;
  isVerified: boolean;
  isFeatured: boolean;
  views: number;
  appliesCount: number;
  expiresAt: string | null;
  createdAt: string;
}

export default function ReferralDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, quota } = useAuth();
  const [referral, setReferral] = useState<Referral | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showContact, setShowContact] = useState(false);

  const isMember = quota?.is_member;

  useEffect(() => {
    if (params.id) {
      fetchReferral();
    }
  }, [params.id]);

  const fetchReferral = async () => {
    try {
      const res = await fetch(`/api/referrals/${params.id}`);
      const data = await res.json();

      if (data.success) {
        setReferral(data.data);
      }
    } catch (error) {
      console.error('获取内推详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!isAuthenticated) {
      router.push('/auth?redirect=' + encodeURIComponent(`/referrals/${params.id}`));
      return;
    }

    if (!isMember) {
      router.push('/membership');
      return;
    }

    setApplying(true);

    try {
      const res = await fetch(`/api/referrals/${params.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user!.id
        },
        body: JSON.stringify({})
      });

      const data = await res.json();

      if (data.success) {
        setApplied(true);
      } else {
        alert(data.error || '申请失败');
      }
    } catch (error) {
      console.error('申请失败:', error);
      alert('申请失败，请重试');
    } finally {
      setApplying(false);
    }
  };

  const copyWechat = async () => {
    if (referral?.contactWechat) {
      await navigator.clipboard.writeText(referral.contactWechat);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!referral) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">内推不存在或已下架</p>
          <Link href="/referrals">
            <Button>返回内推列表</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Back Button */}
        <Link href="/referrals" className="inline-flex items-center gap-2 text-gray-600 hover:text-[#165DFF] mb-6">
          <ArrowLeft className="w-4 h-4" />
          返回内推列表
        </Link>

        {/* Main Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
                  {referral.logoUrl ? (
                    <Image src={referral.logoUrl} alt={referral.company} width={56} height={56} className="rounded-lg object-cover" unoptimized />
                  ) : (
                    <span className="text-2xl font-bold text-gray-600">{referral.company.charAt(0)}</span>
                  )}
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold">{referral.company}</CardTitle>
                  <p className="text-lg text-gray-600 mt-1">{referral.position}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {referral.isVerified && (
                      <Badge className="bg-green-500 text-white">
                        <Verified className="w-3 h-3 mr-1" />
                        已认证
                      </Badge>
                    )}
                    {referral.isFeatured && (
                      <Badge className="bg-orange-500 text-white">
                        <Star className="w-3 h-3 mr-1" />
                        精选内推
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="flex flex-wrap gap-4 mb-6 pb-6 border-b">
              {referral.location && (
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  {referral.location}
                </div>
              )}
              {referral.salary && (
                <div className="flex items-center gap-2 text-orange-600 font-semibold">
                  <DollarSign className="w-5 h-5" />
                  {referral.salary}
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="w-5 h-5 text-gray-400" />
                {referral.appliesCount}人已申请
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="w-5 h-5 text-gray-400" />
                {new Date(referral.createdAt).toLocaleDateString('zh-CN')}
              </div>
            </div>

            {/* Title */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">职位描述</h3>
              <p className="text-gray-600">{referral.title}</p>
            </div>

            {/* Requirements */}
            {referral.requirements && (
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">岗位要求</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap text-gray-600 text-sm">{referral.requirements}</pre>
                </div>
              </div>
            )}

            {/* Benefits */}
            {referral.benefits && (
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">福利待遇</h3>
                <div className="bg-green-50 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap text-green-700 text-sm">{referral.benefits}</pre>
                </div>
              </div>
            )}

            {/* Contact Info - Member Only */}
            {isMember ? (
              <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Crown className="w-6 h-6 text-orange-500" />
                  <h3 className="text-lg font-bold text-gray-900">内推联系方式</h3>
                </div>
                
                <div className="space-y-4">
                  {referral.contactName && (
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 w-20">联系人：</span>
                      <span className="font-medium">{referral.contactName}</span>
                    </div>
                  )}
                  
                  {referral.contactWechat && (
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 w-20">微信：</span>
                      <span className="font-medium">{referral.contactWechat}</span>
                      <Button size="sm" variant="outline" onClick={copyWechat}>
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span className="ml-1">{copied ? '已复制' : '复制'}</span>
                      </Button>
                    </div>
                  )}
                  
                  {referral.contactEmail && (
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 w-20">邮箱：</span>
                      <span className="font-medium">{referral.contactEmail}</span>
                    </div>
                  )}
                </div>

                {!applied ? (
                  <Button 
                    className="w-full mt-6 bg-gradient-to-r from-[#FF7D00] to-[#FF9A2E] hover:opacity-90"
                    onClick={handleApply}
                    disabled={applying}
                  >
                    {applying ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5 mr-2" />
                    )}
                    申请内推
                  </Button>
                ) : (
                  <div className="mt-6 bg-green-500 text-white rounded-lg p-4 flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    申请成功！内推人会尽快联系你
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-100 rounded-xl p-6">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Lock className="w-6 h-6 text-gray-400" />
                  <h3 className="text-lg font-bold text-gray-900">会员专享联系方式</h3>
                </div>
                <p className="text-center text-gray-600 mb-4">
                  开通会员即可查看完整联系方式，直接对接内推人
                </p>
                <Link href="/membership">
                  <Button className="w-full bg-gradient-to-r from-[#FF7D00] to-[#FF9A2E] hover:opacity-90">
                    <Crown className="w-5 h-5 mr-2" />
                    开通会员查看
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <h4 className="font-bold text-blue-800 mb-2">💡 内推小贴士</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 内推可以跳过简历筛选，直接进入面试环节</li>
              <li>• 投递前建议完善简历，提高面试通过率</li>
              <li>• 保持手机畅通，内推人可能会电话联系你</li>
              <li>• 面试后可以联系内推人查询进度</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
