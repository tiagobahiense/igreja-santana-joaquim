import { MONTHS, type MonthKey } from '@/lib/utils'
import type { DonationRecord, Tithe } from '@/types'

export type TitheSearchMode = 'all' | 'fullName' | 'firstName' | 'lastName' | 'identifier' | 'value'

export interface TitheFilterOptions {
  query: string
  searchMode: TitheSearchMode
  monthFilter: MonthKey | 'all'
  minTotalCents: number
}

export function getDonationTotalForRecord(record?: DonationRecord | null): number {
  if (!record) return 0
  return MONTHS.reduce((sum, m) => sum + (record[m.key] ?? 0), 0)
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

function nameParts(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  return {
    first: parts[0] ?? '',
    last: parts.length > 1 ? parts[parts.length - 1] : '',
    all: parts,
  }
}

export function filterTithes(
  tithes: Tithe[],
  donationsMap: Map<string, DonationRecord> | undefined,
  options: TitheFilterOptions,
): Tithe[] {
  const q = normalize(options.query)
  const minTotal = options.minTotalCents

  return tithes.filter((tithe) => {
    const record = donationsMap?.get(tithe.id)
    const total = getDonationTotalForRecord(record)

    if (minTotal > 0 && total < minTotal) return false

    if (options.monthFilter !== 'all') {
      const monthValue = record?.[options.monthFilter] ?? 0
      if (monthValue <= 0) return false
    }

    if (!q) return true

    const parts = nameParts(tithe.fullName)
    const normalizedName = normalize(tithe.fullName)

    switch (options.searchMode) {
      case 'fullName':
        return normalizedName.includes(q)
      case 'firstName':
        return normalize(parts.first).includes(q)
      case 'lastName':
        return normalize(parts.last).includes(q) || parts.all.some((p, i) => i > 0 && normalize(p).includes(q))
      case 'identifier':
        return (tithe.externalId ?? '').toLowerCase().includes(q)
      case 'value': {
        const numeric = parseFloat(q.replace(',', '.'))
        if (Number.isNaN(numeric)) return false
        const target = Math.round(numeric * 100)
        if (total === target) return true
        return MONTHS.some((m) => (record?.[m.key] ?? 0) === target)
      }
      case 'all':
      default:
        return (
          normalizedName.includes(q)
          || (tithe.externalId ?? '').toLowerCase().includes(q)
          || (tithe.phone ?? '').includes(q)
          || MONTHS.some((m) => formatCents(record?.[m.key]).includes(q))
          || formatCents(total).includes(q)
        )
    }
  })
}

function formatCents(cents?: number): string {
  if (!cents) return ''
  return (cents / 100).toFixed(2).replace('.', ',')
}

export function computeMonthTotals(
  tithes: Tithe[],
  donationsMap: Map<string, DonationRecord> | undefined,
): Record<MonthKey, number> {
  return MONTHS.reduce((acc, m) => {
    acc[m.key] = tithes.reduce((sum, t) => sum + (donationsMap?.get(t.id)?.[m.key] ?? 0), 0)
    return acc
  }, {} as Record<MonthKey, number>)
}

export function computeGrandTotal(
  tithes: Tithe[],
  donationsMap: Map<string, DonationRecord> | undefined,
): number {
  return tithes.reduce((sum, t) => sum + getDonationTotalForRecord(donationsMap?.get(t.id)), 0)
}
