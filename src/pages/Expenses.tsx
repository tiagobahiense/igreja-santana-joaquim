import { useState } from 'react'
import { Building2 } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Timestamp } from 'firebase/firestore'
import { useAuthStore } from '@/stores/auth.store'
import { useActiveChurches } from '@/hooks/use-churches'
import { useCreateExpense, useUpdateExpense, useDeleteExpense } from '@/hooks/use-expenses'
import { ChurchFinanceCard } from '@/components/ChurchFinanceCard'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { FormField } from '@/components/FormField'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { expenseSchema, type ExpenseFormData } from '@/schemas'
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  PAYMENT_METHODS,
  type Expense,
  type FinancialEntryType,
} from '@/types'
import { formatCurrency, parseCurrencyToInt } from '@/lib/utils'
import { Label } from '@/components/ui/label'

export function Expenses() {
  const { user } = useAuthStore()
  const { data: userChurches = [], isLoading: churchesLoading, isError: churchesError } = useActiveChurches()

  const createExpense = useCreateExpense()
  const updateExpense = useUpdateExpense()
  const deleteExpense = useDeleteExpense()

  const [formOpen, setFormOpen] = useState(false)
  const [formType, setFormType] = useState<FinancialEntryType>('expense')
  const [formChurchName, setFormChurchName] = useState('')
  const [editing, setEditing] = useState<Expense | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null)

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<ExpenseFormData>({ resolver: zodResolver(expenseSchema) })

  const isRecurring = watch('isRecurring')
  const currentType = watch('type') ?? formType
  const isIncome = currentType === 'income'
  const categories = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  function openCreate(churchId: string, type: FinancialEntryType) {
    const church = userChurches.find((c) => c.id === churchId)
    setEditing(null)
    setFormType(type)
    setFormChurchName(church?.name ?? '')
    reset({
      type,
      churchId,
      category: type === 'income' ? 'Doação' : 'Outros',
      paymentMethod: 'Dinheiro',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      isRecurring: false,
      subcategory: '',
      supplier: '',
      description: '',
      receiptReference: '',
      receiptLink: '',
    })
    setFormOpen(true)
  }

  function openEdit(expense: Expense) {
    const type = expense.type ?? 'expense'
    const church = userChurches.find((c) => c.id === expense.churchId)
    setEditing(expense)
    setFormType(type)
    setFormChurchName(church?.name ?? '')
    reset({
      type,
      churchId: expense.churchId,
      category: expense.category,
      subcategory: expense.subcategory ?? '',
      supplier: expense.supplier ?? '',
      paymentMethod: expense.paymentMethod,
      amount: (expense.amount / 100).toFixed(2),
      date: expense.date.toDate().toISOString().split('T')[0],
      description: expense.description ?? '',
      receiptReference: expense.receiptReference ?? '',
      receiptLink: expense.receiptLink ?? '',
      isRecurring: expense.isRecurring,
      recurrenceRule: expense.recurrenceRule,
    })
    setFormOpen(true)
  }

  async function onSubmit(data: ExpenseFormData) {
    const payload = {
      churchId: data.churchId,
      type: data.type,
      category: data.category as Expense['category'],
      subcategory: data.subcategory || undefined,
      supplier: data.supplier || undefined,
      paymentMethod: data.paymentMethod,
      amount: parseCurrencyToInt(data.amount),
      date: Timestamp.fromDate(new Date(data.date)),
      description: data.description || undefined,
      receiptReference: data.receiptReference || undefined,
      receiptLink: data.receiptLink || undefined,
      isRecurring: isIncome ? false : data.isRecurring,
      recurrenceRule: isIncome ? undefined : data.recurrenceRule,
      isActive: true,
    }
    if (editing) {
      await updateExpense.mutateAsync({ id: editing.id, data: payload })
    } else {
      await createExpense.mutateAsync({ ...payload, createdBy: user!.uid } as Parameters<typeof createExpense.mutateAsync>[0])
    }
    setFormOpen(false)
  }

  if (churchesLoading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando igrejas...</div>
  }

  if (churchesError) {
    return (
      <EmptyState
        icon={Building2}
        title="Erro ao carregar igrejas"
        description="Não foi possível buscar as igrejas. Recarregue a página ou tente novamente em instantes."
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro"
        description="Entradas e saídas por igreja — o Dashboard traz os agregados e comparativos"
      />

      {userChurches.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Nenhuma igreja cadastrada"
          description="Peça ao administrador para cadastrar igrejas na paróquia."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {userChurches.map((church) => (
            <ChurchFinanceCard
              key={church.id}
              church={church}
              onAdd={openCreate}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              {editing
                ? (isIncome ? 'Editar Entrada' : 'Editar Despesa')
                : (isIncome ? 'Nova Entrada' : 'Nova Despesa')}
              {formChurchName && (
                <Badge variant="outline" className="font-normal text-xs">{formChurchName}</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            <input type="hidden" {...register('churchId')} />
            <input type="hidden" {...register('type')} />

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Categoria" error={errors.category?.message} required>
                <Controller control={control} name="category" render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value} key={currentType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </FormField>
              <FormField label="Subcategoria" error={errors.subcategory?.message}>
                <Input {...register('subcategory')} placeholder="Opcional" />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Valor (R$)" error={errors.amount?.message} required>
                <Input {...register('amount')} placeholder="0,00" />
              </FormField>
              <FormField label="Data" error={errors.date?.message} required>
                <Input type="date" {...register('date')} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Forma de pagamento" error={errors.paymentMethod?.message} required>
                <Controller control={control} name="paymentMethod" render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PAYMENT_METHODS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </FormField>
              <FormField label={isIncome ? 'Origem' : 'Fornecedor'} error={errors.supplier?.message}>
                <Input {...register('supplier')} placeholder={isIncome ? 'Quem doou / pagou' : 'Opcional'} />
              </FormField>
            </div>
            <FormField label="Descrição" error={errors.description?.message}>
              <Input {...register('description')} placeholder="Descrição detalhada" />
            </FormField>
            <FormField label="Referência do comprovante" error={errors.receiptReference?.message}>
              <Input {...register('receiptReference')} placeholder="Ex: NF 1234 — pasta secretaria" />
            </FormField>
            <FormField label="Link do comprovante" error={errors.receiptLink?.message}>
              <Input {...register('receiptLink')} placeholder="https://..." />
            </FormField>
            {!isIncome && (
              <div className="flex items-center gap-3">
                <Controller control={control} name="isRecurring" render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} id="recurring" />
                )} />
                <Label htmlFor="recurring">Despesa recorrente</Label>
                {isRecurring && (
                  <Controller control={control} name="recurrenceRule" render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <SelectTrigger className="w-32"><SelectValue placeholder="Período" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Mensal</SelectItem>
                        <SelectItem value="yearly">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  )} />
                )}
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button
                type="submit"
                disabled={createExpense.isPending || updateExpense.isPending}
                className={isIncome ? 'bg-green-600 hover:bg-green-700 text-white' : 'gold-gradient text-white'}
              >
                {editing ? 'Salvar' : 'Registrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remover {(deleteTarget?.type ?? 'expense') === 'income' ? 'entrada' : 'despesa'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              O lançamento de <strong>{formatCurrency(deleteTarget?.amount ?? 0)}</strong> será removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => { deleteExpense.mutate(deleteTarget!.id); setDeleteTarget(null) }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
