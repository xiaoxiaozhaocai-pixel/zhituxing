'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { MembershipDataSchema, type MembershipData } from '@/lib/api-contracts/membership';
import { successResponse } from '@/lib/api-contracts/_shared';

// 从 localStorage 获取当前用户 ID（仅作 cookie 不存在时的兜底；实际依赖 cookie 凭据）
function getCurrentUserId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user?.id || null;
    }
  } catch {
    // ignore
  }
  return null;
}

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

  const refresh = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true }));
      const userId = getCurrentUserId();
      const headers: HeadersInit = {};
      if (userId) headers['x-user-id'] = userId;

      const res = await fetch('/api/membership', {
        headers,
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

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <MembershipContext.Provider value={{ ...state, refresh }}>
      {children}
    </MembershipContext.Provider>
  );
}

export function useMembership() {
  return useContext(MembershipContext);
}
