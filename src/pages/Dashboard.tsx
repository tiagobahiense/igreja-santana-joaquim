import { useMemo } from 'react'
import {
  DollarSign, Users, TrendingDown, TrendingUp,
  CheckSquare, ChevronDown, ChevronUp, HandCoins,
  BarChart3, PieChart, GitCompare, UserCheck,
} from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import { useAuthStore } from '@/stores/auth.store'
import { useChurches } from '@/hooks/use-churches'
import { useTithes } from '@/hooks/use-tithes'
import { useAllSummariesForYear, useSummariesForYear } from '@/hooks/use-summaries'
import { useDailyTasks } from '@/hooks/use-tasks'
import { KpiCard } from '@/components/KpiCard'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { formatCurrency, formatDate, isBirthdayInNextDays, MONTHS } from '@/lib/utils'
import { useUiStore } from '@/stores/ui.store'
import { useExpenses } from '@/hooks/use-expenses'

const CURRENT_YEAR = new Date().getFullYear()
const CURRENT_MONTH = new Date().getMonth() + 1

const CHART_COLORS = ['#c9a227', '#8b1a1a', '#1a3a5c', '#2e7d32', '#6a1b9a', '#00695c', '#bf360c', '#0277bd']

function AlertCard({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  const { isAlertMinimized, minimizeAlert, restoreAlert } = useUiStore()
  const minimized = isAlertMinimized(id)
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer" onClick={() => minimized ? restoreAlert(id) : minimizeAlert(id)}>
        <span className="font-semibold text-sm">{title}</span>
        {minimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
      </div>
      {!minimized && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

// ─── Shared tooltip style ─────────────────────────────────────────────────────
const tooltip = {
  trigger: 'axis' as const,
  backgroundColor: 'rgba(255,255,255,0.95)',
  borderColor: '#e8c84a',
  borderWidth: 1,
  textStyle: { color: '#1a1a1a', fontSize: 12 },
  formatter: (params: unknown[]) => {
    const p = params as Array<{ marker: string; seriesName: string; value: number }>
    return p.map(i => `${i.marker} ${i.seriesName}: <b>${formatCurrency(Math.round(i.value * 100))}</b>`).join('<br/>')
  },
}

// ─── Tab: Visão Geral ────────────────────────────────────────────────────────
function TabOverview({ churchId, summaries, tithes, dailyTasks }: {
  churchId: string
  summaries: ReturnType<typeof useAllSummariesForYear>['data']
  tithes: ReturnType<typeof useTithes>['data']
  dailyTasks: ReturnType<typeof useDailyTasks>['data']
}) {
  const churchSummaries = (summaries ?? []).filter(s => s.churchId === churchId)
  const totalDonations = churchSummaries.reduce((a, s) => a + s.totalDonations, 0)
  const totalExpenses = churchSummaries.reduce((a, s) => a + s.totalExpenses, 0)
  const balance = totalDonations - totalExpenses

  const upcomingBirthdays = useMemo(() =>
    (tithes ?? []).filter(t => t.birthDate && isBirthdayInNextDays(t.birthDate.toDate())),
    [tithes])

  const overdueTasks = (dailyTasks ?? []).filter(t => t.dueDate && t.dueDate.toDate() < new Date() && !t.completed)

  const chartData = MONTHS.map((m, idx) => {
    const s = churchSummaries.find(s => s.month === idx + 1)
    return { month: m.label, donations: (s?.totalDonations ?? 0) / 100, expenses: (s?.totalExpenses ?? 0) / 100 }
  })

  const option = {
    tooltip,
    legend: { data: ['Dízimos', 'Despesas'], bottom: 0, textStyle: { fontSize: 12 } },
    color: CHART_COLORS,
    xAxis: { type: 'category', data: chartData.map(d => d.month), axisLine: { lineStyle: { color: '#ccc' } } },
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `R$${(v / 1000).toFixed(0)}k` } },
    series: [
      {
        name: 'Dízimos', type: 'bar', data: chartData.map(d => d.donations), barMaxWidth: 28,
        itemStyle: { borderRadius: [4, 4, 0, 0] },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(201,162,39,0.5)' } },
      },
      {
        name: 'Despesas', type: 'bar', data: chartData.map(d => d.expenses), barMaxWidth: 28,
        itemStyle: { borderRadius: [4, 4, 0, 0] },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(139,26,26,0.5)' } },
      },
    ],
    grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Total Dízimos" value={formatCurrency(totalDonations)} icon={DollarSign} color="gold" />
        <KpiCard title="Total Despesas" value={formatCurrency(totalExpenses)} icon={TrendingDown} color="red" />
        <KpiCard title="Saldo" value={formatCurrency(Math.abs(balance))} subtitle={balance >= 0 ? 'positivo' : 'negativo'} icon={balance >= 0 ? TrendingUp : TrendingDown} color={balance >= 0 ? 'green' : 'red'} />
        <KpiCard title="Dizimistas Ativos" value={String((tithes ?? []).length)} icon={Users} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AlertCard id="birthdays" title={`🎂 Aniversários (${upcomingBirthdays.length})`}>
          {upcomingBirthdays.length === 0
            ? <p className="text-sm text-muted-foreground">Nenhum aniversário nos próximos 7 dias.</p>
            : <ul className="space-y-1">{upcomingBirthdays.map(t => (
              <li key={t.id} className="text-sm flex justify-between">
                <span>{t.fullName}</span>
                <span className="text-muted-foreground">{formatDate(t.birthDate?.toDate())}</span>
              </li>))}</ul>}
        </AlertCard>
        <AlertCard id="overdue-tasks" title={`⚠️ Tarefas Atrasadas (${overdueTasks.length})`}>
          {overdueTasks.length === 0
            ? <p className="text-sm text-muted-foreground">Nenhuma tarefa atrasada.</p>
            : <ul className="space-y-1">{overdueTasks.slice(0, 5).map(t => (
              <li key={t.id} className="text-sm flex justify-between">
                <span className="truncate">{t.title}</span>
                <Badge variant="warning">{formatDate(t.dueDate?.toDate())}</Badge>
              </li>))}</ul>}
        </AlertCard>
        <AlertCard id="all-tasks" title={`✅ Painel do Dia (${(dailyTasks ?? []).length})`}>
          {(dailyTasks ?? []).length === 0
            ? <p className="text-sm text-muted-foreground">Sem tarefas no painel.</p>
            : <ul className="space-y-1">{(dailyTasks ?? []).slice(0, 5).map(t => (
              <li key={t.id} className="text-sm flex items-center gap-2">
                <CheckSquare className="w-3 h-3 text-primary shrink-0" />
                <span className="truncate">{t.title}</span>
              </li>))}</ul>}
        </AlertCard>
      </div>

      <Card className="glass-card">
        <CardHeader><CardTitle>Dízimos vs Despesas — {CURRENT_YEAR}</CardTitle></CardHeader>
        <CardContent>
          <ReactECharts option={option} style={{ height: 300 }} opts={{ renderer: 'svg' }} />
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Tab: Receitas / Dízimos ─────────────────────────────────────────────────
function TabTithes({ churchId, tithes }: { churchId: string; tithes: ReturnType<typeof useTithes>['data'] }) {
  const { data: summaries = [] } = useSummariesForYear(churchId, CURRENT_YEAR)

  const monthlyData = MONTHS.map((m, idx) => {
    const s = summaries.find(s => s.month === idx + 1)
    return { month: m.label, value: (s?.totalDonations ?? 0) / 100, count: s?.activeTithesCount ?? 0 }
  })

  const cumulative: number[] = []
  monthlyData.reduce((acc, d, i) => { cumulative[i] = acc + d.value; return acc + d.value }, 0)

  const lineOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#c9a227',
      formatter: (params: unknown[]) => {
        const p = params as Array<{ marker: string; seriesName: string; value: number }>
        return p.map(i => `${i.marker} ${i.seriesName}: <b>${i.seriesName.includes('Acum') ? formatCurrency(Math.round(i.value * 100)) : formatCurrency(Math.round(i.value * 100))}</b>`).join('<br/>')
      },
    },
    legend: { data: ['Dízimos mensais', 'Acumulado'], bottom: 0 },
    color: ['#c9a227', '#1a3a5c'],
    xAxis: { type: 'category', data: monthlyData.map(d => d.month) },
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `R$${(v / 1000).toFixed(0)}k` } },
    series: [
      {
        name: 'Dízimos mensais', type: 'bar', data: monthlyData.map(d => d.value),
        barMaxWidth: 32, itemStyle: { borderRadius: [4, 4, 0, 0], color: '#c9a227' },
        emphasis: { itemStyle: { shadowBlur: 12, shadowColor: 'rgba(201,162,39,0.6)' } },
        markLine: {
          data: [{ type: 'average', name: 'Média' }],
          lineStyle: { color: '#8b1a1a', type: 'dashed' },
          label: { formatter: (p: { value: number }) => `Média: ${formatCurrency(Math.round(p.value * 100))}` },
        },
      },
      {
        name: 'Acumulado', type: 'line', data: cumulative,
        smooth: true, symbol: 'circle', symbolSize: 6,
        lineStyle: { color: '#1a3a5c', width: 2 },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(26,58,92,0.15)' }, { offset: 1, color: 'rgba(26,58,92,0.01)' }] } },
      },
    ],
    grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
  }

  const currentMonth = summaries.find(s => s.month === CURRENT_MONTH)
  const prevMonth = summaries.find(s => s.month === CURRENT_MONTH - 1)
  const growth = prevMonth?.totalDonations
    ? ((( currentMonth?.totalDonations ?? 0) - prevMonth.totalDonations) / prevMonth.totalDonations * 100).toFixed(1)
    : null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Arrecadado no mês" value={formatCurrency(currentMonth?.totalDonations ?? 0)} icon={HandCoins} color="gold" subtitle={growth ? `${Number(growth) >= 0 ? '+' : ''}${growth}% vs mês anterior` : undefined} />
        <KpiCard title="Acumulado no ano" value={formatCurrency(summaries.reduce((a, s) => a + s.totalDonations, 0))} icon={TrendingUp} color="green" />
        <KpiCard title="Dizimistas ativos" value={String((tithes ?? []).length)} icon={Users} color="blue" />
        <KpiCard title="Média mensal" value={formatCurrency(Math.round(summaries.reduce((a, s) => a + s.totalDonations, 0) / Math.max(summaries.filter(s => s.totalDonations > 0).length, 1)))} icon={BarChart3} color="gold" />
      </div>
      <Card className="glass-card">
        <CardHeader><CardTitle>Evolução dos Dízimos — {CURRENT_YEAR}</CardTitle></CardHeader>
        <CardContent>
          <ReactECharts option={lineOption} style={{ height: 320 }} opts={{ renderer: 'svg' }} />
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Tab: Despesas ───────────────────────────────────────────────────────────
function TabExpenses({ churchId }: { churchId: string }) {
  const { data: result } = useExpenses({ churchId })
  const { data: summaries = [] } = useSummariesForYear(churchId, CURRENT_YEAR)
  const expenses = result?.expenses ?? []

  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount
    return acc
  }, {})

  const pieOption = {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#8b1a1a',
      formatter: (p: { name: string; value: number; percent: number }) =>
        `<b>${p.name}</b><br/>${formatCurrency(p.value)}<br/>${p.percent.toFixed(1)}%`,
    },
    color: CHART_COLORS,
    series: [{
      type: 'pie', radius: ['38%', '68%'],
      data: Object.entries(byCategory).map(([name, value]) => ({ name, value })),
      label: { formatter: '{b}\n{d}%', fontSize: 11 },
      emphasis: { itemStyle: { shadowBlur: 20, shadowColor: 'rgba(0,0,0,0.3)' }, scaleSize: 8 },
    }],
  }

  const monthlyOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#8b1a1a',
      formatter: (params: unknown[]) => {
        const p = params as Array<{ marker: string; seriesName: string; value: number }>
        return p.map(i => `${i.marker} ${i.seriesName}: <b>${formatCurrency(Math.round(i.value * 100))}</b>`).join('<br/>')
      },
    },
    color: ['#8b1a1a'],
    xAxis: { type: 'category', data: MONTHS.map(m => m.label) },
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `R$${(v / 1000).toFixed(0)}k` } },
    series: [{
      name: 'Despesas', type: 'bar',
      data: MONTHS.map((_, idx) => (summaries.find(s => s.month === idx + 1)?.totalExpenses ?? 0) / 100),
      barMaxWidth: 32,
      itemStyle: { borderRadius: [4, 4, 0, 0], color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#c0392b' }, { offset: 1, color: '#8b1a1a' }] } },
      emphasis: { itemStyle: { shadowBlur: 12, shadowColor: 'rgba(139,26,26,0.5)' } },
    }],
    grid: { left: '3%', right: '4%', bottom: '5%', containLabel: true },
  }

  const totalExp = summaries.reduce((a, s) => a + s.totalExpenses, 0)
  const totalDon = summaries.reduce((a, s) => a + s.totalDonations, 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Despesas no mês" value={formatCurrency(summaries.find(s => s.month === CURRENT_MONTH)?.totalExpenses ?? 0)} icon={TrendingDown} color="red" />
        <KpiCard title="Total no ano" value={formatCurrency(totalExp)} icon={TrendingDown} color="red" />
        <KpiCard title="Saldo do ano" value={formatCurrency(Math.abs(totalDon - totalExp))} subtitle={(totalDon - totalExp) >= 0 ? 'positivo' : 'negativo'} icon={DollarSign} color={(totalDon - totalExp) >= 0 ? 'green' : 'red'} />
        <KpiCard title="Categorias" value={String(Object.keys(byCategory).length)} icon={PieChart} color="blue" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="glass-card">
          <CardHeader><CardTitle>Despesas por Categoria</CardTitle></CardHeader>
          <CardContent>
            {Object.keys(byCategory).length === 0
              ? <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma despesa registrada.</p>
              : <ReactECharts option={pieOption} style={{ height: 300 }} opts={{ renderer: 'svg' }} />}
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader><CardTitle>Despesas Mensais — {CURRENT_YEAR}</CardTitle></CardHeader>
          <CardContent>
            <ReactECharts option={monthlyOption} style={{ height: 300 }} opts={{ renderer: 'svg' }} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Tab: Comparativo entre igrejas (admin only) ─────────────────────────────
function TabComparison({ churches, allSummaries }: {
  churches: ReturnType<typeof useChurches>['data']
  allSummaries: ReturnType<typeof useAllSummariesForYear>['data']
}) {
  const chs = churches ?? []
  const sums = allSummaries ?? []

  const churchTotals = chs.map((c, idx) => ({
    name: c.name,
    donations: sums.filter(s => s.churchId === c.id).reduce((a, s) => a + s.totalDonations, 0),
    expenses: sums.filter(s => s.churchId === c.id).reduce((a, s) => a + s.totalExpenses, 0),
    color: CHART_COLORS[idx % CHART_COLORS.length],
  }))

  const barOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#c9a227',
      formatter: (params: unknown[]) => {
        const p = params as Array<{ marker: string; seriesName: string; value: number; axisValue: string }>
        const header = `<b>${p[0]?.axisValue}</b><br/>`
        return header + p.map(i => `${i.marker} ${i.seriesName}: <b>${formatCurrency(Math.round(i.value * 100))}</b>`).join('<br/>')
      },
    },
    legend: { data: ['Dízimos', 'Despesas', 'Saldo'], bottom: 0 },
    color: ['#c9a227', '#8b1a1a', '#2e7d32'],
    xAxis: { type: 'category', data: churchTotals.map(c => c.name), axisLabel: { interval: 0, rotate: 15 } },
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `R$${(v / 1000).toFixed(0)}k` } },
    series: [
      { name: 'Dízimos', type: 'bar', data: churchTotals.map(c => c.donations / 100), barMaxWidth: 28, itemStyle: { borderRadius: [4, 4, 0, 0] }, emphasis: { itemStyle: { shadowBlur: 10 } } },
      { name: 'Despesas', type: 'bar', data: churchTotals.map(c => c.expenses / 100), barMaxWidth: 28, itemStyle: { borderRadius: [4, 4, 0, 0] }, emphasis: { itemStyle: { shadowBlur: 10 } } },
      { name: 'Saldo', type: 'line', data: churchTotals.map(c => (c.donations - c.expenses) / 100), smooth: true, symbol: 'circle', symbolSize: 8, lineStyle: { width: 2, color: '#2e7d32' } },
    ],
    grid: { left: '3%', right: '4%', bottom: '18%', containLabel: true },
  }

  const pieOption = {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255,255,255,0.95)',
      formatter: (p: { name: string; value: number; percent: number }) =>
        `<b>${p.name}</b><br/>${formatCurrency(p.value)}<br/>${p.percent.toFixed(1)}%`,
    },
    color: CHART_COLORS,
    series: [{
      type: 'pie', radius: ['35%', '65%'],
      data: churchTotals.map(c => ({ name: c.name, value: c.donations })),
      label: { formatter: '{b}\n{d}%' },
      emphasis: { itemStyle: { shadowBlur: 20, shadowColor: 'rgba(0,0,0,0.25)' }, scaleSize: 8 },
    }],
  }

  const topChurch = [...churchTotals].sort((a, b) => b.donations - a.donations)[0]
  const totalAll = churchTotals.reduce((a, c) => a + c.donations, 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Igrejas ativas" value={String(chs.length)} icon={GitCompare} color="blue" />
        <KpiCard title="Total consolidado" value={formatCurrency(totalAll)} icon={DollarSign} color="gold" />
        <KpiCard title="Maior arrecadação" value={topChurch?.name ?? '—'} subtitle={topChurch ? formatCurrency(topChurch.donations) : ''} icon={TrendingUp} color="green" />
        <KpiCard title="Total despesas" value={formatCurrency(churchTotals.reduce((a, c) => a + c.expenses, 0))} icon={TrendingDown} color="red" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="glass-card">
          <CardHeader><CardTitle>Dízimos vs Despesas por Igreja</CardTitle></CardHeader>
          <CardContent>
            {chs.length === 0
              ? <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma igreja cadastrada.</p>
              : <ReactECharts option={barOption} style={{ height: 300 }} opts={{ renderer: 'svg' }} />}
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader><CardTitle>Participação por Igreja</CardTitle></CardHeader>
          <CardContent>
            {chs.length === 0
              ? <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma igreja cadastrada.</p>
              : <ReactECharts option={pieOption} style={{ height: 300 }} opts={{ renderer: 'svg' }} />}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Tab: Dizimistas ──────────────────────────────────────────────────────────
function TabDonors({ churchId, tithes }: { churchId: string; tithes: ReturnType<typeof useTithes>['data'] }) {
  const { data: summaries = [] } = useSummariesForYear(churchId, CURRENT_YEAR)
  const donors = tithes ?? []

  const upcomingBirthdays = donors.filter(t => t.birthDate && isBirthdayInNextDays(t.birthDate.toDate(), 30))
  const withBirthdate = donors.filter(t => !!t.birthDate)

  const monthBirthdays = MONTHS.map((_m, idx) =>
    donors.filter(t => t.birthDate && t.birthDate.toDate().getMonth() === idx).length
  )

  const birthdayOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.95)',
      formatter: (params: unknown[]) => {
        const p = params as Array<{ name: string; value: number }>
        return `<b>${p[0]?.name}</b>: ${p[0]?.value} aniversariante(s)`
      },
    },
    color: ['#6a1b9a'],
    xAxis: { type: 'category', data: MONTHS.map(m => m.label) },
    yAxis: { type: 'value', minInterval: 1 },
    series: [{
      name: 'Aniversariantes', type: 'bar', data: monthBirthdays,
      barMaxWidth: 32, itemStyle: { borderRadius: [4, 4, 0, 0] },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(106,27,154,0.5)' } },
    }],
    grid: { left: '3%', right: '4%', bottom: '5%', containLabel: true },
  }

  const avgMonthly = summaries.length > 0
    ? Math.round(summaries.reduce((a, s) => a + s.totalDonations, 0) / Math.max(summaries.filter(s => s.totalDonations > 0).length, 1) / Math.max(donors.length, 1))
    : 0

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Total dizimistas" value={String(donors.length)} icon={Users} color="blue" />
        <KpiCard title="Com data de nasc." value={String(withBirthdate.length)} icon={UserCheck} color="gold" />
        <KpiCard title="Aniversários (30 dias)" value={String(upcomingBirthdays.length)} icon={UserCheck} color="green" />
        <KpiCard title="Média doação/pessoa" value={formatCurrency(avgMonthly)} subtitle="por mês" icon={HandCoins} color="gold" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="glass-card">
          <CardHeader><CardTitle>Aniversários por Mês</CardTitle></CardHeader>
          <CardContent>
            <ReactECharts option={birthdayOption} style={{ height: 260 }} opts={{ renderer: 'svg' }} />
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader><CardTitle>Próximos Aniversários (30 dias)</CardTitle></CardHeader>
          <CardContent>
            {upcomingBirthdays.length === 0
              ? <p className="text-sm text-muted-foreground py-8 text-center">Nenhum aniversariante nos próximos 30 dias.</p>
              : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {upcomingBirthdays.map(t => (
                    <div key={t.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-purple-50 border border-purple-100">
                      <span className="font-medium">{t.fullName}</span>
                      <span className="text-muted-foreground">{formatDate(t.birthDate?.toDate())}</span>
                    </div>
                  ))}
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function Dashboard() {
  const { user } = useAuthStore()
  const { data: allChurches = [] } = useChurches()
  const activeChurchId = user?.activeChurchId ?? user?.churchIds?.[0] ?? ''
  const { data: tithes = [] } = useTithes(activeChurchId)
  const { data: allSummaries = [] } = useAllSummariesForYear(CURRENT_YEAR)
  const { data: dailyTasks = [] } = useDailyTasks(user?.uid ?? '')

  const activeChurchName = allChurches.find(c => c.id === activeChurchId)?.name ?? 'Geral'

  return (
    <div className="space-y-4">
      <PageHeader title="Dashboard" description={`Ano ${CURRENT_YEAR} — ${activeChurchName}`} />

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto gap-1 mb-2">
          <TabsTrigger value="overview" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" />Visão Geral</TabsTrigger>
          <TabsTrigger value="tithes" className="gap-1.5"><HandCoins className="w-3.5 h-3.5" />Dízimos</TabsTrigger>
          <TabsTrigger value="expenses" className="gap-1.5"><TrendingDown className="w-3.5 h-3.5" />Despesas</TabsTrigger>
          {user?.isAdmin && (
            <TabsTrigger value="comparison" className="gap-1.5"><GitCompare className="w-3.5 h-3.5" />Comparativo</TabsTrigger>
          )}
          <TabsTrigger value="donors" className="gap-1.5"><UserCheck className="w-3.5 h-3.5" />Dizimistas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <TabOverview churchId={activeChurchId} summaries={allSummaries} tithes={tithes} dailyTasks={dailyTasks} />
        </TabsContent>

        <TabsContent value="tithes">
          <TabTithes churchId={activeChurchId} tithes={tithes} />
        </TabsContent>

        <TabsContent value="expenses">
          <TabExpenses churchId={activeChurchId} />
        </TabsContent>

        {user?.isAdmin && (
          <TabsContent value="comparison">
            <TabComparison churches={allChurches} allSummaries={allSummaries} />
          </TabsContent>
        )}

        <TabsContent value="donors">
          <TabDonors churchId={activeChurchId} tithes={tithes} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
