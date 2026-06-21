import type { Church } from '@/types'

export const PARISH_LABEL = 'Quase-Paróquia'
export const PARISH_NAME = "Sant'Ana e São Joaquim"

export function isMatrizChurch(church: Church): boolean {
  return church.isMatriz === true || /\(matriz\)/i.test(church.name)
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
