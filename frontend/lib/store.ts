import { create } from "zustand";
import { fetchMe } from "@/lib/api";

interface CreditsStore {
  credits: number;
  loading: boolean;
  refresh: () => Promise<void>;
  setCredits: (v: number) => void;
}

export const useCreditsStore = create<CreditsStore>((set) => ({
  credits: 0,
  loading: false,
  refresh: async () => {
    set({ loading: true });
    try {
      const res = await fetchMe();
      if (res.success && res.data) set({ credits: res.data.credits });
    } catch {}
    set({ loading: false });
  },
  setCredits: (v) => set({ credits: v }),
}));
