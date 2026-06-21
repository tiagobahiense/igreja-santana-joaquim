import type { Church } from '@/types'

export const PARISH_LABEL = 'Quase-Paróquia'
export const PARISH_NAME = "Sant'Ana e São Joaquim"

function normalizeName(name: string): string {
  return name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

export function isMatrizChurch(church: Church): boolean {
  if (church.isMatriz === true) return true
  if (/\(matriz\)/i.test(church.name)) return true

  const n = normalizeName(church.name)
  if (n.includes('capela')) return false

  return (
    n.includes('quase-par')
    || n.includes('quase par')
    || (n.includes('sant') && n.includes('ana') && n.includes('joaquim'))
  )
}

export function findMatrizChurch(churches: Church[]): Church | null {
  return churches.find(isMatrizChurch) ?? null
}

export function getCapelaChurches(churches: Church[]): Church[] {
  return churches.filter((c) => !isMatrizChurch(c))
}

export function getMatrizChurchId(churches: Church[]): string | null {
  return findMatrizChurch(churches)?.id ?? null
}

export function getChurchesForComparison(churches: Church[]): Church[] {
  const matriz = findMatrizChurch(churches)
  const capelas = getCapelaChurches(churches)
  return matriz ? [matriz, ...capelas] : capelas
}

export function getMatrizDisplayName(church?: Church | null): string {
  return church && isMatrizChurch(church) ? PARISH_NAME : (church?.name ?? PARISH_NAME)
}
