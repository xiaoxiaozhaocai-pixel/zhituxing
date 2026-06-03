/**
 * AnalyticsTracker — 统一行为埋点工具
 *
 * 特性：
 * - 自动附带 user_id、membership_type、timestamp、session_id
 * - 本地队列缓冲，批量上报（每5条或3秒flush一次）
 * - 页面关闭前（beforeunload）强制flush
 * - 离线时存入 localStorage，上线后补报
 * - 异步上报，不阻塞主线程
 */

// ========== 事件类型枚举 ==========
export enum AnalyticsEvent {
  PAGE_VIEW = 'page_view',
  CHAT_SEND = 'chat_send',
  MATCH_VIEW = 'match_view',
  ASSESSMENT_START = 'assessment_start',
  ASSESSMENT_COMPLETE = 'assessment_complete',
  LEARNING_PATH_VIEW = 'learning_path_view',
  SKILL_GRAPH_EXPLORE = 'skill_graph_explore',
  PAYWALL_SHOW = 'paywall_show',
  PAYWALL_CONVERT = 'paywall_convert',
  INTERVIEW_START = 'interview_start',
  INTERVIEW_COMPLETE = 'interview_complete',
}

// ========== 事件数据结构 ==========
interface AnalyticsEventItem {
  event_type: string;
  user_id?: string | number | null;
  event_data?: Record<string, unknown>;
  timestamp: string;
  session_id: string;
  membership_type?: string;
}

// ========== 配置 ==========
const FLUSH_SIZE = 5; // 每5条flush一次
const FLUSH_INTERVAL = 3000; // 3秒flush一次
const STORAGE_KEY = 'analytics_offline_queue';
const MAX_STORAGE_QUEUE = 200; // 离线队列最大条数

// ========== Session 管理 ==========
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    const stored = sessionStorage.getItem('analytics_session_id');
    if (stored) return stored;
    const newId = generateSessionId();
    sessionStorage.setItem('analytics_session_id', newId);
    return newId;
  } catch {
    return generateSessionId();
  }
}

// ========== Tracker 类 ==========
class AnalyticsTrackerClass {
  private queue: AnalyticsEventItem[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private isFlushing = false;
  private sessionId = '';
  private userId: string | number | null = null;
  private membershipType: string = 'free';
  private initialized = false;

  /** 初始化（在客户端调用） */
  init(options?: { userId?: string | number | null; membershipType?: string }): void {
    if (typeof window === 'undefined') return;
    if (this.initialized) return;

    this.sessionId = getSessionId();
    this.userId = options?.userId ?? null;
    this.membershipType = options?.membershipType ?? 'free';
    this.initialized = true;

    // 启动定时 flush
    this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL);

    // 页面关闭前强制 flush
    window.addEventListener('beforeunload', () => this.flush());
    window.addEventListener('pagehide', () => this.flush());

    // 从 localStorage 恢复离线队列并补报
    this.restoreOfflineQueue();

    // 监听网络恢复
    window.addEventListener('online', () => {
      this.restoreOfflineQueue();
      this.flush();
    });
  }

  /** 更新用户信息 */
  setUser(userId: string | number | null, membershipType: string): void {
    this.userId = userId;
    this.membershipType = membershipType;
  }

  /** 记录事件 */
  track(event: AnalyticsEvent, properties?: Record<string, unknown>): void {
    if (typeof window === 'undefined') return;

    const item: AnalyticsEventItem = {
      event_type: event,
      user_id: this.userId,
      event_data: {
        ...properties,
        membership_type: this.membershipType,
      },
      timestamp: new Date().toISOString(),
      session_id: this.sessionId,
      membership_type: this.membershipType,
    };

    this.queue.push(item);

    // 达到批量阈值立即 flush
    if (this.queue.length >= FLUSH_SIZE) {
      this.flush();
    }
  }

  /** 手动 flush */
  async flush(): Promise<void> {
    if (this.isFlushing || this.queue.length === 0) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      // 离线时存入 localStorage
      this.saveOfflineQueue();
      return;
    }

    this.isFlushing = true;
    const batch = this.queue.splice(0, FLUSH_SIZE);
    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: batch }),
        keepalive: true, // 确保页面关闭时仍能发送
      });

      if (!response.ok) {
        // 上报失败，回退到队列
        this.queue.unshift(...batch);
        this.saveOfflineQueue();
      }
    } catch {
      // 网络异常，回退到队列
      this.queue.unshift(...batch);
      this.saveOfflineQueue();
    } finally {
      this.isFlushing = false;
      // 如果还有剩余，继续 flush
      if (this.queue.length > 0) {
        setTimeout(() => this.flush(), 500);
      }
    }
  }

  /** 销毁（清理定时器） */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
    this.initialized = false;
  }

  // ========== 离线队列管理 ==========

  private saveOfflineQueue(): void {
    try {
      const existing = this.loadOfflineItems();
      const merged = [...existing, ...this.queue].slice(-MAX_STORAGE_QUEUE);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // localStorage 不可用时静默失败
    }
  }

  private restoreOfflineQueue(): void {
    try {
      const items = this.loadOfflineItems();
      if (items.length > 0) {
        // 将离线队列中的事件添加到当前队列头部
        this.queue.unshift(...items);
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // 静默失败
    }
  }

  private loadOfflineItems(): AnalyticsEventItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}

// ========== 单例导出 ==========
export const AnalyticsTracker = new AnalyticsTrackerClass();

// ========== 便捷 Hooks ==========
import { useEffect, useRef } from 'react';

/**
 * usePageView — 页面浏览自动埋点
 * 在页面组件的 useEffect 中调用
 */
export function usePageView(pageName: string, extra?: Record<string, unknown>): void {
  const tracked = useRef(false);
  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    AnalyticsTracker.track(AnalyticsEvent.PAGE_VIEW, {
      page: pageName,
      url: typeof window !== 'undefined' ? window.location.pathname : '',
      referrer: typeof document !== 'undefined' ? document.referrer : '',
      ...extra,
    });
  }, [pageName]);
}
