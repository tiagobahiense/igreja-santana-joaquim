import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createEvent, deleteEvent, getEvents, getUpcomingEvents, updateEvent } from '@/services/firebase/events'
import { toast } from '@/hooks/use-toast'

export function useEventsInRange(from: Date, to: Date) {
  return useQuery({
    queryKey: ['events', from.toISOString(), to.toISOString()],
    queryFn: () => getEvents(from, to),
    staleTime: 1000 * 60 * 2,
  })
}

export function useUpcomingEvents(days = 14) {
  return useQuery({
    queryKey: ['events-upcoming', days],
    queryFn: () => getUpcomingEvents(days),
    staleTime: 1000 * 60 * 2,
  })
}

export function useCreateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createEvent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] })
      qc.invalidateQueries({ queryKey: ['events-upcoming'] })
      toast({ title: 'Evento criado!', variant: 'success' } as Parameters<typeof toast>[0])
    },
    onError: () => toast({ title: 'Erro ao criar evento', variant: 'destructive' }),
  })
}

export function useUpdateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateEvent>[1] }) =>
      updateEvent(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] })
      qc.invalidateQueries({ queryKey: ['events-upcoming'] })
      toast({ title: 'Evento atualizado!', variant: 'success' } as Parameters<typeof toast>[0])
    },
  })
}

export function useDeleteEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] })
      qc.invalidateQueries({ queryKey: ['events-upcoming'] })
      toast({ title: 'Evento removido', variant: 'success' } as Parameters<typeof toast>[0])
    },
  })
}
