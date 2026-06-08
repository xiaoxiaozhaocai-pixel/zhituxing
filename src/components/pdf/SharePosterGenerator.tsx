'use client';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useState, useRef, useCallback } from 'react';
import NextImage from 'next/image';
import { loadJSPDF } from '@/lib/dynamic-imports';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Share2, Download, Image } from 'lucide-react';

interface SharePosterGeneratorProps {
  reportTitle: string;
  reportType: 'career' | 'decision';
  userName?: string;
  inviteCode: string;
}

export default function SharePosterGenerator({
  reportTitle,
  reportType,
  userName,
  inviteCode,
}: SharePosterGeneratorProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [posterData, setPosterData] = useState<string | null>(null);

  const generatePoster = useCallback(() => {
    setGenerating(true);
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      setGenerating(false);
      return;
    }

    // 设置画布大小 (750x1334 适合手机分享)
    canvas.width = 750;
    canvas.height = 1334;
    
    // 绘制背景
    // 渐变背景
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#165DFF');
    gradient.addColorStop(0.5, '#4080FF');
    gradient.addColorStop(1, '#69B1FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 添加装饰圆形
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.arc(600, 200, 150, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.arc(150, 1000, 200, 0, Math.PI * 2);
    ctx.fill();

    // Logo区域
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(40, 100, 120, 50, 12);
    ctx.fill();
    
    ctx.fillStyle = '#165DFF';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('职途星', 60, 135);

    // 标题
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    
    const titleLines = wrapText(ctx, reportTitle, 670);
    let y = 350;
    titleLines.forEach(line => {
      ctx.fillText(line, 375, y);
      y += 50;
    });

    // 报告类型标签
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = '20px sans-serif';
    ctx.fillText(reportType === 'career' ? '职业规划报告' : '考研就业决策报告', 375, y + 30);

    // 分隔线
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(100, y + 80);
    ctx.lineTo(650, y + 80);
    ctx.stroke();

    // 用户信息
    if (userName) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '24px sans-serif';
      ctx.fillText(`由 ${userName} 为你生成`, 375, y + 150);
    }

    // 邀请码区域
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(175, 900, 400, 120, 16);
    ctx.fill();

    ctx.fillStyle = '#165DFF';
    ctx.font = '18px sans-serif';
    ctx.fillText('我的专属邀请码', 375, 950);
    
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText(inviteCode, 375, 1000);

    // 底部文案
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '22px sans-serif';
    ctx.fillText('扫码使用职途星AI职业规划助手', 375, 1150);
    
    ctx.font = '18px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText('海量岗位JD · AI智能匹配 · 职业规划报告', 375, 1200);

    // 生成数据URL
    const dataUrl = canvas.toDataURL('image/png');
    setPosterData(dataUrl);
    setGenerating(false);
  }, [reportTitle, reportType, userName, inviteCode]);

  const downloadPoster = useCallback(() => {
    if (!posterData) return;
    
    const link = document.createElement('a');
    link.download = `职途星_${reportType === 'career' ? '职业规划' : '考研决策'}_分享海报.png`;
    link.href = posterData;
    link.click();
  }, [posterData, reportType]);

  const downloadPDF = useCallback(() => {
    if (!posterData) return;
    
    setGenerating(true);
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      setGenerating(false);
      return;
    }

    canvas.width = 750;
    canvas.height = 1334;
    
    const img = new window.Image();
    img.onload = async () => {
      ctx.drawImage(img, 0, 0);
      
      // 动态加载jsPDF（~500KB，按需加载）
      const jsPDF = await loadJSPDF();
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [750, 1334]
      });
      
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 750, 1334);
      pdf.save(`职途星_分享海报_${new Date().toISOString().slice(0, 10)}.pdf`);
      setGenerating(false);
    };
    img.src = posterData;
  }, [posterData]);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setShowDialog(true)}
        className="border-[#165DFF] text-[#165DFF]"
      >
        <Share2 className="w-4 h-4 mr-2" />
        生成分享海报
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>分享海报</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {!posterData ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">
                  生成专属分享海报，好友扫码即可获得3次免费AI次数+7天会员
                </p>
                <Button
                  onClick={generatePoster}
                  disabled={generating}
                  className="bg-[#165DFF]"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Image className="w-4 h-4 mr-2" alt="" />
                      生成海报
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative mx-auto" style={{ maxWidth: '300px' }}>
                  <NextImage
                    src={posterData}
                    alt="分享海报"
                    width={300}
                    height={533}
                    className="w-full rounded-lg shadow-lg"
                    unoptimized
                  />
                </div>
                
                <div className="flex gap-3">
                  <Button
                    onClick={downloadPoster}
                    disabled={generating}
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    下载图片
                  </Button>
                  <Button
                    variant="outline"
                    onClick={downloadPDF}
                    disabled={generating}
                    className="flex-1"
                  >
                    下载PDF
                  </Button>
                </div>
                
                <Button
                  variant="ghost"
                  onClick={() => {
                    setPosterData(null);
                    generatePoster();
                  }}
                  className="w-full"
                >
                  重新生成
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// 文字换行辅助函数
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split('');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach(char => {
    const testLine = currentLine + char;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = testLine;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}
