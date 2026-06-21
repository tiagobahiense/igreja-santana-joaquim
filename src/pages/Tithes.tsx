import { useMemo, useState, useEffect } from 'react'
import { Plus, HandCoins, Search, Pencil, Upload, Filter, Trash2, RotateCcw } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuthStore } from '@/stores/auth.store'
import {
  useTithes, useCreateTithe, useUpdateTithe, useSetDonation, useAllDonationsForYear,
  useSoftDeleteTithe, useRestoreTithe, useHardDeleteTithe, useHardDeleteAllTithes,
} from '@/hooks/use-tithes'
import { useMatrizChurch } from '@/hooks/use-churches'
import { PageHeader } from '@/components/PageHeader'
import { AuthorTag } from '@/components/AuthorTag'
import { EmptyState } from '@/components/EmptyState'
import { TitheImportDialog } from '@/components/TitheImportDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { FormField } from '@/components/FormField'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { titheDonorSchema, type TitheDonorFormData } from '@/schemas'
import { MONTHS, formatCurrency, calculateAge, cn, type MonthKey } from '@/lib/utils'
import {
  filterTithes,
  computeMonthTotals,
  computeGrandTotal,
  getDonationTotalForRecord,
  type TitheSearchMode,
} from '@/lib/tithe-filters'
import type { Tithe } from '@/types'
import { Timestamp } from 'firebase/firestore'
import { PARISH_NAME } from '@/lib/churches'

const CURRENT_YEAR = new Date().getFullYear()

const SEARCH_MODE_LABELS: Record<TitheSearchMode, string> = {
  all: 'Tudo',
  fullName: 'Nome completo',
  firstName: 'Primeiro nome',
  lastName: 'Sobrenome',
  identifier: 'Identificador',
  value: 'Valor (R$)',
}

export function Tithes() {
  const { user } = useAuthStore()
  const { data: matrizChurch, isLoading: matrizLoading } = useMatrizChurch()
  const matrizChurchId = matrizChurch?.id ?? ''

  const [showInactive, setShowInactive] = useState(false)
  const [softDeleteTarget, setSoftDeleteTarget] = useState<Tithe | null>(null)
  const [hardDeleteTarget, setHardDeleteTarget] = useState<Tithe | null>(null)
  const [hardDeleteConfirm, setHardDeleteConfirm] = useState('')
  const [deleteAllOpen, setDeleteAllOpen] = useState(false)
  const [deleteAllConfirm, setDeleteAllConfirm] = useState('')

  const { data: allTithes = [], isLoading: tithesLoading } = useTithes(matrizChurchId, 'all')
  const inactiveCount = useMemo(
    () => allTithes.filter((t) => t.isActive === false).length,
    [allTithes],
  )
  const tithes = useMemo(
    () => showInactive
      ? allTithes.filter((t) => t.isActive === false)
      : allTithes.filter((t) => t.isActive !== false),
    [allTithes, showInactive],
  )
  const activeCount = allTithes.length - inactiveCount

  useEffect(() => {
    if (showInactive && inactiveCount === 0) setShowInactive(false)
  }, [showInactive, inactiveCount])
  const { data: allDonations } = useAllDonationsForYear(matrizChurchId, CURRENT_YEAR)
  const createTithe = useCreateTithe()
  const updateTithe = useUpdateTithe()
  const setDonation = useSetDonation()
  const softDelete = useSoftDeleteTithe()
  const restore = useRestoreTithe()
  const hardDelete = useHardDeleteTithe()
  const hardDeleteAll = useHardDeleteAllTithes()

  const [search, setSearch] = useState('')
  const [searchMode, setSearchMode] = useState<TitheSearchMode>('all')
  const [monthFilter, setMonthFilter] = useState<MonthKey | 'all'>('all')
  const [minTotal, setMinTotal] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editing, setEditing] = useState<Tithe | null>(null)
  const [year] = useState(CURRENT_YEAR)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TitheDonorFormData>({
    resolver: zodResolver(titheDonorSchema),
  })

  const minTotalCents = useMemo(() => {
    const n = parseFloat(minTotal.replace(',', '.'))
    return Number.isNaN(n) ? 0 : Math.round(n * 100)
  }, [minTotal])

  const filtered = useMemo(
    () => filterTithes(tithes, allDonations, {
      query: search,
      searchMode,
      monthFilter,
      minTotalCents,
    }),
    [tithes, allDonations, search, searchMode, monthFilter, minTotalCents],
  )

  const monthTotals = useMemo(
    () => computeMonthTotals(filtered, allDonations),
    [filtered, allDonations],
  )
  const grandTotal = useMemo(
    () => computeGrandTotal(filtered, allDonations),
    [filtered, allDonations],
  )

  function openCreate() {
    setEditing(null)
    reset({ fullName: '', phone: '', birthDate: '' })
    setFormOpen(true)
  }

  function openEdit(tithe: Tithe) {
    setEditing(tithe)
    reset({
      fullName: tithe.fullName,
      phone: tithe.phone ?? '',
      birthDate: tithe.birthDate
        ? tithe.birthDate.toDate().toISOString().split('T')[0]
        : '',
    })
    setFormOpen(true)
  }

  async function onSubmit(data: TitheDonorFormData) {
    if (!matrizChurchId) return
    const payload = {
      churchId: matrizChurchId,
      fullName: data.fullName,
      phone: data.phone,
      birthDate: data.birthDate ? Timestamp.fromDate(new Date(data.birthDate)) : undefined,
    }
    if (editing) {
      await updateTithe.mutateAsync({ id: editing.id, data: payload })
    } else {
      await createTithe.mutateAsync({ ...payload, createdBy: user!.uid })
    }
    setFormOpen(false)
  }

  async function handleDonationChange(
    tithesId: string,
    month: MonthKey,
    rawValue: string,
  ) {
    if (!matrizChurchId) return
    const numeric = parseFloat(rawValue.replace(',', '.')) || 0
    await setDonation.mutateAsync({
      tithesId,
      churchId: matrizChurchId,
      year,
      month,
      valueInCents: Math.round(numeric * 100),
    })
  }

  if (matrizLoading || (matrizChurchId && tithesLoading)) {
    return <div className="p-8 text-center text-muted-foreground">Carregando dízimos da paróquia...</div>
  }

  if (!matrizChurchId) {
    return (
      <EmptyState
        icon={HandCoins}
        title="Registro da paróquia não encontrado"
        description={`Peça ao administrador para manter um cadastro com o nome "${PARISH_NAME}" ou "Quase-Paróquia" (sem ser capela).`}
      />
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dízimos"
        description={`Grade ${year} — ${PARISH_NAME} · ${showInactive ? `${inactiveCount} inativo(s)` : `${activeCount} dizimista(s)`} · Total ${formatCurrency(grandTotal)}`}
        action={
          <div className="flex flex-wrap gap-2 justify-end">
            {import.meta.env.DEV && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => { setDeleteAllOpen(true); setDeleteAllConfirm('') }}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />Apagar todos (teste)
              </Button>
            )}
            <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2">
              <Upload className="w-4 h-4" />Importar CSV
            </Button>
            <Button onClick={openCreate} className="gap-2 gold-gradient text-white">
              <Plus className="w-4 h-4" />Novo Dizimista
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-3 items-end p-4 rounded-xl glass-card">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              searchMode === 'value' ? 'Ex: 20 ou 20,00' :
              searchMode === 'identifier' ? 'Ex: DZ-0001 ou 42' :
              'Buscar dizimista...'
            }
            className="pl-9"
          />
        </div>

        <div className="space-y-1 min-w-[160px]">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <Filter className="w-3 h-3" />Buscar por
          </Label>
          <Select value={searchMode} onValueChange={(v) => setSearchMode(v as TitheSearchMode)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(SEARCH_MODE_LABELS) as [TitheSearchMode, string][]).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1 min-w-[130px]">
          <Label className="text-xs text-muted-foreground">Mês com doação</Label>
          <Select value={monthFilter} onValueChange={(v) => setMonthFilter(v as MonthKey | 'all')}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {MONTHS.map((m) => (
                <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1 min-w-[120px]">
          <Label className="text-xs text-muted-foreground">Total mínimo (R$)</Label>
          <Input
            value={minTotal}
            onChange={(e) => setMinTotal(e.target.value)}
            placeholder="0,00"
            className="h-9"
          />
        </div>

        {(search || monthFilter !== 'all' || minTotal) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearch(''); setMonthFilter('all'); setMinTotal(''); setSearchMode('all') }}
          >
            Limpar filtros
          </Button>
        )}

        {inactiveCount > 0 && (
          <Button
            variant={showInactive ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowInactive((v) => !v)}
          >
            {showInactive ? 'Ver ativos' : `Ver inativos (${inactiveCount})`}
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title={
            showInactive
              ? 'Nenhum dizimista inativo'
              : tithes.length === 0
                ? 'Nenhum dizimista cadastrado'
                : 'Nenhum resultado para os filtros'
          }
          action={
            !showInactive && tithes.length === 0
              ? <Button onClick={openCreate}>Cadastrar dizimista</Button>
              : showInactive
                ? <Button variant="outline" onClick={() => setShowInactive(false)}>Ver dizimistas ativos</Button>
                : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl glass-card">
          <table className="w-full text-sm min-w-[980px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-3 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide sticky left-0 bg-white/80 backdrop-blur-sm min-w-[72px]">
                  ID
                </th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide sticky left-[72px] bg-white/80 backdrop-blur-sm min-w-[180px]">
                  Dizimista
                </th>
                {MONTHS.map((m) => (
                  <th key={m.key} className="text-center px-2 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide min-w-[80px]">
                    {m.label}
                  </th>
                ))}
                <th className="text-center px-2 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide min-w-[90px]">Total</th>
                <th className="px-3 py-3 min-w-[88px]" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((tithe) => {
                const donations = allDonations?.get(tithe.id)
                const total = getDonationTotalForRecord(donations)
                const inactive = tithe.isActive === false
                return (
                  <tr key={tithe.id} className={cn(
                    'border-b border-border/50 hover:bg-muted/30 transition-colors',
                    inactive && 'opacity-60 bg-muted/20',
                  )}>
                    <td className="px-3 py-2 sticky left-0 bg-white/80 backdrop-blur-sm text-xs font-mono text-muted-foreground">
                      {tithe.externalId ?? '—'}
                    </td>
                    <td className="px-4 py-2 sticky left-[72px] bg-white/80 backdrop-blur-sm">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p
                          className="font-medium truncate max-w-[140px] cursor-default"
                          title={tithe.fullName}
                        >
                          {tithe.fullName}
                        </p>
                        {inactive && <Badge variant="warning" className="text-[10px] px-1 py-0">Inativo</Badge>}
                      </div>
                      <div className="flex flex-wrap items-center gap-1 mt-0.5">
                        {tithe.phone && (
                          <span className="text-xs text-muted-foreground">{tithe.phone}</span>
                        )}
                        {tithe.birthDate && (
                          <span className="text-xs text-muted-foreground">
                            {calculateAge(tithe.birthDate.toDate())} anos
                          </span>
                        )}
                        <AuthorTag userId={tithe.createdBy} />
                      </div>
                    </td>
                    {MONTHS.map((m) => {
                      const val = donations?.[m.key]
                      return (
                        <td key={m.key} className="px-1 py-2 text-center">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            disabled={inactive}
                            defaultValue={val ? (val / 100).toFixed(2) : ''}
                            onBlur={(e) => handleDonationChange(tithe.id, m.key, e.target.value)}
                            placeholder="—"
                            className={cn(
                              'w-16 text-center text-xs rounded-md border px-1 py-1 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50',
                              val ? 'border-green-300 bg-green-50' : 'border-border bg-background',
                            )}
                          />
                        </td>
                      )
                    })}
                    <td className="px-2 py-2 text-center font-semibold text-xs text-primary">
                      {formatCurrency(total)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-0.5">
                        {!inactive ? (
                          <>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(tithe)}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-yellow-600" onClick={() => setSoftDeleteTarget(tithe)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="Restaurar" onClick={() => restore.mutate(tithe.id)}>
                              <RotateCcw className="w-3 h-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Excluir permanentemente" onClick={() => { setHardDeleteTarget(tithe); setHardDeleteConfirm('') }}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-primary/20 bg-primary/5 font-semibold">
                <td className="px-3 py-3 sticky left-0 bg-primary/5 text-xs" colSpan={2}>
                  Saldo ({filtered.length} de {showInactive ? inactiveCount : activeCount})
                </td>
                {MONTHS.map((m) => (
                  <td key={m.key} className="px-2 py-3 text-center text-xs text-primary">
                    {monthTotals[m.key] > 0 ? formatCurrency(monthTotals[m.key]) : '—'}
                  </td>
                ))}
                <td className="px-2 py-3 text-center text-sm text-primary">
                  {formatCurrency(grandTotal)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Dizimista' : 'Novo Dizimista'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Nome completo" error={errors.fullName?.message} required>
              <Input {...register('fullName')} placeholder="Nome completo" />
            </FormField>
            <FormField label="Telefone" error={errors.phone?.message}>
              <Input {...register('phone')} placeholder="(11) 99999-9999" />
            </FormField>
            <FormField label="Data de nascimento" error={errors.birthDate?.message}>
              <Input type="date" {...register('birthDate')} />
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createTithe.isPending || updateTithe.isPending}>
                {editing ? 'Salvar' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <TitheImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        churchId={matrizChurchId}
        defaultYear={year}
        createdBy={user?.uid}
      />

      <AlertDialog open={!!softDeleteTarget} onOpenChange={() => setSoftDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar dizimista?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{softDeleteTarget?.fullName}</strong> ficará inativo. Os dados e histórico de dízimos são preservados e podem ser restaurados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-yellow-600 hover:bg-yellow-700"
              onClick={() => { softDelete.mutate(softDeleteTarget!.id); setSoftDeleteTarget(null) }}
            >
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!hardDeleteTarget} onOpenChange={() => setHardDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>Esta ação <strong>não pode ser desfeita</strong>. Todos os dízimos de <strong>{hardDeleteTarget?.fullName}</strong> serão apagados.</p>
              <p>Digite o nome completo para confirmar:</p>
              <Input
                value={hardDeleteConfirm}
                onChange={(e) => setHardDeleteConfirm(e.target.value)}
                placeholder={hardDeleteTarget?.fullName}
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setHardDeleteConfirm('')}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={hardDeleteConfirm !== hardDeleteTarget?.fullName}
              onClick={async () => {
                if (!hardDeleteTarget || hardDeleteConfirm !== hardDeleteTarget.fullName) return
                await hardDelete.mutateAsync(hardDeleteTarget.id)
                setHardDeleteTarget(null)
                setHardDeleteConfirm('')
              }}
            >
              Excluir para sempre
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar TODOS os dizimistas?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Ação de <strong>teste</strong>: remove permanentemente <strong>{allTithes.length}</strong> registro(s)
                e todo o histórico de dízimos. Não há como desfazer.
              </p>
              <p>Digite <strong>APAGAR TODOS</strong> para confirmar:</p>
              <Input
                value={deleteAllConfirm}
                onChange={(e) => setDeleteAllConfirm(e.target.value)}
                placeholder="APAGAR TODOS"
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteAllConfirm('')}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteAllConfirm !== 'APAGAR TODOS' || hardDeleteAll.isPending}
              onClick={async () => {
                if (!matrizChurchId || deleteAllConfirm !== 'APAGAR TODOS') return
                await hardDeleteAll.mutateAsync({ churchId: matrizChurchId, year })
                setDeleteAllOpen(false)
                setDeleteAllConfirm('')
                setShowInactive(false)
              }}
            >
              {hardDeleteAll.isPending ? 'Apagando…' : 'Apagar todos permanentemente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
