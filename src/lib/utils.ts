import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, differenceInYears, isWithinInterval, addDays, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(valueInCents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valueInCents / 100)
}

export function parseCurrencyToInt(value: string): number {
  const cleaned = value.replace(/[^\d,]/g, '').replace(',', '.')
  return Math.round(parseFloat(cleaned) * 100) || 0
}

export function formatDate(date: Date | null | undefined): string {
  if (!date) return '—'
  return format(date, 'dd/MM/yyyy', { locale: ptBR })
}

export function formatMonthYear(date: Date): string {
  return format(date, 'MMMM yyyy', { locale: ptBR })
}

export function calculateAge(birthDate: Date): number {
  return differenceInYears(new Date(), birthDate)
}

export function isBirthdayInNextDays(birthDate: Date, days = 7): boolean {
  const today = startOfDay(new Date())
  const thisYearBirthday = new Date(
    today.getFullYear(),
    birthDate.getMonth(),
    birthDate.getDate(),
  )
  const nextYearBirthday = new Date(
    today.getFullYear() + 1,
    birthDate.getMonth(),
    birthDate.getDate(),
  )
  const target = thisYearBirthday < today ? nextYearBirthday : thisYearBirthday
  return isWithinInterval(target, { start: today, end: addDays(today, days) })
}

export const MONTHS = [
  { key: 'jan', label: 'Jan' },
  { key: 'feb', label: 'Fev' },
  { key: 'mar', label: 'Mar' },
  { key: 'apr', label: 'Abr' },
  { key: 'may', label: 'Mai' },
  { key: 'jun', label: 'Jun' },
  { key: 'jul', label: 'Jul' },
  { key: 'aug', label: 'Ago' },
  { key: 'sep', label: 'Set' },
  { key: 'oct', label: 'Out' },
  { key: 'nov', label: 'Nov' },
  { key: 'dec', label: 'Dez' },
] as const

export type MonthKey = (typeof MONTHS)[number]['key']

export function getMonthLabel(key: MonthKey): string {
  return MONTHS.find((m) => m.key === key)?.label ?? key
}

export function getDonationTotal(record: Record<string, unknown> | null | undefined): number {
  if (!record) return 0
  return MONTHS.reduce((sum, m) => sum + (Number(record[m.key]) || 0), 0)
}

export function getDonationMonthsCount(record: Record<string, unknown> | null | undefined): number {
  if (!record) return 0
  return MONTHS.filter((m) => (Number(record[m.key]) || 0) > 0).length
}

export function getLastDonationMonth(record: Record<string, unknown> | null | undefined): MonthKey | null {
  if (!record) return null
  for (let i = MONTHS.length - 1; i >= 0; i--) {
    if ((Number(record[MONTHS[i].key]) || 0) > 0) return MONTHS[i].key
  }
  return null
}

export function getCurrentMonthDonation(record: Record<string, unknown> | null | undefined): number {
  const key = MONTHS[new Date().getMonth()]?.key
  if (!key || !record) return 0
  return Number(record[key]) || 0
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('')
}

export const AVATAR_COLORS = [
  '#c9a227', '#8b1a1a', '#1a3a5c', '#2e7d32',
  '#6a1b9a', '#00695c', '#bf360c', '#0277bd',
]

export function getAvatarColor(name: string): string {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx] ?? '#c9a227'
}

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
}
