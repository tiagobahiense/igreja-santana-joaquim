import { useMemo } from 'react'
import { DollarSign, Users, TrendingDown, CheckSquare } from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import { useAuthStore } from '@/stores/auth.store'
import { useChurches } from '@/hooks/use-churches'
import { useTithes } from '@/hooks/use-tithes'
import { useAllSummariesForYear } from '@/hooks/use-summaries'
import { useDailyTasks } from '@/hooks/use-tasks'
import { KpiCard } from '@/components/KpiCard'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate, isBirthdayInNextDays, MONTHS } from '@/lib/utils'
import { useUiStore } from '@/stores/ui.store'
import { ChevronDown, ChevronUp } from 'lucide-react'

const CURRENT_YEAR = new Date().getFullYear()

function AlertCard({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  const { isAlertMinimized, minimizeAlert, restoreAlert } = useUiStore()
  const minimized = isAlertMinimized(id)

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        onClick={() => minimized ? restoreAlert(id) : minimizeAlert(id)}
      >
        <span className="font-semibold text-sm text-foreground">{title}</span>
        {minimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
      </div>
      {!minimized && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

export function Dashboard() {
  const { user } = useAuthStore()
  const { data: allChurches = [] } = useChurches()
  const activeChurchId = user?.activeChurchId ?? user?.churchIds?.[0] ?? ''
  const { data: tithes = [] } = useTithes(activeChurchId)
  const { data: summaries = [] } = useAllSummariesForYear(CURRENT_YEAR)
  const { data: dailyTasks = [] } = useDailyTasks(user?.uid ?? '')

  // ─── KPIs ──────────────────────────────────────────────────────────────────
  const churchSummaries = summaries.filter((s) => s.churchId === activeChurchId)
  const totalDonations = churchSummaries.reduce((a, s) => a + s.totalDonations, 0)
  const totalExpenses = churchSummaries.reduce((a, s) => a + s.totalExpenses, 0)
  const balance = totalDonations - totalExpenses

  // ─── Birthdays (next 7 days) ───────────────────────────────────────────────
  const upcomingBirthdays = useMemo(
    () =>
      tithes.filter((t) => {
        if (!t.birthDate) return false
        return isBirthdayInNextDays(t.birthDate.toDate())
      }),
    [tithes],
  )

  // ─── Missing donations ────────────────────────────────────────────────────
  const overdueTasks = dailyTasks.filter(
    (t) => t.dueDate && t.dueDate.toDate() < new Date() && !t.completed,
  )

  // ─── Chart data ──────────────────────────────────────────────────────────
  const chartData = MONTHS.map((m, idx) => {
    const summary = churchSummaries.find((s) => s.month === idx + 1)
    return {
      month: m.label,
      donations: (summary?.totalDonations ?? 0) / 100,
      expenses: (summary?.totalExpenses ?? 0) / 100,
    }
  })

  const echartsOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['Dízimos', 'Despesas'], bottom: 0 },
    color: ['#c9a227', '#8b1a1a'],
    xAxis: { type: 'category', data: chartData.map((d) => d.month) },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (v: number) => `R$ ${v.toLocaleString('pt-BR')}`,
      },
    },
    series: [
      { name: 'Dízimos', type: 'bar', data: chartData.map((d) => d.donations), barMaxWidth: 32 },
      { name: 'Despesas', type: 'bar', data: chartData.map((d) => d.expenses), barMaxWidth: 32 },
    ],
    grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
  }

  const pieOption = {
    tooltip: { trigger: 'item' },
    color: ['#c9a227', '#8b1a1a', '#1a3a5c', '#2e7d32', '#6a1b9a'],
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        data: allChurches.slice(0, 5).map((c) => {
          const total = summaries.filter((s) => s.churchId === c.id).reduce((a, s) => a + s.totalDonations, 0)
          return { name: c.name, value: total / 100 }
        }),
        label: { formatter: '{b}\n{d}%' },
      },
    ],
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Ano ${CURRENT_YEAR} — ${allChurches.find((c) => c.id === activeChurchId)?.name ?? 'Geral'}`}
      />

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Total Dízimos" value={formatCurrency(totalDonations)} icon={DollarSign} color="gold" />
        <KpiCard title="Total Despesas" value={formatCurrency(totalExpenses)} icon={TrendingDown} color="red" />
        <KpiCard
          title="Saldo"
          value={formatCurrency(Math.abs(balance))}
          subtitle={balance >= 0 ? 'positivo' : 'negativo'}
          icon={DollarSign}
          color={balance >= 0 ? 'green' : 'red'}
        />
        <KpiCard title="Dizimistas Ativos" value={String(tithes.length)} icon={Users} color="blue" />
      </div>

      {/* Daily panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AlertCard id="birthdays" title={`🎂 Aniversários (${upcomingBirthdays.length})`}>
          {upcomingBirthdays.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum aniversário nos próximos 7 dias.</p>
          ) : (
            <ul className="space-y-1">
              {upcomingBirthdays.map((t) => (
                <li key={t.id} className="text-sm flex justify-between">
                  <span>{t.fullName}</span>
                  <span className="text-muted-foreground">{formatDate(t.birthDate?.toDate())}</span>
                </li>
              ))}
            </ul>
          )}
        </AlertCard>

        <AlertCard id="overdue-tasks" title={`✅ Tarefas Pendentes (${overdueTasks.length})`}>
          {overdueTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma tarefa atrasada.</p>
          ) : (
            <ul className="space-y-1">
              {overdueTasks.map((t) => (
                <li key={t.id} className="text-sm flex justify-between">
                  <span>{t.title}</span>
                  <Badge variant="warning">{formatDate(t.dueDate?.toDate())}</Badge>
                </li>
              ))}
            </ul>
          )}
        </AlertCard>

        <AlertCard id="all-tasks" title={`📋 Tarefas do Dia (${dailyTasks.length})`}>
          {dailyTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem tarefas no painel.</p>
          ) : (
            <ul className="space-y-1">
              {dailyTasks.slice(0, 5).map((t) => (
                <li key={t.id} className="text-sm flex items-center gap-2">
                  <CheckSquare className="w-3 h-3 text-primary shrink-0" />
                  <span className="truncate">{t.title}</span>
                </li>
              ))}
            </ul>
          )}
        </AlertCard>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 glass-card">
          <CardHeader>
            <CardTitle>Dízimos vs Despesas — {CURRENT_YEAR}</CardTitle>
          </CardHeader>
          <CardContent>
            <ReactECharts option={echartsOption} style={{ height: 280 }} />
          </CardContent>
        </Card>

        {user?.isAdmin && allChurches.length > 1 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Dízimos por Igreja</CardTitle>
            </CardHeader>
            <CardContent>
              <ReactECharts option={pieOption} style={{ height: 280 }} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
