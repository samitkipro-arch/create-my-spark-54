import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GlobalFiltersState {
  dateRange: {
    from: string | null;
    to: string | null;
  };
  clientId: string;
  memberId: string;
  setDateRange: (from: string | null, to: string | null) => void;
  setClientId: (id: string) => void;
  setMemberId: (id: string) => void;
  reset: () => void;
}

const initialState = {
  dateRange: {
    from: null,
    to: null,
  },
  clientId: "all",
  memberId: "all",
};

export const useGlobalFilters = create<GlobalFiltersState>()(
  persist(
    (set) => ({
      ...initialState,
      setDateRange: (from, to) => set({ dateRange: { from, to } }),
      setClientId: (id) => set({ clientId: id }),
      setMemberId: (id) => set({ memberId: id }),
      reset: () => set(initialState),
    }),
    {
      name: 'global-filters-storage',
    }
  )
);
