'use client';

import { useState, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  RefreshCw
} from 'lucide-react';
import { loadXLSX } from '@/lib/dynamic-imports';

interface JDRow {
  id: string;
  rowIndex: number;
  jobName: string;
  companyName: string;
  city: string;
  salaryMin: string;
  salaryMax: string;
  industry: string;
  companyType: string;
  jobDesc: string;
  isFreshFriendly: string;
  status: 'pending' | 'valid' | 'error' | 'duplicate';
  errors: string[];
  isSelected: boolean;
}

interface ImportResult {
  success: number;
  failed: number;
  skipped: number;
  errors: { rowIndex: number; error: string }[];
}

interface BatchImportModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// 模板字段定义
const TEMPLATE_FIELDS = [
  { key: 'jobName', label: '岗位名称', required: true, example: '如：HRBP（校招）' },
  { key: 'companyName', label: '企业名称', required: true, example: '如：腾讯' },
  { key: 'city', label: '城市', required: true, example: '如：深圳/桂林' },
  { key: 'salaryMin', label: '薪资下限(K)', required: false, example: '如：12（代表12000元/月）' },
  { key: 'salaryMax', label: '薪资上限(K)', required: false, example: '如：20（代表20000元/月）' },
  { key: 'industry', label: '行业', required: false, example: '如：互联网/金融/教育' },
  { key: 'companyType', label: '企业类型', required: false, example: '国企/民企/上市公司/外企/事业单位' },
  { key: 'jobDesc', label: '岗位描述', required: false, example: '可粘贴完整JD文本' },
  { key: 'isFreshFriendly', label: '应届友好', required: false, example: '是/否，默认值「是」' },
];

const COMPANY_TYPES = ['国企', '民企', '上市公司', '外企', '事业单位'];

export default function BatchImportModal({ show, onClose, onSuccess }: BatchImportModalProps) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<JDRow[]>([]);
  const [stats, setStats] = useState({ total: 0, valid: 0, error: 0, duplicate: 0 });
  const [duplicateOption, setDuplicateOption] = useState<'skip' | 'overwrite' | 'ask'>('skip');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [editingRow, setEditingRow] = useState<JDRow | null>(null);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 重置状态
  const reset = () => {
    setStep(1);
    setFile(null);
    setData([]);
    setStats({ total: 0, valid: 0, error: 0, duplicate: 0 });
    setDuplicateOption('skip');
    setImporting(false);
    setImportResult(null);
    setEditingRow(null);
  };

  // 关闭弹窗
  const handleClose = () => {
    reset();
    onClose();
  };

  // 下载模板
  const downloadTemplate = async () => {
    const wsData = [
      ['岗位名称*', '企业名称*', '城市*', '薪资下限(K)', '薪资上限(K)', '行业', '企业类型', '岗位描述', '应届友好'],
      ['HRBP（校招）', '腾讯', '深圳', '12', '20', '互联网', '上市公司', '负责校园招聘...', '是'],
      ['产品经理', '阿里巴巴', '杭州', '15', '30', '互联网', '上市公司', '负责产品规划...', '是'],
    ];
    // 动态加载xlsx（~300KB，按需加载）
    const XLSX = await loadXLSX();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'JD导入模板');
    XLSX.writeFile(wb, 'JD批量导入模板.xlsx');
  };

  // 处理文件上传
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];

    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.csv')) {
      alert('请上传 Excel 或 CSV 格式的文件');
      return;
    }

    setFile(selectedFile);
    parseFile(selectedFile);
  };

  // 拖拽上传
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ];
      if (!validTypes.includes(droppedFile.type) && !droppedFile.name.endsWith('.csv')) {
        alert('请上传 Excel 或 CSV 格式的文件');
        return;
      }
      setFile(droppedFile);
      parseFile(droppedFile);
    }
  }, []);

  // 解析文件
  const parseFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        // 动态加载xlsx（~300KB，按需加载）
        const XLSX = await loadXLSX();
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        // 解析数据行（跳过表头）
        const rows: JDRow[] = jsonData.slice(1).map((row, index) => ({
          id: `row_${index}_${Date.now()}`,
          rowIndex: index + 2, // Excel行号从2开始（1是表头）
          jobName: row[0] || '',
          companyName: row[1] || '',
          city: row[2] || '',
          salaryMin: String(row[3] || ''),
          salaryMax: String(row[4] || ''),
          industry: row[5] || '',
          companyType: row[6] || '',
          jobDesc: row[7] || '',
          isFreshFriendly: row[8] || '是',
          status: 'pending' as const,
          errors: [],
          isSelected: true,
        })).filter(row => row.jobName || row.companyName || row.city);

        // 进入步骤2进行校验
        setData(rows);
        setStep(2);
        validateData(rows);
      } catch (error) {
        console.error('解析文件失败:', error);
        alert('文件解析失败，请确保文件格式正确');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // 校验数据
  const validateData = async (rows: JDRow[]) => {
    setIsCheckingDuplicates(true);
    
    // 获取现有岗位数据进行去重检测
    let existingJobs: { job_name: string; company_name: string; city: string }[] = [];
    try {
      const res = await fetch('/admin/api/jobs?pageSize=10000');
      const result = await res.json();
      if (result.code === 200) {
        existingJobs = result.data.list.map((j: { job_name: string; company_name: string; city: string }) => ({
          job_name: j.job_name,
          company_name: j.company_name,
          city: j.city
        }));
      }
    } catch (error) {
      console.error('获取现有岗位失败:', error);
    }

    // 校验每行数据
    const validated = rows.map(row => {
      const errors: string[] = [];

      // 必填项校验
      if (!row.jobName.trim()) errors.push('岗位名称不能为空');
      if (!row.companyName.trim()) errors.push('企业名称不能为空');
      if (!row.city.trim()) errors.push('城市不能为空');

      // 薪资格式校验
      if (row.salaryMin && (isNaN(Number(row.salaryMin)) || Number(row.salaryMin) < 0)) {
        errors.push('薪资下限格式无效，请输入数字');
      }
      if (row.salaryMax && (isNaN(Number(row.salaryMax)) || Number(row.salaryMax) < 0)) {
        errors.push('薪资上限格式无效，请输入数字');
      }

      // 企业类型校验
      if (row.companyType && !COMPANY_TYPES.includes(row.companyType)) {
        errors.push('企业类型无效，请使用预设选项');
      }

      // 应届友好格式处理
      if (row.isFreshFriendly !== '是' && row.isFreshFriendly !== '否') {
        row.isFreshFriendly = '是'; // 默认值
      }

      // 去重检测
      const isDuplicate = existingJobs.some(
        existing => 
          existing.job_name === row.jobName &&
          existing.company_name === row.companyName &&
          existing.city === row.city
      );

      if (isDuplicate) {
        errors.push('与现有数据重复');
      }

      // 设置状态
      if (errors.length > 0) {
        const hasDuplicateError = errors.includes('与现有数据重复');
        row.status = hasDuplicateError && errors.length === 1 ? 'duplicate' : (errors.length > 0 ? 'error' : 'valid');
      } else {
        row.status = 'valid';
      }
      row.errors = errors;

      return row;
    });

    setData(validated);
    
    // 更新统计
    const validCount = validated.filter(r => r.status === 'valid').length;
    const errorCount = validated.filter(r => r.status === 'error').length;
    const duplicateCount = validated.filter(r => r.status === 'duplicate').length;
    
    setStats({
      total: validated.length,
      valid: validCount,
      error: errorCount,
      duplicate: duplicateCount
    });

    setIsCheckingDuplicates(false);
  };

  // 重新校验
  const revalidate = () => {
    const selectedRows = data.filter(r => r.isSelected);
    validateData(selectedRows);
  };

  // 切换选中行
  const toggleRowSelection = (id: string) => {
    setData(prev => prev.map(row => 
      row.id === id ? { ...row, isSelected: !row.isSelected } : row
    ));
  };

  // 批量设置应届友好
  const setAllFreshFriendly = (value: string) => {
    setData(prev => prev.map(row => ({ ...row, isFreshFriendly: value })));
  };

  // 批量设置企业类型
  const setAllCompanyType = (value: string) => {
    setData(prev => prev.map(row => ({ ...row, companyType: value })));
  };

  // 删除选中行
  const deleteSelectedRows = () => {
    setData(prev => prev.filter(row => !row.isSelected || row.status === 'error'));
    // 重新计算统计
    setTimeout(revalidate, 100);
  };

  // 删除错误行
  const deleteErrorRow = (id: string) => {
    setData(prev => prev.filter(row => row.id !== id));
    setTimeout(revalidate, 100);
  };

  // 编辑行
  const startEditRow = (row: JDRow) => {
    setEditingRow({ ...row });
  };

  // 保存编辑
  const saveEditRow = () => {
    if (!editingRow) return;
    
    // 简单校验
    const errors: string[] = [];
    if (!editingRow.jobName.trim()) errors.push('岗位名称不能为空');
    if (!editingRow.companyName.trim()) errors.push('企业名称不能为空');
    if (!editingRow.city.trim()) errors.push('城市不能为空');
    if (editingRow.salaryMin && (isNaN(Number(editingRow.salaryMin)) || Number(editingRow.salaryMin) < 0)) {
      errors.push('薪资下限格式无效');
    }
    if (editingRow.companyType && !COMPANY_TYPES.includes(editingRow.companyType)) {
      errors.push('企业类型无效');
    }

    editingRow.errors = errors;
    editingRow.status = errors.length > 0 ? 'error' : 'valid';

    setData(prev => prev.map(row => row.id === editingRow.id ? editingRow : row));
    setEditingRow(null);
    setTimeout(revalidate, 100);
  };

  // 执行导入
  const executeImport = async () => {
    setImporting(true);
    
    const validRows = data.filter(r => r.status === 'valid' && r.isSelected);
    const duplicateRows = data.filter(r => r.status === 'duplicate' && r.isSelected);
    
    // 根据选项处理重复数据
    let rowsToImport = [...validRows];
    if (duplicateOption === 'overwrite') {
      // 标记为更新模式
      rowsToImport = [...rowsToImport, ...duplicateRows.map(r => ({ ...r, _update: true }))];
    } else if (duplicateOption === 'ask') {
      // 只导入非重复的
      rowsToImport = validRows;
    }
    // duplicateOption === 'skip' 时不处理重复数据

    const result: ImportResult = {
      success: 0,
      failed: 0,
      skipped: duplicateOption === 'skip' ? duplicateRows.length : 0,
      errors: []
    };

    try {
      // 分批导入，每批100条
      const batchSize = 100;
      for (let i = 0; i < rowsToImport.length; i += batchSize) {
        const batch = rowsToImport.slice(i, i + batchSize);
        
        const response = await fetch('/admin/api/jobs/batch-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            jobs: batch.map(r => ({
              job_name: r.jobName,
              company_name: r.companyName,
              city: r.city,
              salary_range: r.salaryMin && r.salaryMax ? `${r.salaryMin}K-${r.salaryMax}K` : (r.salaryMin ? `${r.salaryMin}K以上` : ''),
              industry: r.industry,
              company_type: r.companyType,
              job_description: r.jobDesc,
              is_fresh_friendly: r.isFreshFriendly === '是' ? 1 : 0,
              source: '管理员批量导入'
            })),
            duplicateOption
          })
        });

        const res = await response.json();
        if (res.code === 200) {
          result.success += res.data.successCount;
          result.failed += res.data.failedCount;
          result.errors.push(...res.data.errors);
        } else {
          result.failed += batch.length;
        }
      }
    } catch (error) {
      console.error('导入失败:', error);
      result.failed = rowsToImport.length;
    }

    setImportResult(result);
    setStep(4);
    setImporting(false);
  };

  // 下载错误报告
  const downloadErrorReport = async () => {
    if (!importResult) return;
    
    const wsData = [
      ['行号', '错误原因'],
      ...importResult.errors.map(e => [e.rowIndex, e.error])
    ];
    // 动态加载xlsx（~300KB，按需加载）
    const XLSX = await loadXLSX();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '导入错误报告');
    XLSX.writeFile(wb, '导入错误报告.xlsx');
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold">批量导入JD</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {step === 1 && '步骤1: 上传文件'}
              {step === 2 && '步骤2: 解析与校验'}
              {step === 3 && '步骤3: 预览与编辑'}
              {step === 4 && '步骤4: 导入结果'}
            </span>
            <button onClick={handleClose}><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* 步骤指示器 */}
        <div className="flex items-center justify-center py-4 bg-gray-50">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${step >= s ? 'bg-purple-600 text-white' : 'bg-gray-300 text-gray-500'}
              `}>
                {step > s ? <CheckCircle className="w-5 h-5" /> : s}
              </div>
              {s < 4 && (
                <div className={`w-16 h-1 mx-2 ${step > s ? 'bg-purple-600' : 'bg-gray-300'}`} />
              )}
            </div>
          ))}
        </div>

        <CardContent className="flex-1 overflow-y-auto p-6">
          {/* 步骤1: 上传文件 */}
          {step === 1 && (
            <div className="space-y-6">
              {/* 下载模板 */}
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">标准导入模板</h3>
                  <p className="text-sm text-gray-600 mt-1">请下载标准模板并按格式填写，确保数据正确导入</p>
                </div>
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  下载模板
                </Button>
              </div>

              {/* 上传区域 */}
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-purple-500 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  点击选择文件 或 拖拽文件到此处
                </p>
                <p className="text-sm text-gray-500">
                  支持 .xlsx、.xls、.csv 格式
                </p>
              </div>

              {/* 提示 */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-700">
                    <p className="font-medium mb-1">导入提示：</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>必填项：岗位名称、企业名称、城市（标记*的列）</li>
                      <li>企业类型仅支持：国企、民企、上市公司、外企、事业单位</li>
                      <li>应届友好列仅支持填写"是"或"否"，默认为"是"</li>
                      <li>薪资请填写数字（如12代表12000元/月）</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 步骤2: 解析与校验 */}
          {step === 2 && (
            <div className="space-y-6">
              {isCheckingDuplicates ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600 mb-4" />
                  <p className="text-gray-600">正在解析文件并校验数据...</p>
                </div>
              ) : (
                <>
                  {/* 统计信息 */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                      <p className="text-sm text-gray-600">总行数</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-green-600">{stats.valid}</p>
                      <p className="text-sm text-gray-600">校验通过</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-red-600">{stats.error}</p>
                      <p className="text-sm text-gray-600">校验失败</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-yellow-600">{stats.duplicate}</p>
                      <p className="text-sm text-gray-600">重复数据</p>
                    </div>
                  </div>

                  {/* 错误详情 */}
                  {stats.error > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h3 className="font-medium text-red-700 mb-2 flex items-center gap-2">
                        <XCircle className="w-4 h-4" />
                        校验失败的行（需要修改或删除）
                      </h3>
                      <div className="max-h-40 overflow-y-auto space-y-2">
                        {data.filter(r => r.status === 'error').map(row => (
                          <div key={row.id} className="flex items-center justify-between bg-white p-2 rounded">
                            <div>
                              <span className="text-sm font-medium">行{row.rowIndex}: </span>
                              <span className="text-sm text-red-600">{row.errors.join(', ')}</span>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => deleteErrorRow(row.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 重复数据选项 */}
                  {stats.duplicate > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h3 className="font-medium text-yellow-700 mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        重复数据处理方式
                      </h3>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="duplicateOption"
                            value="skip"
                            checked={duplicateOption === 'skip'}
                            onChange={(e) => setDuplicateOption(e.target.value as any)}
                          />
                          <span className="text-sm">跳过重复数据（默认）</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="duplicateOption"
                            value="overwrite"
                            checked={duplicateOption === 'overwrite'}
                            onChange={(e) => setDuplicateOption(e.target.value as any)}
                          />
                          <span className="text-sm">覆盖重复数据</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={reset}>
                      <ChevronLeft className="w-4 h-4 mr-2" />
                      重新上传
                    </Button>
                    <Button
                      onClick={() => setStep(3)}
                      disabled={stats.valid === 0}
                    >
                      下一步
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* 步骤3: 预览与编辑 */}
          {step === 3 && (
            <div className="space-y-6">
              {/* 批量操作 */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">批量设置：</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm">应届友好：</span>
                  <Button size="sm" variant="outline" onClick={() => setAllFreshFriendly('是')}>是</Button>
                  <Button size="sm" variant="outline" onClick={() => setAllFreshFriendly('否')}>否</Button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">企业类型：</span>
                  <select
                    className="px-2 py-1 border rounded text-sm"
                    onChange={(e) => setAllCompanyType(e.target.value)}
                    defaultValue=""
                  >
                    <option value="">请选择</option>
                    {COMPANY_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <Button size="sm" variant="outline" onClick={deleteSelectedRows}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  删除选中
                </Button>
              </div>

              {/* 数据预览表格 */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-3 text-left w-8">
                        <input
                          type="checkbox"
                          checked={data.filter(r => r.status !== 'error').every(r => r.isSelected)}
                          onChange={(e) => setData(prev => prev.map(r => ({ ...r, isSelected: e.target.checked || r.status === 'error' })))}
                        />
                      </th>
                      <th className="px-2 py-3 text-left">行号</th>
                      <th className="px-2 py-3 text-left">岗位名称</th>
                      <th className="px-2 py-3 text-left">企业名称</th>
                      <th className="px-2 py-3 text-left">城市</th>
                      <th className="px-2 py-3 text-left">薪资</th>
                      <th className="px-2 py-3 text-left">行业</th>
                      <th className="px-2 py-3 text-left">企业类型</th>
                      <th className="px-2 py-3 text-left">应届</th>
                      <th className="px-2 py-3 text-left">状态</th>
                      <th className="px-2 py-3 text-left">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.map(row => (
                      <tr key={row.id} className={`
                        ${row.status === 'error' ? 'bg-red-50' : ''}
                        ${row.status === 'duplicate' ? 'bg-yellow-50' : ''}
                        ${row.isSelected ? '' : 'opacity-50'}
                      `}>
                        <td className="px-2 py-2">
                          <input
                            type="checkbox"
                            checked={row.isSelected}
                            onChange={() => toggleRowSelection(row.id)}
                            disabled={row.status === 'error'}
                          />
                        </td>
                        <td className="px-2 py-2">{row.rowIndex}</td>
                        <td className="px-2 py-2">{row.jobName}</td>
                        <td className="px-2 py-2">{row.companyName}</td>
                        <td className="px-2 py-2">{row.city}</td>
                        <td className="px-2 py-2">
                          {row.salaryMin && row.salaryMax ? `${row.salaryMin}K-${row.salaryMax}K` : row.salaryMin || '-'}
                        </td>
                        <td className="px-2 py-2">{row.industry || '-'}</td>
                        <td className="px-2 py-2">{row.companyType || '-'}</td>
                        <td className="px-2 py-2">
                          <Badge variant={row.isFreshFriendly === '是' ? 'default' : 'secondary'}>
                            {row.isFreshFriendly}
                          </Badge>
                        </td>
                        <td className="px-2 py-2">
                          {row.status === 'valid' && <Badge className="bg-green-100 text-green-700">通过</Badge>}
                          {row.status === 'error' && <Badge className="bg-red-100 text-red-700">错误</Badge>}
                          {row.status === 'duplicate' && <Badge className="bg-yellow-100 text-yellow-700">重复</Badge>}
                        </td>
                        <td className="px-2 py-2">
                          <Button size="sm" variant="ghost" onClick={() => startEditRow(row)}>
                            <Edit3 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 操作按钮 */}
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  返回上一步
                </Button>
                <Button
                  onClick={executeImport}
                  disabled={importing || data.filter(r => r.status === 'valid' && r.isSelected).length === 0}
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      导入中...
                    </>
                  ) : (
                    <>
                      确认导入 ({data.filter(r => r.status === 'valid' && r.isSelected).length} 条)
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* 步骤4: 导入结果 */}
          {step === 4 && importResult && (
            <div className="space-y-6">
              {/* 结果统计 */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-lg p-6 text-center">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-600" />
                  <p className="text-2xl font-bold text-green-600">{importResult.success}</p>
                  <p className="text-sm text-gray-600">成功导入</p>
                </div>
                <div className="bg-red-50 rounded-lg p-6 text-center">
                  <XCircle className="w-12 h-12 mx-auto mb-2 text-red-600" />
                  <p className="text-2xl font-bold text-red-600">{importResult.failed}</p>
                  <p className="text-sm text-gray-600">导入失败</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-6 text-center">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-yellow-600" />
                  <p className="text-2xl font-bold text-yellow-600">{importResult.skipped}</p>
                  <p className="text-sm text-gray-600">已跳过</p>
                </div>
              </div>

              {/* 错误报告下载 */}
              {importResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-red-700">导入失败详情</h3>
                    <Button size="sm" variant="outline" onClick={downloadErrorReport}>
                      <Download className="w-4 h-4 mr-2" />
                      下载错误报告
                    </Button>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {importResult.errors.slice(0, 10).map((err, i) => (
                      <p key={i} className="text-sm text-red-600">
                        行{err.rowIndex}: {err.error}
                      </p>
                    ))}
                    {importResult.errors.length > 10 && (
                      <p className="text-sm text-gray-500">
                        ...还有 {importResult.errors.length - 10} 条错误
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={reset}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  重新导入
                </Button>
                <Button onClick={() => { handleClose(); onSuccess(); }}>
                  返回列表
                </Button>
              </div>
            </div>
          )}
        </CardContent>

        {/* 编辑行弹窗 */}
        {editingRow && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <Card className="w-full max-w-lg">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold mb-4">编辑数据 - 行{editingRow.rowIndex}</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">岗位名称*</label>
                    <Input
                      value={editingRow.jobName}
                      onChange={(e) => setEditingRow({ ...editingRow, jobName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">企业名称*</label>
                    <Input
                      value={editingRow.companyName}
                      onChange={(e) => setEditingRow({ ...editingRow, companyName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">城市*</label>
                    <Input
                      value={editingRow.city}
                      onChange={(e) => setEditingRow({ ...editingRow, city: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">薪资下限(K)</label>
                      <Input
                        value={editingRow.salaryMin}
                        onChange={(e) => setEditingRow({ ...editingRow, salaryMin: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">薪资上限(K)</label>
                      <Input
                        value={editingRow.salaryMax}
                        onChange={(e) => setEditingRow({ ...editingRow, salaryMax: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">行业</label>
                    <Input
                      value={editingRow.industry}
                      onChange={(e) => setEditingRow({ ...editingRow, industry: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">企业类型</label>
                    <select
                      className="w-full px-3 py-2 border rounded-lg"
                      value={editingRow.companyType}
                      onChange={(e) => setEditingRow({ ...editingRow, companyType: e.target.value })}
                    >
                      <option value="">请选择</option>
                      {COMPANY_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">应届友好</label>
                    <select
                      className="w-full px-3 py-2 border rounded-lg"
                      value={editingRow.isFreshFriendly}
                      onChange={(e) => setEditingRow({ ...editingRow, isFreshFriendly: e.target.value })}
                    >
                      <option value="是">是</option>
                      <option value="否">否</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">岗位描述</label>
                    <textarea
                      className="w-full px-3 py-2 border rounded-lg h-24 resize-none"
                      value={editingRow.jobDesc}
                      onChange={(e) => setEditingRow({ ...editingRow, jobDesc: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setEditingRow(null)}>取消</Button>
                  <Button onClick={saveEditRow}>保存</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </Card>
    </div>
  );
}
