import { useState } from 'react'
import { Plus, Receipt as ReceiptIcon, Pencil, Trash2, ExternalLink, RefreshCw } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Timestamp } from 'firebase/firestore'
import { useAuthStore } from '@/stores/auth.store'
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense } from '@/hooks/use-expenses'
import { PageHeader } from '@/components/PageHeader'
import { AuthorTag } from '@/components/AuthorTag'
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
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, type Expense } from '@/types'
import { formatCurrency, formatDate, parseCurrencyToInt } from '@/lib/utils'
import { Label } from '@/components/ui/label'

export function Expenses() {
  const { user } = useAuthStore()
  const activeChurchId = user?.activeChurchId ?? user?.churchIds?.[0] ?? ''

  const { data: result, isLoading } = useExpenses({ churchId: activeChurchId })
  const createExpense = useCreateExpense()
  const updateExpense = useUpdateExpense()
  const deleteExpense = useDeleteExpense()

  const expenses = result?.expenses ?? []

  const [formOpen, setFormOpen] = useState(false)
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

  function openCreate() {
    setEditing(null)
    reset({
      churchId: activeChurchId,
      category: 'Outros',
      paymentMethod: 'Dinheiro',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      isRecurring: false,
    })
    setFormOpen(true)
  }

  function openEdit(expense: Expense) {
    setEditing(expense)
    reset({
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
      category: data.category,
      subcategory: data.subcategory || undefined,
      supplier: data.supplier || undefined,
      paymentMethod: data.paymentMethod,
      amount: parseCurrencyToInt(data.amount),
      date: Timestamp.fromDate(new Date(data.date)),
      description: data.description || undefined,
      receiptReference: data.receiptReference || undefined,
      receiptLink: data.receiptLink || undefined,
      isRecurring: data.isRecurring,
      recurrenceRule: data.recurrenceRule,
      isActive: true,
    }
    if (editing) {
      await updateExpense.mutateAsync({ id: editing.id, data: payload })
    } else {
      await createExpense.mutateAsync({ ...payload, createdBy: user!.uid } as Parameters<typeof createExpense.mutateAsync>[0])
    }
    setFormOpen(false)
  }

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>

  return (
    <div className="space-y-4">
      <PageHeader
        title="Despesas"
        description="Controle de gastos da paróquia"
        action={
          <Button onClick={openCreate} className="gap-2 gold-gradient text-white">
            <Plus className="w-4 h-4" />Nova Despesa
          </Button>
        }
      />

      {expenses.length === 0 ? (
        <EmptyState icon={ReceiptIcon} title="Nenhuma despesa registrada" action={<Button onClick={openCreate}>Registrar despesa</Button>} />
      ) : (
        <div className="grid gap-3">
          {expenses.map((expense) => (
            <div key={expense.id} className="glass-card rounded-xl p-4 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{expense.category}</span>
                  {expense.subcategory && <Badge variant="secondary" className="text-xs">{expense.subcategory}</Badge>}
                  {expense.isRecurring && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <RefreshCw className="w-2.5 h-2.5" />{expense.recurrenceRule === 'monthly' ? 'Mensal' : 'Anual'}
                    </Badge>
                  )}
                </div>
                {expense.description && <p className="text-xs text-muted-foreground truncate">{expense.description}</p>}
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <span className="text-lg font-bold text-primary">{formatCurrency(expense.amount)}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(expense.date.toDate())}</span>
                  <Badge variant="outline" className="text-xs">{expense.paymentMethod}</Badge>
                  <AuthorTag userId={expense.createdBy} />
                  {expense.receiptLink && (
                    <a href={expense.receiptLink} target="_blank" rel="noreferrer" className="text-xs text-blue-600 flex items-center gap-0.5 hover:underline">
                      <ExternalLink className="w-3 h-3" />Comprovante
                    </a>
                  )}
                  {expense.receiptReference && !expense.receiptLink && (
                    <span className="text-xs text-muted-foreground">Ref: {expense.receiptReference}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => openEdit(expense)}><Pencil className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget(expense)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Categoria" error={errors.category?.message} required>
                <Controller control={control} name="category" render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
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
              <FormField label="Fornecedor" error={errors.supplier?.message}>
                <Input {...register('supplier')} placeholder="Opcional" />
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createExpense.isPending || updateExpense.isPending}>
                {editing ? 'Salvar' : 'Registrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover despesa?</AlertDialogTitle>
            <AlertDialogDescription>A despesa de <strong>{formatCurrency(deleteTarget?.amount ?? 0)}</strong> será removida.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => { deleteExpense.mutate(deleteTarget!.id); setDeleteTarget(null) }}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
