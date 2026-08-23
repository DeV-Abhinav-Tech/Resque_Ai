import { create } from 'zustand'

interface OfflineState {
  isOffline: boolean
  cachedPredictionsCount: number
  cachedTilesCount: number
  lastSyncTime: string
  toggleOfflineMode: () => void
  setOnlineStatus: (status: boolean) => void
  syncOfflineCache: () => void
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  isOffline: false,
  cachedPredictionsCount: 1420,
  cachedTilesCount: 850,
  lastSyncTime: new Date().toISOString(),

  toggleOfflineMode: () => set((state) => ({ isOffline: !state.isOffline })),
  setOnlineStatus: (status) => set({ isOffline: !status }),

  syncOfflineCache: () => {
    set({
      lastSyncTime: new Date().toISOString(),
      cachedPredictionsCount: get().cachedPredictionsCount + 45,
      cachedTilesCount: get().cachedTilesCount + 120,
    })
  },
}))
