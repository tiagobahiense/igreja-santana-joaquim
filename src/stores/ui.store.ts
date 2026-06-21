import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UiState {
  sidebarOpen: boolean
  minimizedAlerts: string[]
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  minimizeAlert: (id: string) => void
  restoreAlert: (id: string) => void
  isAlertMinimized: (id: string) => boolean
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      minimizedAlerts: [],
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      minimizeAlert: (id) =>
        set((s) => ({
          minimizedAlerts: s.minimizedAlerts.includes(id)
            ? s.minimizedAlerts
            : [...s.minimizedAlerts, id],
        })),
      restoreAlert: (id) =>
        set((s) => ({ minimizedAlerts: s.minimizedAlerts.filter((a) => a !== id) })),
      isAlertMinimized: (id) => get().minimizedAlerts.includes(id),
    }),
    { name: 'ui-store' },
  ),
)
