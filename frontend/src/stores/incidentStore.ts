import { create } from 'zustand'

export interface ReportedIncident {
  id: string
  title: string
  description: string
  hazardCategory: 'LANDSLIDE' | 'FLOOD' | 'STRUCTURAL_COLLAPSE' | 'MEDICAL_CRISIS' | 'FIRE' | 'CYCLONE'
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  latitude: number
  longitude: number
  reporterName: string
  contactPhone: string
  photoUrl?: string
  reportedAt: string
  status: 'REPORTED' | 'RESCUE_DISPATCHED' | 'RESOLVED'
}

interface IncidentState {
  incidents: ReportedIncident[]
  isReportModalOpen: boolean
  searchQuery: string
  selectedAreaCenter: [number, number] | null
  selectedAreaName: string
  
  openReportModal: () => void
  closeReportModal: () => void
  addIncident: (incident: Omit<ReportedIncident, 'id' | 'reportedAt' | 'status'>) => void
  updateIncidentStatus: (id: string, status: ReportedIncident['status']) => void
  setSearchQuery: (query: string) => void
  setSelectedArea: (areaName: string, center: [number, number] | null) => void
}

const INITIAL_INCIDENTS: ReportedIncident[] = [
  {
    id: 'inc_1',
    title: 'Flash Landslide blocking Kedarnath Route',
    description: 'Boulders and mud blocking pedestrian pilgrimage pass near Sonprayag. 40 citizens stranded.',
    hazardCategory: 'LANDSLIDE',
    severity: 'CRITICAL',
    latitude: 30.6275,
    longitude: 79.0669,
    reporterName: 'Vikram Singh (Local Operator)',
    contactPhone: '+91 98110-44321',
    reportedAt: new Date(Date.now() - 1800000).toISOString(),
    status: 'RESCUE_DISPATCHED',
  },
  {
    id: 'inc_2',
    title: 'Urban Waterlogging at Kurla Underpass',
    description: 'Monsoon surge water level rising above 4 feet. 3 vehicles submerged.',
    hazardCategory: 'FLOOD',
    severity: 'HIGH',
    latitude: 19.0657,
    longitude: 72.8783,
    reporterName: 'Aarav Mehta',
    contactPhone: '+91 98200-11223',
    reportedAt: new Date(Date.now() - 3600000).toISOString(),
    status: 'REPORTED',
  },
]

export const useIncidentStore = create<IncidentState>((set, get) => ({
  incidents: INITIAL_INCIDENTS,
  isReportModalOpen: false,
  searchQuery: '',
  selectedAreaCenter: null,
  selectedAreaName: '',

  openReportModal: () => set({ isReportModalOpen: true }),
  closeReportModal: () => set({ isReportModalOpen: false }),

  addIncident: (data) => {
    const newIncident: ReportedIncident = {
      ...data,
      id: `inc_${Date.now()}`,
      reportedAt: new Date().toISOString(),
      status: 'REPORTED',
    }
    set((state) => ({
      incidents: [newIncident, ...state.incidents],
      isReportModalOpen: false,
    }))
  },

  updateIncidentStatus: (id, status) => {
    set((state) => ({
      incidents: state.incidents.map((inc) => (inc.id === id ? { ...inc, status } : inc)),
    }))
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedArea: (areaName, center) => set({ selectedAreaName: areaName, selectedAreaCenter: center }),
}))
