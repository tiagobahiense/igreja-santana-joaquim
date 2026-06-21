import { useState } from 'react'
import { Plus, HandCoins, Search, Pencil } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuthStore } from '@/stores/auth.store'
import { useTithes, useCreateTithe, useUpdateTithe, useSetDonation, useAllDonationsForYear } from '@/hooks/use-tithes'
import { useMatrizChurch } from '@/hooks/use-churches'
import { PageHeader } from '@/components/PageHeader'
import { AuthorTag } from '@/components/AuthorTag'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/FormField'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { titheDonorSchema, type TitheDonorFormData } from '@/schemas'
import { MONTHS, formatCurrency, calculateAge, cn, type MonthKey } from '@/lib/utils'
import type { Tithe } from '@/types'
import { Timestamp } from 'firebase/firestore'
import { PARISH_NAME } from '@/lib/churches'

const CURRENT_YEAR = new Date().getFullYear()

export function Tithes() {
  const { user } = useAuthStore()
  const { data: matrizChurch, isLoading: matrizLoading } = useMatrizChurch()
  const matrizChurchId = matrizChurch?.id ?? ''

  const { data: tithes = [], isLoading: tithesLoading } = useTithes(matrizChurchId)
  const { data: allDonations } = useAllDonationsForYear(matrizChurchId, CURRENT_YEAR)
  const createTithe = useCreateTithe()
  const updateTithe = useUpdateTithe()
  const setDonation = useSetDonation()

  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Tithe | null>(null)
  const [year] = useState(CURRENT_YEAR)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TitheDonorFormData>({
    resolver: zodResolver(titheDonorSchema),
  })

  const filtered = tithes.filter((t) =>
    t.fullName.toLowerCase().includes(search.toLowerCase()),
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
        description={`Grade ${year} — ${PARISH_NAME}`}
        action={
          <Button onClick={openCreate} className="gap-2 gold-gradient text-white">
            <Plus className="w-4 h-4" />Novo Dizimista
          </Button>
        }
      />

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar dizimista..."
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={HandCoins} title="Nenhum dizimista encontrado" action={<Button onClick={openCreate}>Cadastrar dizimista</Button>} />
      ) : (
        <div className="overflow-x-auto rounded-xl glass-card">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide sticky left-0 bg-white/80 backdrop-blur-sm min-w-[180px]">
                  Dizimista
                </th>
                {MONTHS.map((m) => (
                  <th key={m.key} className="text-center px-2 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide min-w-[80px]">
                    {m.label}
                  </th>
                ))}
                <th className="text-center px-2 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide min-w-[90px]">Total</th>
                <th className="px-3 py-3 min-w-[40px]" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((tithe) => {
                const donations = allDonations?.get(tithe.id)
                const total = MONTHS.reduce((sum, m) => sum + (donations?.[m.key] ?? 0), 0)
                return (
                  <tr key={tithe.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2 sticky left-0 bg-white/80 backdrop-blur-sm">
                      <p className="font-medium truncate max-w-[160px]">{tithe.fullName}</p>
                      <div className="flex flex-wrap items-center gap-1 mt-0.5">
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
                            defaultValue={val ? (val / 100).toFixed(2) : ''}
                            onBlur={(e) => handleDonationChange(tithe.id, m.key, e.target.value)}
                            placeholder="—"
                            className={cn(
                              'w-16 text-center text-xs rounded-md border px-1 py-1 focus:outline-none focus:ring-1 focus:ring-primary',
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
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(tithe)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
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
    </div>
  )
}
