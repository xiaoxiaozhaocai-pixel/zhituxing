'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Settings,
  Globe,
  Crown,
  Gift,
  Loader2,
  Save } from 'lucide-react';

export default function SettingsPage() {
  const { admin } = useAdminAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  const [settings, setSettings] = useState({
    // 网站基本设置
    site_name: '职途星',
    site_logo: '',
    icp_number: '',
    contact_email: '',
    contact_wechat: '',
    
    // 会员设置
    monthly_price: '9.9',
    lifetime_price: '9.9',
    monthly_member_benefits: 'AI模拟面试无限次+能力测评完整版+求职大礼包',
    
    // 激励规则
    jd_reward_for_new: '3',
    jd_reward_monthly: '6',
    jd_reward_limit: '3',
    
    // 同步设置
    sync_frequency: '3',
    sync_pages_per_platform: '10',
    sync_auto_cleanup_days: '30'
  });

  useEffect(() => {
// eslint-disable-next-line
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/admin/api/settings');
      const data = await response.json();
      
      if (data.code === 200) {
        setSettings(prev => ({ ...prev, ...data.data }));
      }
    } catch (error) {
      console.error('获取设置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    
    try {
      const response = await fetch('/admin/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings,
          adminId: admin?.id,
          adminUsername: admin?.username
        })
      });
      
      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">系统设置</h1>
        
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {saving ? '保存中...' : '保存设置'}
        </Button>
      </div>

      {saved && (
        <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg text-center">
          设置已保存成功
        </div>
      )}

      {/* 网站基本设置 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">网站基本设置</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">网站名称</label>
              <Input
                value={settings.site_name}
                onChange={(e) => updateSetting('site_name', e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">备案号</label>
              <Input
                value={settings.icp_number}
                onChange={(e) => updateSetting('icp_number', e.target.value)}
                placeholder="如：京ICP备XXXXXXXX号"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">客服邮箱</label>
              <Input
                value={settings.contact_email}
                onChange={(e) => updateSetting('contact_email', e.target.value)}
                placeholder="support@example.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">客服微信</label>
              <Input
                value={settings.contact_wechat}
                onChange={(e) => updateSetting('contact_wechat', e.target.value)}
                placeholder="微信号"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 会员设置 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="w-5 h-5 text-orange-600" />
            <h2 className="text-lg font-semibold">会员设置</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">月度会员价格（元/月）</label>
              <Input
                type="number"
                value={settings.monthly_price}
                onChange={(e) => updateSetting('monthly_price', e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">终身会员价格（元/永久）</label>
              <Input
                type="number"
                value={settings.lifetime_price}
                onChange={(e) => updateSetting('lifetime_price', e.target.value)}
              />
            </div>
            
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">月度会员权益</label>
              <textarea
                value={settings.monthly_member_benefits}
                onChange={(e) => updateSetting('monthly_member_benefits', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 激励规则设置 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Gift className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">JD上传激励规则</h2>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">新用户需上传JD数</label>
              <Input
                type="number"
                value={settings.jd_reward_for_new}
                onChange={(e) => updateSetting('jd_reward_for_new', e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">通过审核后获得终身会员</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">已有会员额外奖励月数</label>
              <Input
                type="number"
                value={settings.jd_reward_monthly}
                onChange={(e) => updateSetting('jd_reward_monthly', e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">已有月度会员的奖励</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">每人累计奖励上限</label>
              <Input
                type="number"
                value={settings.jd_reward_limit}
                onChange={(e) => updateSetting('jd_reward_limit', e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">防止刷奖励</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 同步设置 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">JD同步设置</h2>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">每日同步次数</label>
              <select
                value={settings.sync_frequency}
                onChange={(e) => updateSetting('sync_frequency', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="1">1次/天</option>
                <option value="2">2次/天</option>
                <option value="3">3次/天</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">每平台每次拉取页数</label>
              <Input
                type="number"
                value={settings.sync_pages_per_platform}
                onChange={(e) => updateSetting('sync_pages_per_platform', e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">自动清理过期数据（天）</label>
              <Input
                type="number"
                value={settings.sync_auto_cleanup_days}
                onChange={(e) => updateSetting('sync_auto_cleanup_days', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
