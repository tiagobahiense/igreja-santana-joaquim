import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import { AppLayout } from '@/layouts/AppLayout'
import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { Churches } from '@/pages/Churches'
import { Managers } from '@/pages/Managers'
import { Tithes } from '@/pages/Tithes'
import { Expenses } from '@/pages/Expenses'
import { Agenda } from '@/pages/Agenda'
import { Settings } from '@/pages/Settings'
import { Profile } from '@/pages/Profile'
import { AuditLogs } from '@/pages/AuditLogs'

import { Toaster } from '@/components/ui/toaster'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center church-gradient">
        <div className="flex flex-col items-center gap-4">
          <span className="text-5xl">⛪</span>
          <div className="w-8 h-8 border-2 border-white/30 border-t-yellow-400 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (!user?.isAdmin) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function ManagerGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (user?.isAdmin) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { initialize } = useAuthStore()

  useEffect(() => {
    const unsubscribe = initialize()
    return unsubscribe
  }, [initialize])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <AuthGuard>
            <AppLayout>
              <Navigate to="/dashboard" replace />
            </AppLayout>
          </AuthGuard>
        }
      />

      <Route
        path="/dashboard"
        element={
          <AuthGuard>
            <AppLayout>
              <Dashboard />
            </AppLayout>
          </AuthGuard>
        }
      />

      <Route
        path="/igrejas"
        element={
          <AuthGuard>
            <AdminGuard>
              <AppLayout>
                <Churches />
              </AppLayout>
            </AdminGuard>
          </AuthGuard>
        }
      />

      <Route
        path="/gestores"
        element={
          <AuthGuard>
            <AdminGuard>
              <AppLayout>
                <Managers />
              </AppLayout>
            </AdminGuard>
          </AuthGuard>
        }
      />

      <Route
        path="/dizimos"
        element={
          <AuthGuard>
            <ManagerGuard>
              <AppLayout>
                <Tithes />
              </AppLayout>
            </ManagerGuard>
          </AuthGuard>
        }
      />

      <Route
        path="/despesas"
        element={
          <AuthGuard>
            <ManagerGuard>
              <AppLayout>
                <Expenses />
              </AppLayout>
            </ManagerGuard>
          </AuthGuard>
        }
      />

      <Route
        path="/agenda"
        element={
          <AuthGuard>
            <ManagerGuard>
              <AppLayout>
                <Agenda />
              </AppLayout>
            </ManagerGuard>
          </AuthGuard>
        }
      />

      <Route path="/tarefas" element={<Navigate to="/agenda" replace />} />

      <Route
        path="/configuracoes"
        element={
          <AuthGuard>
            <AdminGuard>
              <AppLayout>
                <Settings />
              </AppLayout>
            </AdminGuard>
          </AuthGuard>
        }
      />
      <Route
        path="/perfil"
        element={
          <AuthGuard>
            <AppLayout>
              <Profile />
            </AppLayout>
          </AuthGuard>
        }
      />

      <Route
        path="/logs"
        element={
          <AuthGuard>
            <AdminGuard>
              <AppLayout>
                <AuditLogs />
              </AppLayout>
            </AdminGuard>
          </AuthGuard>
        }
      />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
