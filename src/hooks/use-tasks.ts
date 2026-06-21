import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTasks, createTask, updateTask, deleteTask, toggleTask, getDailyPanelTasks } from '@/services/firebase/tasks'
import { toast } from '@/hooks/use-toast'

export function useTasks(userId: string) {
  return useQuery({
    queryKey: ['tasks', userId],
    queryFn: () => getTasks(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  })
}

export function useDailyTasks(userId: string) {
  return useQuery({
    queryKey: ['tasks-daily', userId],
    queryFn: () => getDailyPanelTasks(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      toast({ title: 'Tarefa criada!', variant: 'success' } as Parameters<typeof toast>[0])
    },
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateTask>[1] }) =>
      updateTask(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      toast({ title: 'Tarefa removida', variant: 'success' } as Parameters<typeof toast>[0])
    },
  })
}

export function useToggleTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) => toggleTask(id, completed),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}
