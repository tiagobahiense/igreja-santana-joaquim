import { useMemo, useState } from 'react'
import {
  DollarSign, Users, TrendingDown, TrendingUp,
  ChevronDown, ChevronUp, HandCoins,
  BarChart3, Building2, Filter, Cake, Church,
} from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import { useAuthStore } from '@/stores/auth.store'
import { useChurches, useMatrizChurch } from '@/hooks/use-churches'
import { PARISH_NAME, getCapelaChurches, getChurchesForComparison, isMatrizChurch } from '@/lib/churches'
import { useTithes, useAllDonationsForYear } from '@/hooks/use-tithes'
import { useAllSummariesForYear, useSummariesForYear } from '@/hooks/use-summaries'
import { KpiCard } from '@/components/KpiCard'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { formatCurrency, formatDate, isBirthdayInNextDays, MONTHS, getDonationTotal, getDonationMonthsCount, getLastDonationMonth, getCurrentMonthDonation, getMonthLabel } from '@/lib/utils'
import { useUiStore } from '@/stores/ui.store'
import { useExpenses } from '@/hooks/use-expenses'
import { UpcomingEventsPanel } from '@/components/UpcomingEventsPanel'

const CURRENT_YEAR = new Date().getFullYear()
const CURRENT_MONTH = new Date().getMonth() + 1

const CHART_COLORS = ['#c9a227', '#8b1a1a', '#1a3a5c', '#2e7d32', '#6a1b9a', '#00695c', '#bf360c', '#0277bd']

function AlertCard({ id, title, children, icon: Icon }: { id: string; title: string; children: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
  const { isAlertMinimized, minimizeAlert, restoreAlert } = useUiStore()
  const minimized = isAlertMinimized(id)
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer" onClick={() => minimized ? restoreAlert(id) : minimizeAlert(id)}>
        <span className="font-semibold text-sm flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-primary" />}
          {title}
        </span>
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

// ─── Tab: Matriz (KPIs da paróquia) ──────────────────────────────────────────
function TabMatriz({ matrizChurchId, summaries, tithes }: {
  matrizChurchId: string
  summaries: ReturnType<typeof useAllSummariesForYear>['data']
  tithes: ReturnType<typeof useTithes>['data']
}) {
  const { data: expenseResult } = useExpenses({ churchId: matrizChurchId || undefined })
  const entries = expenseResult?.expenses ?? []
  const churchSummaries = (summaries ?? []).filter(s => s.churchId === matrizChurchId)

  const totalDonations = churchSummaries.reduce((a, s) => a + s.totalDonations, 0)
  const manualIncome = entries
    .filter(e => (e.type ?? 'expense') === 'income')
    .reduce((a, e) => a + e.amount, 0)
  const totalExpenses = entries
    .filter(e => (e.type ?? 'expense') === 'expense')
    .reduce((a, e) => a + e.amount, 0)
  const totalEntradas = totalDonations + manualIncome
  const balance = totalEntradas - totalExpenses

  const upcomingBirthdays = useMemo(() =>
    (tithes ?? []).filter(t => t.birthDate && isBirthdayInNextDays(t.birthDate.toDate())),
    [tithes])

  const chartData = MONTHS.map((m, idx) => {
    const s = churchSummaries.find(s => s.month === idx + 1)
    const monthEntries = entries.filter(e => {
      const d = e.date.toDate()
      return d.getFullYear() === CURRENT_YEAR && d.getMonth() === idx
    })
    const monthManualIncome = monthEntries
      .filter(e => (e.type ?? 'expense') === 'income')
      .reduce((a, e) => a + e.amount, 0) / 100
    const monthExpenses = monthEntries
      .filter(e => (e.type ?? 'expense') === 'expense')
      .reduce((a, e) => a + e.amount, 0) / 100
    return {
      month: m.label,
      donations: (s?.totalDonations ?? 0) / 100,
      otherIncome: monthManualIncome,
      expenses: monthExpenses,
    }
  })

  const option = {
    tooltip,
    legend: { data: ['Dízimos', 'Outras entradas', 'Saídas'], bottom: 0, textStyle: { fontSize: 12 } },
    color: ['#c9a227', '#2e7d32', '#8b1a1a'],
    xAxis: { type: 'category', data: chartData.map(d => d.month), axisLine: { lineStyle: { color: '#ccc' } } },
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `R$${(v / 1000).toFixed(0)}k` } },
    series: [
      { name: 'Dízimos', type: 'bar', data: chartData.map(d => d.donations), barMaxWidth: 24, stack: 'in', itemStyle: { borderRadius: [0, 0, 0, 0] } },
      { name: 'Outras entradas', type: 'bar', data: chartData.map(d => d.otherIncome), barMaxWidth: 24, stack: 'in', itemStyle: { borderRadius: [4, 4, 0, 0] } },
      { name: 'Saídas', type: 'bar', data: chartData.map(d => d.expenses), barMaxWidth: 28, itemStyle: { borderRadius: [4, 4, 0, 0] } },
    ],
    grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        <KpiCard title="Dízimos" value={formatCurrency(totalDonations)} icon={HandCoins} color="gold" />
        <KpiCard title="Outras entradas" value={formatCurrency(manualIncome)} icon={TrendingUp} color="green" />
        <KpiCard title="Saídas" value={formatCurrency(totalExpenses)} icon={TrendingDown} color="red" />
        <KpiCard title="Saldo" value={formatCurrency(Math.abs(balance))} subtitle={balance >= 0 ? 'positivo' : 'negativo'} icon={balance >= 0 ? TrendingUp : TrendingDown} color={balance >= 0 ? 'green' : 'red'} />
        <KpiCard title="Dizimistas" value={String((tithes ?? []).length)} icon={Users} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AlertCard id="birthdays" title={`Aniversários (${upcomingBirthdays.length})`} icon={Cake}>
          {upcomingBirthdays.length === 0
            ? <p className="text-sm text-muted-foreground">Nenhum aniversário nos próximos 7 dias.</p>
            : <ul className="space-y-1">{upcomingBirthdays.map(t => (
              <li key={t.id} className="text-sm flex justify-between">
                <span>{t.fullName}</span>
                <span className="text-muted-foreground">{formatDate(t.birthDate?.toDate())}</span>
              </li>))}</ul>}
        </AlertCard>
        <UpcomingEventsPanel limit={4} />
      </div>

      <Card className="glass-card">
        <CardHeader><CardTitle>{PARISH_NAME} — {CURRENT_YEAR}</CardTitle></CardHeader>
        <CardContent>
          <ReactECharts option={option} style={{ height: 300 }} opts={{ renderer: 'svg' }} />
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Tab: Visão Geral (admin — somente leitura) ──────────────────────────────
function TabAdminOverview({ summaries }: {
  summaries: ReturnType<typeof useAllSummariesForYear>['data']
}) {
  const all = summaries ?? []
  const totalDonations = all.reduce((a, s) => a + s.totalDonations, 0)
  const totalExpenses = all.reduce((a, s) => a + s.totalExpenses, 0)
  const balance = totalDonations - totalExpenses

  const chartData = MONTHS.map((m, idx) => {
    const monthSums = all.filter((s) => s.month === idx + 1)
    return {
      month: m.label,
      donations: monthSums.reduce((a, s) => a + s.totalDonations, 0) / 100,
      expenses: monthSums.reduce((a, s) => a + s.totalExpenses, 0) / 100,
    }
  })

  const option = {
    tooltip,
    legend: { data: ['Dízimos', 'Despesas'], bottom: 0, textStyle: { fontSize: 12 } },
    color: CHART_COLORS,
    xAxis: { type: 'category', data: chartData.map(d => d.month) },
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `R$${(v / 1000).toFixed(0)}k` } },
    series: [
      { name: 'Dízimos', type: 'bar', data: chartData.map(d => d.donations), barMaxWidth: 28, itemStyle: { borderRadius: [4, 4, 0, 0] } },
      { name: 'Despesas', type: 'bar', data: chartData.map(d => d.expenses), barMaxWidth: 28, itemStyle: { borderRadius: [4, 4, 0, 0] } },
    ],
    grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Total Dízimos" value={formatCurrency(totalDonations)} icon={DollarSign} color="gold" />
        <KpiCard title="Total Despesas" value={formatCurrency(totalExpenses)} icon={TrendingDown} color="red" />
        <KpiCard title="Saldo" value={formatCurrency(Math.abs(balance))} subtitle={balance >= 0 ? 'positivo' : 'negativo'} icon={balance >= 0 ? TrendingUp : TrendingDown} color={balance >= 0 ? 'green' : 'red'} />
        <KpiCard title="Igrejas" value={String(new Set(all.map((s) => s.churchId)).size)} icon={Building2} color="blue" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="glass-card">
          <CardHeader><CardTitle>Consolidado — {CURRENT_YEAR}</CardTitle></CardHeader>
          <CardContent>
            <ReactECharts option={option} style={{ height: 300 }} opts={{ renderer: 'svg' }} />
          </CardContent>
        </Card>
        <UpcomingEventsPanel limit={6} />
      </div>
    </div>
  )
}

// ─── Tab: Dízimos (valores + dizimistas) ─────────────────────────────────────
function TabTithes({
  churchId,
  tithes,
}: {
  churchId: string
  tithes: ReturnType<typeof useTithes>['data']
}) {
  const { data: summaries = [] } = useSummariesForYear(churchId, CURRENT_YEAR)
  const { data: allDonations } = useAllDonationsForYear(churchId, CURRENT_YEAR)
  const donors = tithes ?? []
  const donationsMap = allDonations ?? new Map()

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
        return p.map(i => `${i.marker} ${i.seriesName}: <b>${formatCurrency(Math.round(i.value * 100))}</b>`).join('<br/>')
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
    ? (((currentMonth?.totalDonations ?? 0) - prevMonth.totalDonations) / prevMonth.totalDonations * 100).toFixed(1)
    : null

  const donorStats = useMemo(() =>
    donors.map((t) => {
      const record = donationsMap.get(t.id)
      const total = getDonationTotal(record)
      const monthsPaid = getDonationMonthsCount(record)
      return {
        id: t.id,
        name: t.fullName,
        total,
        monthsPaid,
        lastMonth: getLastDonationMonth(record),
        currentMonth: getCurrentMonthDonation(record),
        avgMonthly: monthsPaid > 0 ? Math.round(total / monthsPaid) : 0,
      }
    }).sort((a, b) => b.total - a.total),
  [donors, donationsMap])

  const totalArrecadado = donorStats.reduce((a, d) => a + d.total, 0)
  const donorsThisMonth = donorStats.filter((d) => d.currentMonth > 0).length
  const avgPerDonor = donors.length > 0 ? Math.round(totalArrecadado / donors.length) : 0
  const topDonor = donorStats[0]
  const top10 = donorStats.slice(0, 10)

  const topDonorsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#c9a227',
      formatter: (params: unknown[]) => {
        const p = params as Array<{ name: string; value: number }>
        return `<b>${p[0]?.name}</b><br/>Total: ${formatCurrency(Math.round((p[0]?.value ?? 0) * 100))}`
      },
    },
    grid: { left: '3%', right: '8%', bottom: '3%', top: '3%', containLabel: true },
    xAxis: { type: 'value', axisLabel: { formatter: (v: number) => `R$${(v / 1000).toFixed(0)}k` } },
    yAxis: { type: 'category', data: top10.map((d) => d.name).reverse(), axisLabel: { width: 90, overflow: 'truncate' } },
    series: [{
      type: 'bar',
      data: top10.map((d) => d.total / 100).reverse(),
      barMaxWidth: 22,
      itemStyle: { borderRadius: [0, 4, 4, 0], color: '#c9a227' },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(201,162,39,0.5)' } },
    }],
  }

  const monthlyParticipation = MONTHS.map((m) =>
    donors.filter((t) => (Number(donationsMap.get(t.id)?.[m.key]) || 0) > 0).length,
  )

  const participationOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.95)',
      formatter: (params: unknown[]) => {
        const p = params as Array<{ name: string; value: number }>
        return `<b>${p[0]?.name}</b><br/>${p[0]?.value} dizimista(s) contribuíram`
      },
    },
    color: ['#1a3a5c'],
    xAxis: { type: 'category', data: MONTHS.map((m) => m.label) },
    yAxis: { type: 'value', minInterval: 1, name: 'Dizimistas' },
    series: [{
      name: 'Contribuintes', type: 'bar', data: monthlyParticipation, barMaxWidth: 32,
      itemStyle: { borderRadius: [4, 4, 0, 0] },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(26,58,92,0.4)' } },
    }],
    grid: { left: '3%', right: '4%', bottom: '5%', containLabel: true },
  }

  if (!churchId) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard title="Arrecadado no mês" value={formatCurrency(0)} icon={HandCoins} color="gold" />
          <KpiCard title="Acumulado no ano" value={formatCurrency(0)} icon={TrendingUp} color="green" />
          <KpiCard title="Dizimistas ativos" value="0" icon={Users} color="blue" />
          <KpiCard title="Média por dizimista" value={formatCurrency(0)} icon={DollarSign} color="gold" />
        </div>
        <Card className="glass-card">
          <CardHeader><CardTitle>Evolução dos Dízimos — {CURRENT_YEAR}</CardTitle></CardHeader>
          <CardContent>
            <ReactECharts option={lineOption} style={{ height: 320 }} opts={{ renderer: 'svg' }} />
          </CardContent>
        </Card>
        <p className="text-sm text-muted-foreground text-center py-2">
          Cadastre dizimistas na aba <strong>Dízimos</strong> para começar a registrar contribuições da {PARISH_NAME}.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Arrecadado no mês" value={formatCurrency(currentMonth?.totalDonations ?? 0)} icon={HandCoins} color="gold" subtitle={growth ? `${Number(growth) >= 0 ? '+' : ''}${growth}% vs mês anterior` : undefined} />
        <KpiCard title="Acumulado no ano" value={formatCurrency(summaries.reduce((a, s) => a + s.totalDonations, 0))} icon={TrendingUp} color="green" />
        <KpiCard title="Dizimistas ativos" value={String(donors.length)} icon={Users} color="blue" subtitle={`${donorsThisMonth} contribuíram este mês`} />
        <KpiCard title="Média por dizimista" value={formatCurrency(avgPerDonor)} icon={DollarSign} color="gold" subtitle={topDonor ? `maior: ${topDonor.name.split(' ')[0]}` : undefined} />
      </div>

      <Card className="glass-card">
        <CardHeader><CardTitle>Evolução dos Dízimos — {CURRENT_YEAR}</CardTitle></CardHeader>
        <CardContent>
          <ReactECharts option={lineOption} style={{ height: 320 }} opts={{ renderer: 'svg' }} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="glass-card">
          <CardHeader><CardTitle>Top 10 Dizimistas — {CURRENT_YEAR}</CardTitle></CardHeader>
          <CardContent>
            {top10.length === 0
              ? <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma contribuição registrada.</p>
              : <ReactECharts option={topDonorsOption} style={{ height: 300 }} opts={{ renderer: 'svg' }} />}
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader><CardTitle>Contribuintes por Mês</CardTitle></CardHeader>
          <CardContent>
            <ReactECharts option={participationOption} style={{ height: 300 }} opts={{ renderer: 'svg' }} />
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader><CardTitle>Detalhamento por Dizimista</CardTitle></CardHeader>
        <CardContent>
          {donorStats.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum dizimista cadastrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Nome</th>
                    <th className="pb-2 pr-4 font-medium text-right">Total {CURRENT_YEAR}</th>
                    <th className="pb-2 pr-4 font-medium text-right">Meses c/ doação</th>
                    <th className="pb-2 pr-4 font-medium text-right">Último mês</th>
                    <th className="pb-2 pr-4 font-medium text-right">Média/mês</th>
                    <th className="pb-2 font-medium text-right">Este mês</th>
                  </tr>
                </thead>
                <tbody>
                  {donorStats.map((d) => (
                    <tr key={d.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 pr-4 font-medium">{d.name}</td>
                      <td className="py-2.5 pr-4 text-right">{formatCurrency(d.total)}</td>
                      <td className="py-2.5 pr-4 text-right">{d.monthsPaid}</td>
                      <td className="py-2.5 pr-4 text-right">{d.lastMonth ? getMonthLabel(d.lastMonth) : '—'}</td>
                      <td className="py-2.5 pr-4 text-right">{formatCurrency(d.avgMonthly)}</td>
                      <td className="py-2.5 text-right">
                        {d.currentMonth > 0
                          ? <Badge variant="gold">{formatCurrency(d.currentMonth)}</Badge>
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Tab: Igrejas (consolidado com filtros) ──────────────────────────────────
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i)

function TabChurches({
  churches,
  mode = 'admin',
  matrizChurchId,
}: {
  churches: ReturnType<typeof useChurches>['data']
  mode?: 'admin' | 'capelas'
  matrizChurchId?: string
}) {
  const [filterYear, setFilterYear] = useState(CURRENT_YEAR)
  const [filterMonth, setFilterMonth] = useState('all')
  const [filterChurch, setFilterChurch] = useState('all')

  const { data: summaries = [] } = useAllSummariesForYear(filterYear)

  const activeChurches = useMemo(
    () => (churches ?? []).filter((c) => c.isActive !== false),
    [churches],
  )

  const capelas = useMemo(() => getCapelaChurches(activeChurches), [activeChurches])
  const compareChurches = useMemo(
    () => (mode === 'capelas' ? getChurchesForComparison(activeChurches) : activeChurches),
    [activeChurches, mode],
  )

  const filterOptions = mode === 'capelas'
    ? [{ id: 'all', name: 'Matriz + capelas' }, ...capelas.map((c) => ({ id: c.id, name: c.name }))]
    : [{ id: 'all', name: 'Todas as igrejas' }, ...activeChurches.map((c) => ({ id: c.id, name: c.name }))]

  const selectedChurches = useMemo(() => {
    if (filterChurch === 'all') return compareChurches
    const picked = activeChurches.find((c) => c.id === filterChurch)
    if (!picked) return compareChurches
    if (mode === 'capelas') {
      const matriz = activeChurches.find((c) => c.id === matrizChurchId)
      if (matriz && !isMatrizChurch(picked)) return [matriz, picked]
    }
    return [picked]
  }, [filterChurch, compareChurches, activeChurches, mode, matrizChurchId])

  const filteredSummaries = useMemo(() => {
    const churchIds = new Set(selectedChurches.map((c) => c.id))
    let result = (summaries ?? []).filter((s) => churchIds.has(s.churchId))
    if (filterMonth !== 'all') {
      result = result.filter((s) => s.month === Number(filterMonth))
    }
    return result
  }, [summaries, selectedChurches, filterMonth])

  const churchBreakdown = useMemo(() =>
    selectedChurches.map((c) => {
      const churchSums = filteredSummaries.filter((s) => s.churchId === c.id)
      const donations = churchSums.reduce((a, s) => a + s.totalDonations, 0)
      const otherIncome = churchSums.reduce((a, s) => a + (s.totalOtherIncome ?? 0), 0)
      const expenses = churchSums.reduce((a, s) => a + s.totalExpenses, 0)
      const entradas = donations + otherIncome
      let tithesCount = 0
      if (filterMonth !== 'all') {
        tithesCount = churchSums.find((s) => s.month === Number(filterMonth))?.activeTithesCount ?? 0
      } else {
        const allChurchSums = (summaries ?? []).filter((s) => s.churchId === c.id)
        const latest = [...allChurchSums].sort((a, b) => b.month - a.month)[0]
        tithesCount = latest?.activeTithesCount ?? 0
      }
      return {
        id: c.id,
        name: mode === 'capelas' && isMatrizChurch(c) ? PARISH_NAME : c.name,
        donations,
        otherIncome,
        entradas,
        expenses,
        balance: entradas - expenses,
        tithesCount,
      }
    }),
  [selectedChurches, filteredSummaries, summaries, filterMonth, mode])

  const totalEntradas = churchBreakdown.reduce((a, c) => a + c.entradas, 0)
  const totalExpenses = churchBreakdown.reduce((a, c) => a + c.expenses, 0)
  const totalBalance = totalEntradas - totalExpenses
  const totalTithes = churchBreakdown.reduce((a, c) => a + c.tithesCount, 0)

  const periodLabel = filterMonth === 'all'
    ? `Ano ${filterYear}`
    : `${MONTHS[Number(filterMonth) - 1]?.label}/${filterYear}`

  const scopeLabel = filterChurch === 'all'
    ? (mode === 'capelas' ? 'Matriz + capelas' : 'Todas as igrejas')
    : selectedChurches.map((c) => (mode === 'capelas' && isMatrizChurch(c) ? PARISH_NAME : c.name)).join(' vs ')

  const showPerChurchChart = filterChurch === 'all' ? selectedChurches.length > 1 : selectedChurches.length > 0

  const barOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#c9a227',
      formatter: (params: unknown[]) => {
        const p = params as Array<{ marker: string; seriesName: string; value: number; axisValue: string }>
        const header = `<b>${p[0]?.axisValue}</b><br/>`
        return header + p.map((i) => `${i.marker} ${i.seriesName}: <b>${formatCurrency(Math.round(i.value * 100))}</b>`).join('<br/>')
      },
    },
    legend: { data: ['Entradas', 'Despesas', 'Saldo'], bottom: 0 },
    color: ['#c9a227', '#8b1a1a', '#2e7d32'],
    xAxis: { type: 'category', data: churchBreakdown.map((c) => c.name), axisLabel: { interval: 0, rotate: 15 } },
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `R$${(v / 1000).toFixed(0)}k` } },
    series: [
      { name: 'Entradas', type: 'bar', data: churchBreakdown.map((c) => c.entradas / 100), barMaxWidth: 28, itemStyle: { borderRadius: [4, 4, 0, 0] } },
      { name: 'Despesas', type: 'bar', data: churchBreakdown.map((c) => c.expenses / 100), barMaxWidth: 28, itemStyle: { borderRadius: [4, 4, 0, 0] } },
      { name: 'Saldo', type: 'line', data: churchBreakdown.map((c) => c.balance / 100), smooth: true, symbol: 'circle', symbolSize: 8, lineStyle: { width: 2, color: '#2e7d32' } },
    ],
    grid: { left: '3%', right: '4%', bottom: '18%', containLabel: true },
  }

  const monthlyBreakdown = useMemo(() => {
    const churchIds = new Set(selectedChurches.map((c) => c.id))
    return MONTHS.map((m, idx) => {
      const monthSums = (summaries ?? []).filter((s) => churchIds.has(s.churchId) && s.month === idx + 1)
      if (filterMonth !== 'all' && idx + 1 !== Number(filterMonth)) {
        return { month: m.label, donations: 0, expenses: 0 }
      }
      return {
        month: m.label,
        donations: monthSums.reduce((a, s) => a + s.totalDonations + (s.totalOtherIncome ?? 0), 0) / 100,
        expenses: monthSums.reduce((a, s) => a + s.totalExpenses, 0) / 100,
      }
    })
  }, [summaries, selectedChurches, filterMonth])

  const monthlyOption = {
    tooltip,
    legend: { data: ['Entradas (Dízimos)', 'Despesas'], bottom: 0, textStyle: { fontSize: 12 } },
    color: ['#c9a227', '#8b1a1a'],
    xAxis: { type: 'category', data: monthlyBreakdown.map((d) => d.month) },
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `R$${(v / 1000).toFixed(0)}k` } },
    series: [
      { name: 'Entradas (Dízimos)', type: 'bar', data: monthlyBreakdown.map((d) => d.donations), barMaxWidth: 28, itemStyle: { borderRadius: [4, 4, 0, 0] } },
      { name: 'Despesas', type: 'bar', data: monthlyBreakdown.map((d) => d.expenses), barMaxWidth: 28, itemStyle: { borderRadius: [4, 4, 0, 0] } },
    ],
    grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
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
      data: churchBreakdown.filter((c) => c.entradas > 0).map((c) => ({ name: c.name, value: c.entradas })),
      label: { formatter: '{b}\n{d}%' },
      emphasis: { itemStyle: { shadowBlur: 20, shadowColor: 'rgba(0,0,0,0.25)' }, scaleSize: 8 },
    }],
  }

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground shrink-0">
              <Filter className="w-4 h-4" />
              Filtros
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
              <div className="space-y-1.5">
                <Label>Ano</Label>
                <Select value={String(filterYear)} onValueChange={(v) => setFilterYear(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {YEAR_OPTIONS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Mês</Label>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Ano inteiro</SelectItem>
                    {MONTHS.map((m, idx) => (
                      <SelectItem key={m.key} value={String(idx + 1)}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{mode === 'capelas' ? 'Capela' : 'Igreja'}</Label>
                <Select value={filterChurch} onValueChange={setFilterChurch}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {filterOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Exibindo: <span className="font-medium text-foreground">{scopeLabel}</span> · {periodLabel}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Entradas" value={formatCurrency(totalEntradas)} icon={HandCoins} color="gold" />
        <KpiCard title="Saídas" value={formatCurrency(totalExpenses)} icon={TrendingDown} color="red" />
        <KpiCard title="Saldo" value={formatCurrency(Math.abs(totalBalance))} subtitle={totalBalance >= 0 ? 'positivo' : 'negativo'} icon={totalBalance >= 0 ? TrendingUp : TrendingDown} color={totalBalance >= 0 ? 'green' : 'red'} />
        <KpiCard
          title={mode === 'capelas' ? 'Locais' : 'Dizimistas'}
          value={mode === 'capelas' ? String(selectedChurches.length) : String(totalTithes)}
          icon={mode === 'capelas' ? Building2 : Users}
          color="blue"
          subtitle={mode === 'capelas' ? 'no comparativo' : `${selectedChurches.length} igreja(s)`}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>{showPerChurchChart ? 'Entradas vs Despesas por Igreja' : 'Entradas vs Despesas — Mensal'}</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedChurches.length === 0
              ? <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma igreja disponível.</p>
              : <ReactECharts option={showPerChurchChart ? barOption : monthlyOption} style={{ height: 300 }} opts={{ renderer: 'svg' }} />}
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader><CardTitle>Participação nas Entradas</CardTitle></CardHeader>
          <CardContent>
            {churchBreakdown.filter((c) => c.entradas > 0).length === 0
              ? <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma entrada no período.</p>
              : <ReactECharts option={pieOption} style={{ height: 300 }} opts={{ renderer: 'svg' }} />}
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader><CardTitle>Consolidado por Igreja — {periodLabel}</CardTitle></CardHeader>
        <CardContent>
          {churchBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma igreja no filtro selecionado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Igreja</th>
                    <th className="pb-2 pr-4 font-medium text-right">Entradas</th>
                    <th className="pb-2 pr-4 font-medium text-right">Despesas</th>
                    <th className="pb-2 pr-4 font-medium text-right">Saldo</th>
                    <th className="pb-2 font-medium text-right">Dizimistas</th>
                  </tr>
                </thead>
                <tbody>
                  {churchBreakdown.map((c) => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 pr-4 font-medium">{c.name}</td>
                      <td className="py-2.5 pr-4 text-right">{formatCurrency(c.entradas)}</td>
                      <td className="py-2.5 pr-4 text-right">{formatCurrency(c.expenses)}</td>
                      <td className="py-2.5 pr-4 text-right">
                        <Badge variant={c.balance >= 0 ? 'success' : 'destructive'}>
                          {formatCurrency(Math.abs(c.balance))} {c.balance >= 0 ? '+' : '−'}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-right">{c.tithesCount}</td>
                    </tr>
                  ))}
                  {churchBreakdown.length > 1 && (
                    <tr className="font-semibold bg-muted/20">
                      <td className="py-2.5 pr-4">Total consolidado</td>
                      <td className="py-2.5 pr-4 text-right">{formatCurrency(totalEntradas)}</td>
                      <td className="py-2.5 pr-4 text-right">{formatCurrency(totalExpenses)}</td>
                      <td className="py-2.5 pr-4 text-right">{formatCurrency(Math.abs(totalBalance))}</td>
                      <td className="py-2.5 text-right">{totalTithes}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function Dashboard() {
  const { user } = useAuthStore()
  const isAdmin = !!user?.isAdmin
  const { data: allChurches = [] } = useChurches()
  const { data: matrizChurch, isLoading: matrizLoading } = useMatrizChurch()
  const matrizChurchId = matrizChurch?.id ?? ''
  const { data: tithes = [], isLoading: tithesLoading } = useTithes(matrizChurchId)
  const { data: allSummaries = [] } = useAllSummariesForYear(CURRENT_YEAR)

  const managerLoading = !isAdmin && (matrizLoading || (matrizChurchId !== '' && tithesLoading))

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dashboard"
        description={isAdmin ? `Ano ${CURRENT_YEAR} — Todas as igrejas` : `Ano ${CURRENT_YEAR} — Quase-Paróquia`}
      />

      {managerLoading ? (
        <div className="p-8 text-center text-muted-foreground">Carregando dados da paróquia...</div>
      ) : isAdmin ? (
        <Tabs defaultValue="overview">
          <TabsList className="flex-wrap h-auto gap-1 mb-2">
            <TabsTrigger value="overview" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" />Visão Geral</TabsTrigger>
            <TabsTrigger value="churches" className="gap-1.5"><Building2 className="w-3.5 h-3.5" />Igrejas</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <TabAdminOverview summaries={allSummaries} />
          </TabsContent>
          <TabsContent value="churches">
            <TabChurches churches={allChurches} />
          </TabsContent>
        </Tabs>
      ) : (
        <Tabs defaultValue="matriz">
          <TabsList className="flex-wrap h-auto gap-1 mb-2">
            <TabsTrigger value="matriz" className="gap-1.5"><Church className="w-3.5 h-3.5" />Matriz</TabsTrigger>
            <TabsTrigger value="tithes" className="gap-1.5"><HandCoins className="w-3.5 h-3.5" />Dízimos</TabsTrigger>
            <TabsTrigger value="capelas" className="gap-1.5"><Building2 className="w-3.5 h-3.5" />Capelas</TabsTrigger>
          </TabsList>
          <TabsContent value="matriz">
            <TabMatriz matrizChurchId={matrizChurchId} summaries={allSummaries} tithes={tithes} />
          </TabsContent>
          <TabsContent value="tithes">
            <TabTithes churchId={matrizChurchId} tithes={tithes} />
          </TabsContent>
          <TabsContent value="capelas">
            <TabChurches churches={allChurches} mode="capelas" matrizChurchId={matrizChurchId} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
