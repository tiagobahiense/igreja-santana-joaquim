import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { findMatrizChurch } from '@/lib/churches'
import { getChurches, createChurch, updateChurch, softDeleteChurch, hardDeleteChurch, restoreChurch } from '@/services/firebase/churches'
import { toast } from '@/hooks/use-toast'
import { addLog } from '@/services/firebase/logs'
import { useAuthStore } from '@/stores/auth.store'

export function useChurches(includeInactive = false) {
  return useQuery({
    queryKey: ['churches', { includeInactive }],
    queryFn: () => getChurches(includeInactive),
    staleTime: 1000 * 60 * 5,
  })
}

export function useActiveChurches() {
  const query = useChurches(true)
  return {
    ...query,
    data: (query.data ?? []).filter((c) => c.isActive !== false),
  }
}

export function useMatrizChurch() {
  const query = useActiveChurches()
  return {
    ...query,
    data: findMatrizChurch(query.data ?? []),
  }
}

function useLogBase() {
  const { user } = useAuthStore()
  return (action: Parameters<typeof addLog>[0]['action'], entityName?: string, entityId?: string, churchId?: string, details?: string) => {
    if (!user) return
    addLog({ userId: user.uid, userEmail: user.email, userDisplayName: user.displayName, action, entityType: 'church', entityId, entityName, churchId, details })
  }
}

export function useCreateChurch() {
  const qc = useQueryClient()
  const log = useLogBase()
  return useMutation({
    mutationFn: createChurch,
    onSuccess: (id, vars) => {
      qc.invalidateQueries({ queryKey: ['churches'] })
      log('create_church', vars.name, id)
      toast({ title: 'Igreja criada com sucesso!', variant: 'success' } as Parameters<typeof toast>[0])
    },
    onError: () => toast({ title: 'Erro ao criar igreja', variant: 'destructive' }),
  })
}

export function useUpdateChurch() {
  const qc = useQueryClient()
  const log = useLogBase()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateChurch>[1] }) =>
      updateChurch(id, data),
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ['churches'] })
      log('update_church', vars.data.name, vars.id)
      toast({ title: 'Igreja atualizada!', variant: 'success' } as Parameters<typeof toast>[0])
    },
    onError: () => toast({ title: 'Erro ao atualizar', variant: 'destructive' }),
  })
}

export function useSoftDeleteChurch() {
  const qc = useQueryClient()
  const log = useLogBase()
  return useMutation({
    mutationFn: softDeleteChurch,
    onSuccess: (_r, id) => {
      qc.invalidateQueries({ queryKey: ['churches'] })
      log('delete_church', undefined, id)
      toast({ title: 'Igreja desativada (soft delete)', variant: 'success' } as Parameters<typeof toast>[0])
    },
    onError: () => toast({ title: 'Erro ao desativar', variant: 'destructive' }),
  })
}

export function useHardDeleteChurch() {
  const qc = useQueryClient()
  const log = useLogBase()
  return useMutation({
    mutationFn: hardDeleteChurch,
    onSuccess: (_r, id) => {
      qc.invalidateQueries({ queryKey: ['churches'] })
      log('delete_church', undefined, id, undefined, 'hard delete permanente')
      toast({ title: 'Igreja e dados excluídos permanentemente', variant: 'destructive' })
    },
    onError: () => toast({ title: 'Erro na exclusão', variant: 'destructive' }),
  })
}

export function useRestoreChurch() {
  const qc = useQueryClient()
  const log = useLogBase()
  return useMutation({
    mutationFn: restoreChurch,
    onSuccess: (_r, id) => {
      qc.invalidateQueries({ queryKey: ['churches'] })
      log('restore_church', undefined, id)
      toast({ title: 'Igreja restaurada!', variant: 'success' } as Parameters<typeof toast>[0])
    },
  })
}
