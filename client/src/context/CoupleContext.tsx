import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import { useAuth } from './AuthContext';
import type { Couple, Member } from '../types';

interface CoupleState {
  couple: Couple | null;
  me: Member | null;
  partner: Member | null;
  onlineIds: string[];
  lastSeen: Record<string, string>;
  loading: boolean;
  refresh: () => Promise<void>;
}

const CoupleContext = createContext<CoupleState | null>(null);

export function CoupleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [couple, setCouple] = useState<Couple | null>(null);
  const [onlineIds, setOnlineIds] = useState<string[]>([]);
  const [lastSeen, setLastSeen] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const { couple } = await api<{ couple: Couple | null }>('/couples/me');
    setCouple(couple);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();

    const socket = getSocket();
    socket.on('presence', (p: { online: string[]; lastSeen: Record<string, string> }) => {
      setOnlineIds(p.online);
      setLastSeen((prev) => ({ ...prev, ...p.lastSeen }));
    });
    return () => {
      socket.off('presence');
    };
  }, []);

  const me = couple?.members.find((m) => m._id === user?.id) ?? null;
  const partner = couple?.members.find((m) => m._id !== user?.id) ?? null;

  return (
    <CoupleContext.Provider value={{ couple, me, partner, onlineIds, lastSeen, loading, refresh }}>
      {children}
    </CoupleContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCouple(): CoupleState {
  const ctx = useContext(CoupleContext);
  if (!ctx) throw new Error('useCouple must be used within CoupleProvider');
  return ctx;
}
