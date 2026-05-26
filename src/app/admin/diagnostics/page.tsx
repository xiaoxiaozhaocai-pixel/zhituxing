'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Database, Globe, Shield, Radio, FileCode } from 'lucide-react';

interface DiagnosticItem {
  name: string;
  status: number;
  result: 'pass' | 'fail' | 'warn';
  detail: string;
  count?: number;
  min?: number;
  table?: string;
}

interface Category {
  pass: number;
  fail: number;
  warn: number;
  items: DiagnosticItem[];
}

interface DiagnosticsResult {
  success: boolean;
  health: number;
  categories: {
    api: Category;
    pages: Category;
    sse: Category;
    security: Category;
    database: Category;
  };
  timestamp: string;
}

const categoryConfig = {
  database: { label: '数据库状态', icon: Database, color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
  api: { label: 'API端点', icon: FileCode, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  pages: { label: '页面路由', icon: Globe, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
  security: { label: '安全检查', icon: Shield, color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
  sse: { label: 'SSE流测试', icon: Radio, color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
};

export default function DiagnosticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DiagnosticsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDiagnostics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/diagnostics', {
        credentials: 'include',
      });
      const result = await res.json();
      if (result.error) {
        setError(result.error);
      } else {
        setData(result);
      }
    } catch (e: any) {
      setError(e.message || '获取诊断数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiagnostics();
  }, [fetchDiagnostics]);

  const getStatusIcon = (result: 'pass' | 'fail' | 'warn' | 'loading') => {
    switch (result) {
      case 'pass':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'fail':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warn':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'loading':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    }
  };

  const getHealthColor = (health: number) => {
    if (health >= 80) return 'text-green-600';
    if (health >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBgColor = (health: number) => {
    if (health >= 80) return 'bg-green-500';
    if (health >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const renderCategoryCard = (key: keyof typeof categoryConfig) => {
    const config = categoryConfig[key];
    const category = data?.categories[key];
    if (!category) return null;

    const Icon = config.icon;
    const total = category.pass + category.fail + category.warn;

    return (
      <Card key={key} className={`${config.bgColor} ${config.borderColor} border`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className={`w-5 h-5 ${config.color}`} />
            {config.label}
            <span className="ml-auto text-sm font-normal text-gray-600">
              {category.pass}/{total} 通过
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {category.items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-1.5 px-2 bg-white/60 rounded-lg">
                <div className="flex items-center gap-2">
                  {getStatusIcon(item.result)}
                  <span className="text-sm text-gray-700">{item.name}</span>
                </div>
                <span className="text-xs text-gray-500">
                  {item.table ? `${item.count}/${item.min}` : item.detail}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* 概览卡片 */}
      <Card className="bg-white">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-[#1E293B]">网站健康诊断</h2>
              <p className="text-sm text-gray-500 mt-1">
                {data?.timestamp ? `检测时间: ${new Date(data.timestamp).toLocaleString('zh-CN')}` : '检测中...'}
              </p>
            </div>
            <Button
              onClick={fetchDiagnostics}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              一键重新检测
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <span className="ml-3 text-gray-600">正在执行诊断，请稍候...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">
              <XCircle className="w-12 h-12 mx-auto mb-3" />
              <p>{error}</p>
            </div>
          ) : data ? (
            <>
              {/* 健康度概览 */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center">
                  <div className={`text-3xl font-bold ${getHealthColor(data.health)}`}>
                    {data.health}%
                  </div>
                  <div className="text-sm text-gray-600 mt-1">健康度</div>
                  <div className={`mt-2 h-2 bg-gray-200 rounded-full overflow-hidden`}>
                    <div 
                      className={`h-full ${getHealthBgColor(data.health)} transition-all duration-500`}
                      style={{ width: `${data.health}%` }}
                    />
                  </div>
                </div>
                
                {(() => {
                  const totals = {
                    pass: 0, fail: 0, warn: 0
                  };
                  Object.values(data.categories).forEach(cat => {
                    totals.pass += cat.pass;
                    totals.fail += cat.fail;
                    totals.warn += cat.warn;
                  });
                  const total = totals.pass + totals.fail + totals.warn;
                  return (
                    <>
                      <div className="bg-gray-50 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-gray-700">{total}</div>
                        <div className="text-sm text-gray-500 mt-1">总测试项</div>
                      </div>
                      <div className="bg-green-50 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">{totals.pass}</div>
                        <div className="text-sm text-gray-500 mt-1">通过</div>
                      </div>
                      <div className="bg-yellow-50 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-yellow-600">{totals.warn}</div>
                        <div className="text-sm text-gray-500 mt-1">警告</div>
                      </div>
                      <div className="bg-red-50 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-red-600">{totals.fail}</div>
                        <div className="text-sm text-gray-500 mt-1">失败</div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* 分类卡片 */}
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {Object.keys(categoryConfig).map(key => 
                  renderCategoryCard(key as keyof typeof categoryConfig)
                )}
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
