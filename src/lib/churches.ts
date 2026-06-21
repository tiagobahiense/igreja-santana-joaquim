import type { Church } from '@/types'

export function findMatrizChurch(churches: Church[]): Church | null {
  return (
    churches.find((c) => c.isMatriz === true)
    ?? churches.find((c) => /\(matriz\)/i.test(c.name))
    ?? null
  )
}
