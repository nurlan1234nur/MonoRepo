import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';
import type { Couple, Member } from '../types';

interface CoupleState {
  couple: Couple | null;
  me: Member | null;
  partner: Member | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const CoupleContext = createContext<CoupleState | null>(null);

function isMember(value: unknown): value is Member {
  return Boolean(value && typeof value === 'object' && '_id' in value);
}

export function CoupleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [couple, setCouple] = useState<Couple | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const response = await api<{ couple: Couple | null }>('/couples/me');
      setCouple(response.couple);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [user?.couple]);

  const members = useMemo(() => couple?.members.filter(isMember) ?? [], [couple?.members]);
  const me = members.find((member) => member._id === user?.id) ?? null;
  const partner = members.find((member) => member._id !== user?.id) ?? null;

  const value = useMemo<CoupleState>(
    () => ({ couple, me, partner, loading, refresh }),
    [couple, me, partner, loading],
  );

  return <CoupleContext.Provider value={value}>{children}</CoupleContext.Provider>;
}

export function useCouple(): CoupleState {
  const ctx = useContext(CoupleContext);
  if (!ctx) throw new Error('useCouple must be used within CoupleProvider');
  return ctx;
}

