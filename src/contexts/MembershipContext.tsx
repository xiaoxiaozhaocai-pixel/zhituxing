'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { MembershipDataSchema, type MembershipData } from '@/lib/api-contracts/membership';
import { successResponse } from '@/lib/api-contracts/_shared';
import { useAuth } from '@/hooks/useAuth';

export interface MembershipState {
  /** 'free' 或 'member'，UI 简化用 */
  membershipType: 'free' | 'member';
  /** 是否当前生效会员（非 free 且未过期） */
  isMember: boolean;
  /** 当前生效套餐 key（monthly/semester/annual/lifetime），free 或过期时 null */
  membershipPlan: string | null;
  /** 会员到期 ISO 字符串（lifetime / 非会员时 null） */
  expiresAt: string | null;
  loading: boolean;
}

interface MembershipContextValue extends MembershipState {
  refresh: () => Promise<void>;
}

const defaultState: MembershipState = {
  membershipType: 'free',
  isMember: false,
  membershipPlan: null,
  expiresAt: null,
  loading: true,
};

const MembershipContext = createContext<MembershipContextValue>({
  ...defaultState,
  refresh: async () => {},
});

const ResponseSchema = successResponse(MembershipDataSchema);

function applyData(data: MembershipData): MembershipState {
  return {
    membershipType: data.isMember ? 'member' : 'free',
    isMember: data.isMember,
    membershipPlan: data.membershipPlan,
    expiresAt: data.membershipExpiresAt,
    loading: false,
  };
}

export function MembershipProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<MembershipState>(defaultState);
  const { isAuthenticated } = useAuth();
  const lastUserId = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true }));

      const res = await fetch('/api/membership', {
        credentials: 'include',
      });

      if (!res.ok) {
        // 401 视为未登录，重置为默认 free
        setState({ ...defaultState, loading: false });
        return;
      }

      const json = await res.json();
      const parsed = ResponseSchema.safeParse(json);
      if (!parsed.success) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('[MembershipContext] /api/membership 响应不符合契约', parsed.error.issues);
        } else {
          console.warn('[MembershipContext] /api/membership 响应不符合契约');
        }
        setState({ ...defaultState, loading: false });
        return;
      }

      setState(applyData(parsed.data.data));
    } catch (err) {
      console.warn('[MembershipContext] refresh 异常', err);
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  // 登录状态变化时重新拉取
  useEffect(() => {
    if (isAuthenticated) {
      refresh();
    } else {
      setState({ ...defaultState, loading: false });
    }
  }, [isAuthenticated, refresh]);

  // 切回标签页时重新拉取（防后台部署更新后前端僵死）
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisible = () => {
      if (document.visibilityState === 'visible' && isAuthenticated) {
        refresh();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [isAuthenticated, refresh]);

  return (
    <MembershipContext.Provider value={{ ...state, refresh }}>
      {children}
    </MembershipContext.Provider>
  );
}

export function useMembership() {
  return useContext(MembershipContext);
}
