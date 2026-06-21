import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getExpenses, createExpense, updateExpense, deleteExpense, type ExpenseFilter } from '@/services/firebase/expenses'
import { updateSummary } from '@/services/firebase/summaries'
import { toast } from '@/hooks/use-toast'
import type { Timestamp } from 'firebase/firestore'

async function refreshSummary(churchId: string, date: Timestamp | Date) {
  const d = typeof (date as Timestamp).toDate === 'function' ? (date as Timestamp).toDate() : date as Date
  await updateSummary(churchId, d.getFullYear(), d.getMonth() + 1)
}

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
    onSuccess: async (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      qc.invalidateQueries({ queryKey: ['summaries'] })
      await refreshSummary(variables.churchId, variables.date)
      const isIncome = variables.type === 'income'
      toast({ title: isIncome ? 'Entrada registrada!' : 'Despesa registrada!', variant: 'success' } as Parameters<typeof toast>[0])
    },
    onError: (_err, variables) => {
      const isIncome = variables.type === 'income'
      toast({ title: isIncome ? 'Erro ao registrar entrada' : 'Erro ao registrar despesa', variant: 'destructive' })
    },
  })
}

export function useUpdateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateExpense>[1] }) =>
      updateExpense(id, data),
    onSuccess: async (_r, { data }) => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      qc.invalidateQueries({ queryKey: ['summaries'] })
      if (data.churchId && data.date) await refreshSummary(data.churchId, data.date)
      toast({ title: 'Lançamento atualizado!', variant: 'success' } as Parameters<typeof toast>[0])
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
