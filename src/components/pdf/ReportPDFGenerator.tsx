'use client';

import { useCallback, useState } from 'react';
import { loadJSPDF, loadHtml2Canvas } from '@/lib/dynamic-imports';
import { Button } from '@/components/ui/button';
import { Loader2, Download } from 'lucide-react';

interface ReportPDFGeneratorProps {
  reportId: string;
  reportTitle: string;
  reportContent: string;
  reportType: 'career' | 'decision' | 'interview';
  isMember: boolean;
  onQuotaCheck?: () => boolean;
}

export default function ReportPDFGenerator({
  reportId,
  reportTitle,
  reportContent,
  reportType,
  isMember,
}: ReportPDFGeneratorProps) {
  const [generating, setGenerating] = useState(false);

  const generatePDF = useCallback(async () => {
    if (!isMember) return;
    
    setGenerating(true);
    try {
      // 创建一个临时的DOM元素来渲染报告内容
      const tempElement = document.createElement('div');
      tempElement.style.position = 'absolute';
      tempElement.style.left = '-9999px';
      tempElement.style.top = '0';
      tempElement.style.width = '210mm';
      tempElement.style.padding = '20px';
      tempElement.style.background = 'white';
      tempElement.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      tempElement.style.fontSize = '12px';
      tempElement.style.lineHeight = '1.6';
      tempElement.style.color = '#333';

      // 生成报告HTML内容
      tempElement.innerHTML = generateReportHTML(reportTitle, reportContent, reportType);
      document.body.appendChild(tempElement);

      // 动态加载html2canvas（~300KB，按需加载）
      const html2canvas = await loadHtml2Canvas();
      const canvas = await html2canvas(tempElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      // 移除临时元素
      document.body.removeChild(tempElement);

      // 创建PDF
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // 动态加载jsPDF（~500KB，按需加载）
      const jsPDF = await loadJSPDF();
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');

      // 添加第一页
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // 如果内容超过一页，添加更多页面
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // 生成文件名
      const filename = `${reportType === 'career' ? '职业规划' : reportType === 'decision' ? '考研决策' : '面试复盘'}报告_${reportId.slice(0, 8)}_${new Date().toISOString().slice(0, 10)}.pdf`;

      // 下载PDF
      pdf.save(filename);

    } catch (error) {
      console.error('PDF生成失败:', error);
      alert('PDF生成失败，请稍后重试');
    } finally {
      setGenerating(false);
    }
  }, [reportId, reportTitle, reportContent, reportType, isMember]);

  return (
    <Button
      onClick={generatePDF}
      disabled={generating || !isMember}
      className={`${isMember ? 'bg-[#165DFF] hover:bg-[#165DFF]/90' : 'bg-gray-400 cursor-not-allowed'}`}
    >
      {generating ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          生成中...
        </>
      ) : (
        <>
          <Download className="w-4 h-4 mr-2" />
          下载PDF
        </>
      )}
    </Button>
  );
}

// 生成报告HTML内容
function generateReportHTML(title: string, content: string, type: string): string {
  const date = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const logoText = '职途星';
  const logoSubtext = '你的AI职业规划助手';

  let typeLabel = '';
  if (type === 'career') typeLabel = '职业规划报告';
  else if (type === 'decision') typeLabel = '考研就业决策报告';
  else typeLabel = '面试复盘报告';

  // 处理内容，将markdown转换为简单HTML
  const processedContent = content
    .replace(/^### (.+)$/gm, '<h3 style="font-size: 16px; font-weight: bold; margin: 16px 0 8px; color: #165DFF;">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size: 18px; font-weight: bold; margin: 20px 0 10px; color: #165DFF; border-bottom: 1px solid #eee; padding-bottom: 5px;">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size: 22px; font-weight: bold; margin: 0 0 20px; color: #165DFF;">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li style="margin: 4px 0;">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li style="margin: 4px 0; list-style: decimal; margin-left: 20px;">$2</li>')
    .replace(/\n\n/g, '</p><p style="margin: 8px 0;">')
    .replace(/\n/g, '<br/>');

  return `
    <div style="max-width: 180mm; margin: 0 auto;">
      <!-- Header -->
      <div style="display: flex; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #165DFF;">
        <div style="width: 40px; height: 40px; background: #165DFF; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
          <span style="color: white; font-size: 20px; font-weight: bold;">职</span>
        </div>
        <div>
          <div style="font-size: 18px; font-weight: bold; color: #165DFF;">${logoText}</div>
          <div style="font-size: 10px; color: #999;">${logoSubtext}</div>
        </div>
        <div style="margin-left: auto; text-align: right;">
          <div style="font-size: 12px; color: #666;">${typeLabel}</div>
          <div style="font-size: 10px; color: #999;">生成日期: ${date}</div>
        </div>
      </div>

      <!-- Title -->
      <h1 style="font-size: 24px; font-weight: bold; text-align: center; margin: 30px 0; color: #333;">
        ${title}
      </h1>

      <!-- Content -->
      <div style="margin: 20px 0;">
        ${processedContent}
      </div>

      <!-- Footer -->
      <div style="margin-top: 40px; padding-top: 15px; border-top: 1px solid #eee; text-align: center;">
        <p style="font-size: 10px; color: #999; margin: 5px 0;">
          本报告由职途星AI自动生成，仅供参考，不构成任何求职建议
        </p>
        <p style="font-size: 10px; color: #999; margin: 5px 0;">
          官方网站: zhituxing.com | 客服微信: zhituxing_kefu
        </p>
      </div>
    </div>
  `;
}
