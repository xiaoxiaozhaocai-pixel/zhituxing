'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

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
      const res = await fetch('/api/user/membership', {
        headers: { 'x-user-id': '999' }, // TODO: 替换为真实用户ID
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
      const res = await fetch('/api/user/membership', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': '999', // TODO: 替换为真实用户ID
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
