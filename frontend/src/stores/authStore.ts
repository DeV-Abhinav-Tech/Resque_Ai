import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/lib/api'

interface User {
  id: string
  email: string
  full_name: string | null
  role: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  isGuest: boolean
  register: (email: string, password: string, fullName: string, role?: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
  setToken: (token: string) => void
  setGuestMode: () => void
}

const GUEST_USER: User = {
  id: 'guest_operator_001',
  email: 'guest@resque.ai',
  full_name: 'Guest Command Operator',
  role: 'ANALYST',
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: GUEST_USER,
      token: null,
      isAuthenticated: true,
      isLoading: false,
      isGuest: true,

      register: async (email: string, password: string, fullName: string, role: string = 'ANALYST') => {
        set({ isLoading: true })
        try {
          const response = await api.post('/auth/register', {
            email,
            password,
            full_name: fullName,
            role,
          })
          const { access_token, user } = response.data
          api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
          set({ user, token: access_token, isAuthenticated: true, isGuest: false, isLoading: false })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true })
        try {
          const response = await api.post('/auth/login', { email, password })
          const { access_token, user } = response.data
          api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
          set({ user, token: access_token, isAuthenticated: true, isGuest: false, isLoading: false })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: () => {
        delete api.defaults.headers.common['Authorization']
        set({ user: GUEST_USER, token: null, isAuthenticated: true, isGuest: true })
      },

      setGuestMode: () => {
        set({ user: GUEST_USER, token: null, isAuthenticated: true, isGuest: true })
      },

      checkAuth: async () => {
        const token = get().token
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          try {
            const response = await api.get('/auth/me')
            set({ user: response.data, isAuthenticated: true, isGuest: false, isLoading: false })
          } catch {
            set({ user: GUEST_USER, token: null, isAuthenticated: true, isGuest: true, isLoading: false })
          }
        } else {
          set({ user: GUEST_USER, token: null, isAuthenticated: true, isGuest: true, isLoading: false })
        }
      },

      setToken: (token: string) => {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        set({ token, isAuthenticated: true, isGuest: false })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
)