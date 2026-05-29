'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// 从 localStorage 获取当前用户 ID
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
  membershipType: 'free' | 'member';
  isMember: boolean;
  membershipPlan: string | null;
  expiresAt: string | null;
  loading: boolean;
}

interface MembershipContextValue extends MembershipState {
  refresh: () => Promise<void>;
  upgrade: (plan: string) => Promise<boolean>;
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
  upgrade: async () => false,
});

export function MembershipProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<MembershipState>(defaultState);

  const refresh = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      const userId = getCurrentUserId();
      if (!userId) {
        setState(prev => ({ ...prev, loading: false }));
        return;
      }
      const res = await fetch('/api/membership', {
        headers: { 'x-user-id': userId },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setState({
            membershipType: json.data.membershipType,
            isMember: json.data.isMember,
            membershipPlan: json.data.membershipPlan,
            expiresAt: json.data.expiresAt,
            loading: false,
          });
        }
      }
    } catch {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const upgrade = useCallback(async (plan: string): Promise<boolean> => {
    try {
      const userId = getCurrentUserId();
      if (!userId) return false;
      const res = await fetch('/api/membership', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({ plan }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          await refresh();
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }, [refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <MembershipContext.Provider value={{ ...state, refresh, upgrade }}>
      {children}
    </MembershipContext.Provider>
  );
}

export function useMembership() {
  return useContext(MembershipContext);
}
