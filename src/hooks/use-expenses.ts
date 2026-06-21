import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getExpenses, createExpense, updateExpense, deleteExpense, type ExpenseFilter } from '@/services/firebase/expenses'
import { toast } from '@/hooks/use-toast'

export function useExpenses(filter: ExpenseFilter) {
  return useQuery({
    queryKey: ['expenses', filter],
    queryFn: () => getExpenses(filter),
    enabled: !!filter.churchId,
    staleTime: 1000 * 60 * 3,
  })
}

export function useCreateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createExpense,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      qc.invalidateQueries({ queryKey: ['summaries'] })
      toast({ title: 'Despesa registrada!', variant: 'success' } as Parameters<typeof toast>[0])
    },
    onError: () => toast({ title: 'Erro ao registrar despesa', variant: 'destructive' }),
  })
}

export function useUpdateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateExpense>[1] }) =>
      updateExpense(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      toast({ title: 'Despesa atualizada!', variant: 'success' } as Parameters<typeof toast>[0])
    },
  })
}

export function useDeleteExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      toast({ title: 'Despesa removida', variant: 'success' } as Parameters<typeof toast>[0])
    },
  })
}
