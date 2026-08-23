import { create } from 'zustand'
import { db, isConfigured } from '../lib/firebase'
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy 
} from 'firebase/firestore'

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

  addIncident: async (data) => {
    const newIncident = {
      ...data,
      reportedAt: new Date().toISOString(),
      status: 'REPORTED' as const,
    }

    if (isConfigured && db) {
      try {
        await addDoc(collection(db, 'incidents'), newIncident)
      } catch (error) {
        console.error('Failed to save incident to Firebase:', error)
      }
    } else {
      const localIncident: ReportedIncident = {
        ...newIncident,
        id: `inc_${Date.now()}`,
      }
      set((state) => ({
        incidents: [localIncident, ...state.incidents],
      }))
    }
    set({ isReportModalOpen: false })
  },

  updateIncidentStatus: async (id, status) => {
    if (isConfigured && db) {
      try {
        const docRef = doc(db, 'incidents', id)
        await updateDoc(docRef, { status })
      } catch (error) {
        console.error('Failed to update incident in Firebase:', error)
      }
    } else {
      set((state) => ({
        incidents: state.incidents.map((inc) => (inc.id === id ? { ...inc, status } : inc)),
      }))
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedArea: (areaName, center) => set({ selectedAreaName: areaName, selectedAreaCenter: center }),
}))

// If Firebase is configured, listen to Firestore in real-time
if (isConfigured && db) {
  const q = query(collection(db, 'incidents'), orderBy('reportedAt', 'desc'))
  onSnapshot(q, (snapshot) => {
    const incidents: ReportedIncident[] = []
    snapshot.forEach((doc) => {
      const data = doc.data()
      incidents.push({
        id: doc.id,
        title: data.title,
        description: data.description,
        hazardCategory: data.hazardCategory,
        severity: data.severity,
        latitude: data.latitude,
        longitude: data.longitude,
        reporterName: data.reporterName,
        contactPhone: data.contactPhone,
        photoUrl: data.photoUrl,
        reportedAt: data.reportedAt,
        status: data.status,
      })
    })
    useIncidentStore.setState({ 
      incidents: incidents.length > 0 ? incidents : INITIAL_INCIDENTS 
    })
  })
}
