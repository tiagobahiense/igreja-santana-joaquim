import { useQuery } from '@tanstack/react-query'
import { getSummariesForYear, getAllSummariesForYear } from '@/services/firebase/summaries'

export function useSummariesForYear(churchId: string, year: number) {
  return useQuery({
    queryKey: ['summaries', churchId, year],
    queryFn: () => getSummariesForYear(churchId, year),
    enabled: !!churchId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useAllSummariesForYear(year: number) {
  return useQuery({
    queryKey: ['summaries-all', year],
    queryFn: () => getAllSummariesForYear(year),
    staleTime: 1000 * 60 * 5,
  })
}
