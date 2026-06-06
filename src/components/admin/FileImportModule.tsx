'use client';

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {Loader2, FileText, AlertCircle, CheckCircle} from 'lucide-react';

interface FileImportModuleProps {
  onContentExtracted: (content: string) => void;
  existingContent?: string;
  onModeChange?: (mode: 'cover' | 'append') => void;
}

type FileType = 'txt' | 'docx' | 'pdf' | 'md';

const ALLOWED_TYPES: Record<FileType, string[]> = {
  txt: ['text/plain'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  pdf: ['application/pdf'],
  md: ['text/markdown', 'text/x-markdown']
};

const ALLOWED_EXTENSIONS: FileType[] = ['txt', 'docx', 'pdf', 'md'];

export default function FileImportModule({ 
  onContentExtracted, 
  existingContent = '',
  onModeChange 
}: FileImportModuleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showModeDialog, setShowModeDialog] = useState(false);
  const [pendingContent, setPendingContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 验证文件
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const ext = file.name.split('.').pop()?.toLowerCase() as FileType;
    
    // 检查扩展名
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return { valid: false, error: '不支持该文件格式，请选择TXT/Word/PDF/MD格式文件' };
    }

    // 检查大小 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return { valid: false, error: '文件大小不能超过10MB，请压缩后重试' };
    }

    return { valid: true };
  };

  // 解析文件内容
  const parseFile = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop()?.toLowerCase() as FileType;
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          
          switch (ext) {
            case 'txt':
              // TXT: 直接返回，处理编码
              resolve(handleTxtEncoding(content));
              
            case 'md':
              // Markdown: 直接返回
              resolve(content);
              
            case 'docx':
              // Word: 需要用 mammoth 解析
              try {
                const mammoth = await import('mammoth');
                const result = await mammoth.extractRawText({ arrayBuffer: e.target?.result as ArrayBuffer });
                resolve(result.value || content);
              } catch {
                // fallback: 尝试作为纯文本读取
                resolve(content || '无法解析Word文档内容');
              }
              
            case 'pdf':
              // PDF: 需要用 pdf-parse 解析
              try {
                const pdfParse = await import('pdf-parse');
                // @ts-expect-error - pdf-parse ESM导出.default类型缺失
                const parser = typeof pdfParse === 'function' ? pdfParse : pdfParse.default;
                const pdfData = await parser(Buffer.from(content));
                resolve(pdfData.text || '无法提取PDF文本内容');
              } catch {
                resolve(content || '无法解析PDF文档内容');
              }
              
            default:
              reject(new Error('不支持的文件格式'));
          }
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('文件读取失败'));

      // 根据文件类型选择读取方式
      if (ext === 'docx' || ext === 'pdf') {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  // 处理TXT编码问题
  const handleTxtEncoding = (content: string): string => {
    // 检测并处理常见的编码问题
    let text = content;
    
    // 移除 BOM
    if (text.charCodeAt(0) === 0xFEFF) {
      text = text.slice(1);
    }
    
    // 移除首尾空白
    text = text.trim();
    
    // 过滤潜在的危险字符
    text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    text = text.replace(/javascript:/gi, '');
    text = text.replace(/on\w+\s*=/gi, '');
    
    return text;
  };

  // 处理文件
  const handleFile = async (file: File) => {
    // 验证
    const validation = validateFile(file);
    if (!validation.valid) {
      setStatus({ type: 'error', message: validation.error! });
      setTimeout(() => setStatus(null), 5000);
      return;
    }

    setIsLoading(true);
    setStatus(null);

    try {
      const content = await parseFile(file);
      
      if (!content || content.trim().length === 0) {
        setStatus({ type: 'error', message: '文件内容为空，请更换文件' });
        setIsLoading(false);
        return;
      }

      // 检查是否有现有内容
      if (existingContent && existingContent.trim().length > 0) {
        setPendingContent(content);
        setShowModeDialog(true);
      } else {
        onContentExtracted(content);
        setStatus({ type: 'success', message: `成功导入「${file.name}」` });
      }
    } catch (error) {
      console.error('解析失败:', error);
      setStatus({ type: 'error', message: '文件解析失败，请检查文件是否损坏' });
    } finally {
      setIsLoading(false);
    }
  };

  // 拖拽处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, []);

  // 点击选择
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // 清空 input 以允许选择相同文件
    e.target.value = '';
  };

  // 模式选择
  const handleModeSelect = (mode: 'cover' | 'append') => {
    if (mode === 'cover') {
      onContentExtracted(pendingContent);
    } else {
      onContentExtracted(existingContent + '\n\n' + pendingContent);
    }
    setShowModeDialog(false);
    setPendingContent('');
    if (onModeChange) {
      onModeChange(mode);
    }
  };

  return (
    <div className="space-y-3">
      {/* 导入区域 */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
          ${isDragging 
            ? 'border-purple-500 bg-purple-50' 
            : 'border-gray-300 hover:border-purple-400 bg-gray-50 hover:bg-gray-100'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.docx,.pdf,.md"
          onChange={handleFileChange}
          className="hidden"
        />
        
        {isLoading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
            <p className="text-sm text-gray-600">正在解析文件，请稍候...</p>
          </div>
        ) : (
          <>
            <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm font-medium text-gray-700 mb-1">
              <span className="text-blue-600">选择文件导入</span> 或 拖拽文件至此处
            </p>
            <p className="text-xs text-gray-500">
              支持格式：TXT / Word(.docx) / PDF / Markdown(.md)
            </p>
          </>
        )}
      </div>

      {/* 大小限制提示 */}
      <p className="text-xs text-gray-400 text-right">
        单文件大小不超过10MB
      </p>

      {/* 状态提示 */}
      {status && (
        <div className={`
          flex items-center gap-2 p-3 rounded-lg text-sm
          ${status.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
          }
        `}>
          {status.type === 'success' ? (
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          {status.message}
        </div>
      )}

      {/* 覆盖/追加确认弹窗 */}
      {showModeDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold mb-4">导入文件内容</h3>
            <p className="text-gray-600 mb-4">
              内容输入框已有内容，请选择导入方式：
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleModeSelect('append')}
              >
                追加到末尾
              </Button>
              <Button
                className="flex-1"
                onClick={() => handleModeSelect('cover')}
              >
                覆盖原有内容
              </Button>
            </div>
            <Button
              variant="ghost"
              className="w-full mt-3 text-gray-500"
              onClick={() => {
                setShowModeDialog(false);
                setPendingContent('');
              }}
            >
              取消
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
