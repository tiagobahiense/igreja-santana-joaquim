import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getChurches, createChurch, updateChurch, softDeleteChurch, hardDeleteChurch, restoreChurch } from '@/services/firebase/churches'
import { toast } from '@/hooks/use-toast'

export function useChurches(includeInactive = false) {
  return useQuery({
    queryKey: ['churches', { includeInactive }],
    queryFn: () => getChurches(includeInactive),
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateChurch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createChurch,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['churches'] })
      toast({ title: 'Igreja criada com sucesso!', variant: 'success' } as Parameters<typeof toast>[0])
    },
    onError: () => toast({ title: 'Erro ao criar igreja', variant: 'destructive' }),
  })
}

export function useUpdateChurch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateChurch>[1] }) =>
      updateChurch(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['churches'] })
      toast({ title: 'Igreja atualizada!', variant: 'success' } as Parameters<typeof toast>[0])
    },
    onError: () => toast({ title: 'Erro ao atualizar', variant: 'destructive' }),
  })
}

export function useSoftDeleteChurch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: softDeleteChurch,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['churches'] })
      toast({ title: 'Igreja desativada (soft delete)', variant: 'success' } as Parameters<typeof toast>[0])
    },
    onError: () => toast({ title: 'Erro ao desativar', variant: 'destructive' }),
  })
}

export function useHardDeleteChurch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: hardDeleteChurch,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['churches'] })
      toast({ title: 'Igreja e dados excluídos permanentemente', variant: 'destructive' })
    },
    onError: () => toast({ title: 'Erro na exclusão', variant: 'destructive' }),
  })
}

export function useRestoreChurch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: restoreChurch,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['churches'] })
      toast({ title: 'Igreja restaurada!', variant: 'success' } as Parameters<typeof toast>[0])
    },
  })
}
