import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getTithes,
  createTithe,
  updateTithe,
  transferTithe,
  getDonations,
  setDonation,
  getAllDonationsForYear,
  importTithesFromCsv,
  softDeleteTithe,
  restoreTithe,
  hardDeleteTithe,
} from '@/services/firebase/tithes'
import { toast } from '@/hooks/use-toast'
import type { MonthKey } from '@/lib/utils'

export function useTithes(churchId: string, includeInactive = false) {
  return useQuery({
    queryKey: ['tithes', churchId, { includeInactive }],
    queryFn: () => getTithes(churchId, includeInactive),
    enabled: !!churchId,
    staleTime: 1000 * 60 * 3,
  })
}

export function useDonations(tithesId: string, year: number) {
  return useQuery({
    queryKey: ['donations', tithesId, year],
    queryFn: () => getDonations(tithesId, year),
    enabled: !!tithesId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useAllDonationsForYear(churchId: string, year: number) {
  return useQuery({
    queryKey: ['all-donations', churchId, year],
    queryFn: () => getAllDonationsForYear(churchId, year),
    enabled: !!churchId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateTithe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createTithe,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tithes'] })
      toast({ title: 'Dizimista cadastrado!', variant: 'success' } as Parameters<typeof toast>[0])
    },
    onError: () => toast({ title: 'Erro ao cadastrar', variant: 'destructive' }),
  })
}

export function useUpdateTithe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateTithe>[1] }) =>
      updateTithe(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tithes'] })
      toast({ title: 'Dizimista atualizado!', variant: 'success' } as Parameters<typeof toast>[0])
    },
  })
}

export function useTransferTithe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, newChurchId, fromChurchId }: { id: string; newChurchId: string; fromChurchId: string }) =>
      transferTithe(id, newChurchId, fromChurchId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tithes'] })
      toast({ title: 'Dizimista transferido!', variant: 'success' } as Parameters<typeof toast>[0])
    },
  })
}

export function useSetDonation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      tithesId,
      churchId,
      year,
      month,
      valueInCents,
    }: {
      tithesId: string
      churchId: string
      year: number
      month: MonthKey
      valueInCents: number
    }) => setDonation(tithesId, churchId, year, month, valueInCents),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['donations', variables.tithesId] })
      qc.invalidateQueries({ queryKey: ['all-donations', variables.churchId] })
      qc.invalidateQueries({ queryKey: ['summaries'] })
    },
  })
}

export function useImportTithes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      churchId,
      year,
      rows,
      createdBy,
    }: {
      churchId: string
      year: number
      rows: Parameters<typeof importTithesFromCsv>[2]
      createdBy?: string
    }) => importTithesFromCsv(churchId, year, rows, createdBy),
    onSuccess: (result, variables) => {
      qc.invalidateQueries({ queryKey: ['tithes'] })
      qc.invalidateQueries({ queryKey: ['all-donations', variables.churchId] })
      qc.invalidateQueries({ queryKey: ['summaries'] })
      toast({
        title: 'Importação concluída!',
        description: `${result.created} criado(s), ${result.updated} atualizado(s).`,
        variant: 'success',
      } as Parameters<typeof toast>[0])
    },
    onError: (err: Error) => {
      toast({
        title: 'Erro na importação',
        description: err.message || 'Verifique o formato do CSV.',
        variant: 'destructive',
      })
    },
  })
}

export function useSoftDeleteTithe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: softDeleteTithe,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tithes'] })
      qc.invalidateQueries({ queryKey: ['all-donations'] })
      qc.invalidateQueries({ queryKey: ['summaries'] })
      toast({ title: 'Dizimista desativado', variant: 'success' } as Parameters<typeof toast>[0])
    },
    onError: () => toast({ title: 'Erro ao desativar', variant: 'destructive' }),
  })
}

export function useRestoreTithe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: restoreTithe,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tithes'] })
      toast({ title: 'Dizimista restaurado!', variant: 'success' } as Parameters<typeof toast>[0])
    },
  })
}

export function useHardDeleteTithe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: hardDeleteTithe,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tithes'] })
      qc.invalidateQueries({ queryKey: ['all-donations'] })
      qc.invalidateQueries({ queryKey: ['summaries'] })
      toast({ title: 'Dizimista excluído permanentemente', variant: 'success' } as Parameters<typeof toast>[0])
    },
    onError: () => toast({ title: 'Erro ao excluir', variant: 'destructive' }),
  })
}
