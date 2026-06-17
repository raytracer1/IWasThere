import { create } from 'zustand';

interface UserState {
  credits: number | null;
  setCredits: (c: number) => void;
  refreshCredits: (token: string) => Promise<void>;
}

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL ?? 'http://localhost:8787';

export const useUserStore = create<UserState>((set) => ({
  credits: null,
  setCredits: (c) => set({ credits: c }),
  refreshCredits: async (token) => {
    try {
      const res = await fetch(`${WORKER_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) set({ credits: Math.round(data.data.credits * 100) / 100 });
    } catch {}
  },
}));
