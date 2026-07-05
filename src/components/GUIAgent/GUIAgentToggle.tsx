'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, X, Bot, Loader2 } from 'lucide-react';

/**
 * GUIAgentToggle — 页面右下角浮动 AI 操控按钮
 *
 * 点击后动态加载 page-agent CDN（阿里巴巴开源 GUI Agent 库），
 * 让用户用自然语言直接操作页面（筛选岗位、搜索、翻页等）。
 *
 * 当前使用 page-agent demo CDN（内置免费测试 LLM），仅限技术评估。
 * 生产环境应切换为自有 LLM（通过后端代理）。
 *
 * 架构说明：
 * - page-agent 是纯客户端 GUI Agent，不走截图，通过文本化 DOM 理解页面
 * - 所有操作在用户浏览器内执行，无需后端配合
 * - CDN 方式零安装、零构建，不影响主 bundle 体积
 */
export default function GUIAgentToggle() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const agentRef = useRef<any>(null);

  /** 动态加载 page-agent CDN script */
  const loadPageAgent = useCallback(async () => {
    if (loaded) return;
    setLoading(true);
    setError(null);

    try {
      // 检查是否已加载
      if (document.querySelector('script[data-page-agent]')) {
        setLoaded(true);
        setLoading(false);
        return;
      }

      // 动态创建 script 标签
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/page-agent@1.11.0/dist/iife/page-agent.demo.js?autoInit=false';
      script.crossOrigin = 'anonymous';
      script.dataset.pageAgent = 'true';
      script.async = true;

      await new Promise<void>((resolve, reject) => {
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('加载 page-agent 失败'));
        document.head.appendChild(script);
      });

      // 等待 page-agent 全局变量就绪
      await new Promise<void>((resolve) => {
        const check = () => {
          if ((window as any).PageAgent) {
            resolve();
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      });

      setLoaded(true);
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [loaded]);

  /** 打开/关闭面板 */
  const togglePanel = useCallback(async () => {
    if (!open) {
      // 打开面板
      setOpen(true);
      if (!loaded && !loading) {
        await loadPageAgent();
      }
      // 给 DOM 渲染时间，然后初始化 page-agent
      setTimeout(() => {
        initAgent();
      }, 500);
    } else {
      // 关闭面板 → 销毁 agent
      destroyAgent();
      setOpen(false);
    }
  }, [open, loaded, loading, loadPageAgent]);

  /** 初始化 page-agent 实例 */
  const initAgent = useCallback(() => {
    try {
      const PageAgent = (window as any).PageAgent;
      if (!PageAgent || agentRef.current) return;

      // 创建 PageAgent 实例（使用内置 demo LLM）
      agentRef.current = new PageAgent({
        language: 'zh-CN',
        maxSteps: 30,
        container: containerRef.current,
        instructions: {
          system: `
            你是职途星"小职"平台的 AI 助手，帮助用户操作岗位搜索页面。
            
            你可以做的操作：
            - 在搜索框输入关键词搜索岗位
            - 选择筛选条件（行业、城市、学历、经验等）
            - 点击岗位卡片查看详情
            - 翻页浏览更多岗位
            - 切换排序方式

            你不能做的操作：
            - 修改用户资料
            - 提交简历
            - 操作支付相关元素
            - 执行任何 JavaScript 代码

            遇到需要用户确认的操作，先用 ask_user 询问。
            每次操作前先分析页面状态，确认目标元素存在。
            操作完成后用 done 工具告知用户结果。
          `,
        },
        onAskUser: async (question: string) => {
          return prompt(question) || '';
        },
      });

      agentRef.current.start().catch((err: any) => {
        console.error('page-agent 启动失败:', err);
        setError('启动失败，请刷新重试');
      });
    } catch (err: any) {
      console.error('page-agent 初始化失败:', err);
      setError('初始化失败');
    }
  }, []);

  /** 销毁 page-agent 实例 */
  const destroyAgent = useCallback(() => {
    if (agentRef.current) {
      try {
        agentRef.current.destroy?.();
      } catch {}
      agentRef.current = null;
    }
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      destroyAgent();
    };
  }, [destroyAgent]);

  return (
    <>
      {/* 浮动按钮 */}
      <button
        onClick={togglePanel}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-[#165DFF] to-[#3D7FFF] text-white shadow-xl shadow-[#165DFF]/30 hover:shadow-[#165DFF]/50 hover:scale-110 transition-all duration-300 flex items-center justify-center group"
        aria-label="AI 操控页面"
      >
        {open ? (
          <X className="w-6 h-6" />
        ) : (
          <Bot className="w-6 h-6 group-hover:animate-pulse" />
        )}
      </button>

      {/* Agent 面板容器 */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 h-96 rounded-2xl glass-card border border-[#E2E8F0] shadow-2xl overflow-hidden flex flex-col">
          {/* 面板头部 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0] bg-gradient-to-r from-[#EEF2FF] to-white">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#165DFF] to-[#3D7FFF] flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-semibold text-sm text-[#1E293B]">小职 · 页面操控</span>
            </div>
            <button
              onClick={() => { destroyAgent(); setOpen(false); }}
              className="w-6 h-6 rounded-full hover:bg-[#F1F5F9] flex items-center justify-center transition-colors"
            >
              <X className="w-3.5 h-3.5 text-[#64748B]" />
            </button>
          </div>

          {/* 面板内容 */}
          <div className="flex-1 relative">
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10">
                <Loader2 className="w-8 h-8 text-[#165DFF] animate-spin mb-3" />
                <p className="text-sm text-[#64748B]">正在加载 AI 操控能力...</p>
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10 p-6 text-center">
                <p className="text-sm text-red-500 mb-3">{error}</p>
                <button
                  onClick={() => { setError(null); loadPageAgent(); }}
                  className="text-xs text-[#165DFF] hover:underline"
                >
                  重试
                </button>
              </div>
            )}
            {loaded && !error && (
              <div className="w-full h-full" ref={containerRef}>
                <div className="flex items-center justify-center h-full text-[#94A3B8] text-sm">
                  <p>加载中...</p>
                </div>
              </div>
            )}
            {!loaded && !loading && !error && (
              <div className="flex items-center justify-center h-full text-[#94A3B8] text-sm">
                <p>点击下方按钮开始</p>
              </div>
            )}
          </div>

          {/* 面板底部提示 */}
          <div className="px-4 py-2 bg-[#F8FAFC] border-t border-[#E2E8F0] text-xs text-[#94A3B8] flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            试试说「筛选月薪8k以上的岗位」
          </div>
        </div>
      )}
    </>
  );
}
