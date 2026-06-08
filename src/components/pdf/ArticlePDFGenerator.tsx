'use client';

import { useCallback, useState } from 'react';
import { loadJSPDF, loadHtml2Canvas } from '@/lib/dynamic-imports';
import { Button } from '@/components/ui/button';
import {Loader2, FileText} from 'lucide-react';

interface ArticlePDFGeneratorProps {
  articleId: string;
  articleTitle: string;
  articleContent: string;
  articleCategory: string;
  isMember: boolean;
}

export default function ArticlePDFGenerator({
  articleId,
  articleTitle,
  articleContent,
  articleCategory,
  isMember,
}: ArticlePDFGeneratorProps) {
  const [generating, setGenerating] = useState(false);

  const generatePDF = useCallback(async () => {
    if (!isMember) return;
    
    setGenerating(true);
    try {
      // 创建临时元素
      const tempElement = document.createElement('div');
      tempElement.style.position = 'absolute';
      tempElement.style.left = '-9999px';
      tempElement.style.top = '0';
      tempElement.style.width = '210mm';
      tempElement.style.padding = '20px';
      tempElement.style.background = 'white';
      tempElement.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      tempElement.style.fontSize = '12px';
      tempElement.style.lineHeight = '1.8';
      tempElement.style.color = '#333';

      const date = new Date().toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const categoryMap: Record<string, string> = {
        resume: '简历指南',
        interview: '面试技巧',
        career: '职业规划',
        industry: '行业洞察',
        tips: '求职干货',
        all: '综合'
      };

      // 处理内容
      const processedContent = articleContent
        .replace(/^### (.+)$/gm, '<h3 style="font-size: 14px; font-weight: bold; margin: 12px 0 6px; color: #165DFF;">$1</h3>')
        .replace(/^## (.+)$/gm, '<h2 style="font-size: 16px; font-weight: bold; margin: 16px 0 8px; color: #165DFF;">$1</h2>')
        .replace(/^# (.+)$/gm, '<h1 style="font-size: 20px; font-weight: bold; margin: 0 0 16px; color: #165DFF;">$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/^- (.+)$/gm, '<li style="margin: 3px 0;">• $1</li>')
        .replace(/^(\d+)\. (.+)$/gm, '<li style="margin: 3px 0; list-style: decimal; margin-left: 20px;">$2</li>')
        .replace(/\n\n/g, '</p><p style="margin: 6px 0;">')
        .replace(/\n/g, '<br/>');

      tempElement.innerHTML = `
        <div style="max-width: 180mm; margin: 0 auto;">
          <!-- Header -->
          <div style="display: flex; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #165DFF;">
            <div style="width: 40px; height: 40px; background: #165DFF; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
              <span style="color: white; font-size: 20px; font-weight: bold;">职</span>
            </div>
            <div>
              <div style="font-size: 18px; font-weight: bold; color: #165DFF;">职途星</div>
              <div style="font-size: 10px; color: #999;">你的AI职业规划助手</div>
            </div>
            <div style="margin-left: auto; text-align: right;">
              <div style="font-size: 12px; color: #666;">${categoryMap[articleCategory] || '求职干货'}</div>
              <div style="font-size: 10px; color: #999;">${date}</div>
            </div>
          </div>

          <!-- Title -->
          <h1 style="font-size: 22px; font-weight: bold; text-align: center; margin: 30px 0; color: #333;">
            ${articleTitle}
          </h1>

          <!-- Content -->
          <div style="margin: 20px 0; background: #f9f9f9; padding: 20px; border-radius: 8px;">
            ${processedContent}
          </div>

          <!-- Attachment Info -->
          <div style="margin-top: 30px; padding: 15px; background: #e8f0fe; border-radius: 8px;">
            <p style="font-size: 12px; color: #165DFF; margin: 0;">
              📎 本文档为职途星求职干货精选，会员可免费无限下载
            </p>
          </div>

          <!-- Footer -->
          <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; text-align: center;">
            <p style="font-size: 10px; color: #999; margin: 5px 0;">
              更多求职干货尽在职途星 | zhituxing.com
            </p>
          </div>
        </div>
      `;

      document.body.appendChild(tempElement);

      const html2canvas = await loadHtml2Canvas();
      const canvas = await html2canvas(tempElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      document.body.removeChild(tempElement);

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      const jsPDF = await loadJSPDF();
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, heightLeft - imgHeight, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const filename = `${articleTitle.slice(0, 20)}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(filename);

    } catch (error) {
      console.error('PDF生成失败:', error);
      alert('PDF生成失败，请稍后重试');
    } finally {
      setGenerating(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId, articleTitle, articleContent, articleCategory, isMember]);

  return (
    <Button
      onClick={generatePDF}
      disabled={generating || !isMember}
      variant="outline"
      className={`${isMember ? 'border-[#165DFF] text-[#165DFF]' : 'border-gray-300 text-gray-400 cursor-not-allowed'}`}
    >
      {generating ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          生成中...
        </>
      ) : (
        <>
          <FileText className="w-4 h-4 mr-2" />
          {isMember ? '下载附件' : '会员专享'}
        </>
      )}
    </Button>
  );
}
