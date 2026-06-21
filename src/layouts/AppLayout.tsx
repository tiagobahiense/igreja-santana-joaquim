import { NavLink, useNavigate, Link } from 'react-router-dom'
import {
  LayoutDashboard,
  Church,
  Users,
  HandCoins,
  Receipt,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Shield,
  CalendarDays,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import { signOut } from '@/services/firebase/auth'
import { setActiveChurch } from '@/services/firebase/users'
import { Avatar } from '@/components/Avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useChurches } from '@/hooks/use-churches'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'

const adminNavItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/igrejas', icon: Church, label: 'Igrejas' },
  { to: '/gestores', icon: Users, label: 'Gestores' },
  { to: '/logs', icon: Shield, label: 'Auditoria' },
]

const managerNavItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/dizimos', icon: HandCoins, label: 'Dízimos' },
  { to: '/despesas', icon: Receipt, label: 'Despesas' },
  { to: '/agenda', icon: CalendarDays, label: 'Agenda' },
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, setUser } = useAuthStore()
  const { sidebarOpen, toggleSidebar } = useUiStore()
  const navigate = useNavigate()
  const { data: allChurches = [] } = useChurches()

  const userChurches = user?.isAdmin
    ? allChurches
    : allChurches.filter((c) => (user?.churchIds ?? []).includes(c.id))

  const activeChurch = userChurches.find((c) => c.id === user?.activeChurchId) ?? userChurches[0]

  async function handleSignOut() {
    await signOut()
    setUser(null)
    navigate('/login')
  }

  async function handleSelectChurch(churchId: string) {
    if (!user) return
    await setActiveChurch(user.uid, churchId)
    setUser({ ...user, activeChurchId: churchId })
    toast({ title: 'Igreja alterada', variant: 'success' } as Parameters<typeof toast>[0])
  }

  const visibleNav = user?.isAdmin ? adminNavItems : managerNavItems

  return (
    <div className="min-h-screen flex bg-church-cream">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col w-64 church-gradient text-white transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0 lg:static lg:flex',
        )}
      >
        {/* Logo area */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
              <Church className="w-5 h-5 text-yellow-300" />
            </div>
            <div className="leading-tight">
              <p className="text-[10px] text-white/60 font-medium uppercase tracking-wider">Quase-Paróquia</p>
              <p className="text-sm font-bold text-yellow-300">
                Sant'Ana e São Joaquim
              </p>
            </div>
          </div>
          <button
            onClick={toggleSidebar}
            className="lg:hidden text-white/70 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Church selector (multi-church users) */}
        {userChurches.length > 1 && (
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Igreja ativa</p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 w-full text-sm text-white hover:text-white/80 transition-colors">
                  <Church className="w-4 h-4 shrink-0 text-yellow-400" />
                  <span className="truncate">{activeChurch?.name ?? 'Selecionar...'}</span>
                  <ChevronDown className="w-3 h-3 ml-auto shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {userChurches.map((church) => (
                  <DropdownMenuItem
                    key={church.id}
                    onClick={() => handleSelectChurch(church.id)}
                    className={cn(church.id === activeChurch?.id && 'bg-primary/10 font-medium')}
                  >
                    {church.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
          {visibleNav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => { if (window.innerWidth < 1024) toggleSidebar() }}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-white/20 text-white backdrop-blur-sm'
                    : 'text-white/70 hover:bg-white/10 hover:text-white',
                )
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-4 py-3 border-t border-white/10">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-2 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="sticky top-0 z-20 flex items-center justify-between px-4 md:px-6 py-3 bg-white/70 backdrop-blur-md border-b border-white/50 shadow-sm">
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          {/* Avatar dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full ring-2 ring-primary/30 hover:ring-primary/60 transition-all">
                <Avatar
                  name={user?.displayName ?? 'U'}
                  photoURL={user?.photoURL}
                  avatarColor={user?.avatarColor}
                  size="sm"
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-semibold">{user?.displayName}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  {user?.isAdmin && (
                    <p className="text-xs text-primary font-medium">Administrador</p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/perfil')}>
                Editar perfil
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="w-4 h-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          {children}
        </main>

        {!user?.isAdmin && (
          <Link
            to="/agenda"
            className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full gold-gradient text-white shadow-lg hover:scale-105 transition-transform"
            title="Agenda da matriz"
          >
            <CalendarDays className="w-6 h-6" />
          </Link>
        )}
      </div>
    </div>
  )
}
