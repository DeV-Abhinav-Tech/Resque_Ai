import { create } from 'zustand'

export interface SosAlert {
  id: string
  hazardType: string
  latitude: number
  longitude: number
  accuracy?: number
  notes?: string
  contactPhone?: string
  timestamp: string
  status: 'ACTIVE' | 'DISPATCHED' | 'RESOLVED'
}

interface SosState {
  activeSos: SosAlert | null
  isModalOpen: boolean
  openModal: () => void
  closeModal: () => void
  dispatchSos: (alert: Omit<SosAlert, 'id' | 'timestamp' | 'status'>) => void
  resolveSos: () => void
}

export const useSosStore = create<SosState>((set) => ({
  activeSos: null,
  isModalOpen: false,

  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false }),

  dispatchSos: (data) => {
    const alert: SosAlert = {
      ...data,
      id: `sos_${Date.now()}`,
      timestamp: new Date().toISOString(),
      status: 'ACTIVE',
    }
    set({ activeSos: alert, isModalOpen: false })
  },

  resolveSos: () => set({ activeSos: null }),
}))
