import { create } from 'zustand'

export interface Shelter {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  capacityTotal: number
  capacityOccupied: number
  status: 'OPEN' | 'FULL' | 'PREPARING'
  distanceKm: number
  amenities: string[]
  contactPhone: string
}

export interface BlockedRoad {
  id: string
  roadName: string
  reason: 'LANDSLIDE' | 'FLOODING' | 'BRIDGE_COLLAPSE' | 'DEBRIS'
  severity: 'PARTIAL' | 'TOTAL_BLOCK'
  latitude: number
  longitude: number
  detourAvailable: boolean
}

export interface EvacuationRoute {
  id: string
  routeName: string
  startPoint: [number, number]
  waypoints: [number, number][]
  endPoint: [number, number]
  safetyScore: number // 0-100
  status: 'CLEAR' | 'CAUTION' | 'CONGESTED'
}

export interface RescueTeamRequirement {
  type: 'NDRF_SEARCH_RESCUE' | 'MEDICAL_DISPATCH' | 'K9_SEARCH_TEAM' | 'AMPHIBIOUS_BOAT_UNIT' | 'HAZMAT_RESPONSE'
  countNeeded: number
  countDispatched: number
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM'
}

export interface BroadcastNotification {
  id: string
  radiusKm: number
  centerLat: number
  centerLon: number
  recipientCount: number
  message: string
  dispatchedAt: string
  status: 'DELIVERED' | 'DISPATCHING'
}

interface DisasterResponseState {
  affectedPopulation: number
  sheltersRequiredCount: number
  shelters: Shelter[]
  blockedRoads: BlockedRoad[]
  evacuationRoutes: EvacuationRoute[]
  rescueTeams: RescueTeamRequirement[]
  broadcasts: BroadcastNotification[]
  selectedShelter: Shelter | null
  activeRoute: EvacuationRoute | null
  isBroadcastModalOpen: boolean
  showSheltersLayer: boolean
  showRoadblocksLayer: boolean
  showRoutesLayer: boolean
  show50kmRadiusLayer: boolean
  
  toggleLayer: (layer: 'shelters' | 'roadblocks' | 'routes' | 'radius50km') => void
  selectShelter: (shelter: Shelter | null) => void
  selectRoute: (route: EvacuationRoute | null) => void
  openBroadcastModal: () => void
  closeBroadcastModal: () => void
  send50kmBroadcast: (message: string, radiusKm?: number) => void
}

const INDIAN_SHELTERS: Shelter[] = [
  {
    id: 'sh_ind_1',
    name: 'NDRF Primary Cyclone Shelter - Puri',
    address: 'Grand Road, Puri, Odisha',
    latitude: 19.8135,
    longitude: 85.8312,
    capacityTotal: 3500,
    capacityOccupied: 1240,
    status: 'OPEN',
    distanceKm: 4.2,
    amenities: ['NDRF Medical Bay', 'High Capacity Water Filtration', 'ISRO Satellite Comm', 'K9 Shelter'],
    contactPhone: '+91 06752-223400 (Helpline 1078)',
  },
  {
    id: 'sh_ind_2',
    name: 'Himalayan Emergency Relief Camp',
    address: 'Rajpur Road, Dehradun, Uttarakhand',
    latitude: 30.3165,
    longitude: 78.0322,
    capacityTotal: 2500,
    capacityOccupied: 1890,
    status: 'OPEN',
    distanceKm: 8.6,
    amenities: ['IAF Helipad', 'Emergency Trauma Field Hospital', 'Ration Distribution'],
    contactPhone: '+91 0135-2710334',
  },
  {
    id: 'sh_ind_3',
    name: 'Brahmaputra Flood Evacuation Center',
    address: 'GS Road, Dispur, Guwahati, Assam',
    latitude: 26.1445,
    longitude: 91.7362,
    capacityTotal: 4000,
    capacityOccupied: 3950,
    status: 'FULL',
    distanceKm: 12.1,
    amenities: ['Rescue Boat Dock', 'High Rise Flood Platform', 'Power Gensets'],
    contactPhone: '+91 0361-2237221',
  },
  {
    id: 'sh_ind_4',
    name: 'NDMA Central Disaster Relief Complex',
    address: 'Safdarjung Enclave, New Delhi',
    latitude: 28.5672,
    longitude: 77.1995,
    capacityTotal: 5000,
    capacityOccupied: 1420,
    status: 'OPEN',
    distanceKm: 2.1,
    amenities: ['NDMA Control Room', 'National Emergency Call Center', 'Trauma Unit'],
    contactPhone: '112 / 1078 National Emergency',
  },
]

const INDIAN_ROADBLOCKS: BlockedRoad[] = [
  {
    id: 'rb_ind_1',
    roadName: 'NH-44 Himalayan Pass (Ramban, J&K)',
    reason: 'LANDSLIDE',
    severity: 'TOTAL_BLOCK',
    latitude: 33.2423,
    longitude: 75.2411,
    detourAvailable: false,
  },
  {
    id: 'rb_ind_2',
    roadName: 'Assam State Highway 37 (Kaziranga Corridor)',
    reason: 'FLOODING',
    severity: 'TOTAL_BLOCK',
    latitude: 26.5775,
    longitude: 93.1711,
    detourAvailable: true,
  },
  {
    id: 'rb_ind_3',
    roadName: 'Mumbai-Pune Expressway (KM 48 Lonavala Pass)',
    reason: 'DEBRIS',
    severity: 'PARTIAL',
    latitude: 18.7557,
    longitude: 73.4091,
    detourAvailable: true,
  },
]

const INDIAN_ROUTES: EvacuationRoute[] = [
  {
    id: 'rt_ind_1',
    routeName: 'Coastal Odisha Cyclone Evacuation Corridor Alpha',
    startPoint: [19.8135, 85.8312],
    waypoints: [
      [19.9500, 85.9000],
      [20.1500, 85.9800],
      [20.2961, 85.8245],
    ],
    endPoint: [20.2961, 85.8245],
    safetyScore: 96,
    status: 'CLEAR',
  },
  {
    id: 'rt_ind_2',
    routeName: 'Assam Brahmaputra Relief Route Bravo',
    startPoint: [26.1445, 91.7362],
    waypoints: [
      [26.2200, 91.8100],
      [26.3500, 91.9000],
      [26.4800, 92.0500],
    ],
    endPoint: [26.4800, 92.0500],
    safetyScore: 82,
    status: 'CAUTION',
  },
]

const INDIAN_RESCUE_TEAMS: RescueTeamRequirement[] = [
  { type: 'NDRF_SEARCH_RESCUE', countNeeded: 18, countDispatched: 14, urgency: 'CRITICAL' },
  { type: 'MEDICAL_DISPATCH', countNeeded: 24, countDispatched: 18, urgency: 'CRITICAL' },
  { type: 'AMPHIBIOUS_BOAT_UNIT', countNeeded: 12, countDispatched: 9, urgency: 'HIGH' },
  { type: 'K9_SEARCH_TEAM', countNeeded: 8, countDispatched: 6, urgency: 'HIGH' },
  { type: 'HAZMAT_RESPONSE', countNeeded: 4, countDispatched: 3, urgency: 'MEDIUM' },
]

export const useDisasterResponseStore = create<DisasterResponseState>((set, get) => ({
  affectedPopulation: 284000,
  sheltersRequiredCount: 24,
  shelters: INDIAN_SHELTERS,
  blockedRoads: INDIAN_ROADBLOCKS,
  evacuationRoutes: INDIAN_ROUTES,
  rescueTeams: INDIAN_RESCUE_TEAMS,
  broadcasts: [],
  selectedShelter: null,
  activeRoute: INDIAN_ROUTES[0],
  isBroadcastModalOpen: false,
  showSheltersLayer: true,
  showRoadblocksLayer: true,
  showRoutesLayer: true,
  show50kmRadiusLayer: true,

  toggleLayer: (layer) => {
    if (layer === 'shelters') set((s) => ({ showSheltersLayer: !s.showSheltersLayer }))
    if (layer === 'roadblocks') set((s) => ({ showRoadblocksLayer: !s.showRoadblocksLayer }))
    if (layer === 'routes') set((s) => ({ showRoutesLayer: !s.showRoutesLayer }))
    if (layer === 'radius50km') set((s) => ({ show50kmRadiusLayer: !s.show50kmRadiusLayer }))
  },

  selectShelter: (shelter) => set({ selectedShelter: shelter }),
  selectRoute: (route) => set({ activeRoute: route }),
  openBroadcastModal: () => set({ isBroadcastModalOpen: true }),
  closeBroadcastModal: () => set({ isBroadcastModalOpen: false }),

  send50kmBroadcast: (message, radiusKm = 50) => {
    const newBroadcast: BroadcastNotification = {
      id: `ndma_bcast_${Date.now()}`,
      radiusKm,
      centerLat: 20.5937,
      centerLon: 78.9629,
      recipientCount: 284000,
      message,
      dispatchedAt: new Date().toISOString(),
      status: 'DELIVERED',
    }
    set((state) => ({
      broadcasts: [newBroadcast, ...state.broadcasts],
      isBroadcastModalOpen: false,
    }))
  },
}))
