'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import {
  Download,
  Loader2,
  Users,
  Database,
  FileText,
  ShoppingCart,
  Crown,
  Calendar,
  CheckCircle
} from 'lucide-react';

type ExportType = 'users' | 'members' | 'jobs' | 'articles' | 'orders' | 'all';

interface ExportOption {
  type: ExportType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  fields: string[];
}

const exportOptions: ExportOption[] = [
  {
    type: 'users',
    label: '用户数据',
    icon: Users,
    description: '导出所有注册用户的基本信息',
    fields: ['ID', '用户名', '手机号', '注册时间', '会员状态', '是否完善信息']
  },
  {
    type: 'members',
    label: '会员数据',
    icon: Crown,
    description: '导出所有会员用户的详细信息',
    fields: ['用户ID', '用户名', '会员类型', '开始时间', '到期时间', '支付金额']
  },
  {
    type: 'jobs',
    label: '岗位数据',
    icon: Database,
    description: '导出所有岗位JD信息',
    fields: ['ID', '岗位名称', '公司名称', '城市', '薪资范围', '来源平台', '创建时间']
  },
  {
    type: 'articles',
    label: '文章数据',
    icon: FileText,
    description: '导出所有求职干货文章',
    fields: ['ID', '标题', '分类', '标签', '浏览量', '创建时间']
  },
  {
    type: 'orders',
    label: '订单数据',
    icon: ShoppingCart,
    description: '导出所有支付订单记录',
    fields: ['订单号', '用户ID', '商品类型', '金额', '支付状态', '创建时间']
  },
  {
    type: 'all',
    label: '全量数据',
    icon: Download,
    description: '导出平台所有核心数据（分多个文件）',
    fields: ['包含上述所有数据，一次性导出']
  }
];

export default function ExportPage() {
  const { admin } = useAdminAuth();
  
  const [selectedType, setSelectedType] = useState<ExportType | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{ success: boolean; message: string; files?: string[] } | null>(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const handleExport = async () => {
    if (!selectedType) return;
    
    setExporting(true);
    setExportResult(null);
    
    try {
      const response = await fetch('/admin/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          dateRange,
          adminId: admin?.id
        })
      });
      
      const result = await response.json();
      setExportResult({
        success: result.code === 200,
        message: result.message,
        files: result.data?.files
      });
    } catch (error) {
      setExportResult({
        success: false,
        message: '导出失败，请稍后重试'
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">数据导出</h1>
      </div>

      {/* 导出类型选择 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {exportOptions.map(option => {
          const Icon = option.icon;
          const isSelected = selectedType === option.type;
          
          return (
            <Card 
              key={option.type}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected ? 'ring-2 ring-purple-600 bg-purple-50' : ''
              }`}
              onClick={() => setSelectedType(option.type)}
            >
              <CardContent className="p-4 text-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                  isSelected ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-medium text-sm">{option.label}</h3>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 选中项详情 */}
      {selectedType && (
        <Card>
          <CardHeader>
            <CardTitle>{exportOptions.find(o => o.type === selectedType)?.label}</CardTitle>
            <CardDescription>
              {exportOptions.find(o => o.type === selectedType)?.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <h4 className="text-sm font-medium mb-2">导出字段</h4>
              <div className="flex flex-wrap gap-2">
                {exportOptions.find(o => o.type === selectedType)?.fields.map(field => (
                  <Badge key={field} variant="outline">{field}</Badge>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-sm font-medium mb-2">时间范围（可选）</h4>
              <div className="flex gap-4 items-center">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">从</span>
                  <Input 
                    type="date" 
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="w-40"
                  />
                </div>
                <span className="text-gray-400">至</span>
                <Input 
                  type="date" 
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="w-40"
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setDateRange({ start: '', end: '' })}
                >
                  清空
                </Button>
              </div>
            </div>

            <Button 
              onClick={handleExport}
              disabled={exporting}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  导出中...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  开始导出
                </>
              )}
            </Button>

            {exportResult && (
              <div className={`mt-4 p-4 rounded-lg ${
                exportResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center gap-2">
                  {exportResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <Download className="w-5 h-5 text-red-600" />
                  )}
                  <span className={exportResult.success ? 'text-green-700' : 'text-red-700'}>
                    {exportResult.message}
                  </span>
                </div>
                {exportResult.files && exportResult.files.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-600 mb-2">已生成文件：</p>
                    <ul className="space-y-1">
                      {exportResult.files.map((file, index) => (
                        <li key={index} className="text-sm text-purple-600 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          {file}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 导出说明 */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <h3 className="font-medium mb-2">导出说明</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• 导出的数据格式为 Excel (.xlsx)</li>
            <li>• 大量数据导出可能需要数秒，请耐心等待</li>
            <li>• 可选择时间范围筛选导出的数据</li>
            <li>• 全量导出将生成多个文件，请全部下载保存</li>
            <li>• 数据包含敏感信息，请妥善保管导出的文件</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
