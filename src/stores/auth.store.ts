import { create } from 'zustand'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { getUserProfile } from '@/services/firebase/auth'
import type { UserProfile } from '@/types'

interface AuthState {
  user: UserProfile | null
  loading: boolean
  initialized: boolean
  setUser: (user: UserProfile | null) => void
  setLoading: (loading: boolean) => void
  initialize: () => () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  initialized: false,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  initialize: () => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await getUserProfile(firebaseUser.uid)
        set({ user: profile, loading: false, initialized: true })
      } else {
        set({ user: null, loading: false, initialized: true })
      }
    })
    return unsubscribe
  },
}))
